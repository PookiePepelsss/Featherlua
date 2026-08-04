import { ParseError } from "./errors";
import { parse } from "./parser";
import { print } from "./printer";
import { resolveScopes } from "./scope-resolver";
import type { ResolvedProgram } from "./scope-resolver";
import type { Chunk } from "./ast";
import { computeRenameMap } from "./renamer";
import { structurallyEqual } from "./alpha-equivalence";
import { collectTypeSpanNames, stripTypeInfo } from "./strip-types";
import { optimize } from "./optimize";
import { propagateConstants } from "./constant-propagate";
import { removeUnusedLocals } from "./remove-unused-locals";
import { hoistRepeatedStrings, resetStringHoistCounter } from "./hoist-repeated-strings";
import { mergeAdjacentLocals } from "./merge-adjacent-locals";
import { mergeAdjacentAssigns } from "./merge-adjacent-assigns";
import { aliasGlobals } from "./alias-globals";
import { detectReflectionUsage, type ReflectionRisk } from "./reflection-risks";

export type CompressResult =
  | {
      ok: true;
      output: string;
      warning?: string;
      rolledBack?: string[];
      appliedOptions?: AggressiveOptions;
      /** Bytes that enabling "Alias repeated globals" would additionally
       * save, when it is off and would in fact help. */
      aliasGlobalsSaving?: number;
    }
  | { ok: false; error: { message: string; line: number; col: number } };

export interface AggressiveOptions {
  rename: boolean;
  foldConstants: boolean;
  propagateConstants: boolean;
  removeUnusedLocals: boolean;
  mergeAdjacentLocals: boolean;
  mergeAdjacentAssigns: boolean;
  hoistRepeatedStrings: boolean;
  stripTypes: boolean;
  aliasGlobals: boolean;
}

export const DEFAULT_AGGRESSIVE_OPTIONS: AggressiveOptions = {
  rename: true,
  foldConstants: true,
  propagateConstants: true,
  removeUnusedLocals: true,
  stripTypes: true,
  mergeAdjacentLocals: true,
  mergeAdjacentAssigns: true,
  hoistRepeatedStrings: true,
  // Opt-in: an alias freezes the global's value at chunk start, which is
  // wrong for any script whose globals are swapped or hooked later.
  aliasGlobals: false,
};

function parseError(message: string, line = 0, col = 0): CompressResult {
  return { ok: false, error: { message, line, col } };
}

// Annotations are reprinted verbatim, so when they survive, the locals they
// name have to survive under those names too. With stripTypes on there is
// nothing left to point at anything, so nothing is pinned.
export function pinnedTypeNames(chunk: Chunk, options: AggressiveOptions): Set<string> | undefined {
  return options.stripTypes ? undefined : collectTypeSpanNames(chunk);
}

export function transformForAggressive(
  chunk: Chunk,
  options: AggressiveOptions = DEFAULT_AGGRESSIVE_OPTIONS,
  pinnedNames = pinnedTypeNames(chunk, options),
): ResolvedProgram {
  if (options.stripTypes) stripTypeInfo(chunk);
  if (options.foldConstants) optimize(chunk);
  if (options.hoistRepeatedStrings) hoistRepeatedStrings(chunk, options.rename);
  const resolved = resolveScopes(chunk);
  if (options.propagateConstants || options.removeUnusedLocals) {
    for (let i = 0; i < 20; i += 1) {
      let changed = false;
      if (options.propagateConstants) changed = propagateConstants(resolved, options.rename, pinnedNames) || changed;
      if (options.removeUnusedLocals) changed = removeUnusedLocals(resolved, pinnedNames) || changed;
      if (!changed) break;
      if (options.foldConstants) optimize(resolved.chunk);
    }
  }
  if (options.aliasGlobals) aliasGlobals(resolved, options.rename);
  if (options.mergeAdjacentLocals) mergeAdjacentLocals(resolved);
  if (options.mergeAdjacentAssigns) mergeAdjacentAssigns(resolved);
  // The scope tree above still lists locals the passes since deleted, and
  // the renamer allocates a short name per entry, so dead symbols would
  // burn `a`, `b`, ... and push real ones onto longer names. Re-resolving
  // gives the renamer only what survived.
  return resolveScopes(resolved.chunk);
}

const OPTION_LABELS: Partial<Record<keyof AggressiveOptions, string>> = {
  rename: "Rename locals",
  foldConstants: "Fold constants",
  propagateConstants: "Propagate constants",
  removeUnusedLocals: "Remove unused locals",
  mergeAdjacentLocals: "Merge adjacent locals",
  mergeAdjacentAssigns: "Merge adjacent assigns",
  hoistRepeatedStrings: "Dedupe repeated strings",
  aliasGlobals: "Alias repeated globals",
};

const RISK_OPTIONS: Record<Exclude<ReflectionRisk, "bytecode">, readonly (keyof AggressiveOptions)[]> = {
  bindings: [
    "rename",
    "foldConstants",
    "propagateConstants",
    "removeUnusedLocals",
    "mergeAdjacentLocals",
    "hoistRepeatedStrings",
    "aliasGlobals",
  ],
  constants: [
    "foldConstants",
    "propagateConstants",
    "removeUnusedLocals",
    "hoistRepeatedStrings",
  ],
  prototypes: ["foldConstants", "propagateConstants", "removeUnusedLocals"],
  stack: [
    "foldConstants",
    "propagateConstants",
    "removeUnusedLocals",
    "mergeAdjacentLocals",
    "mergeAdjacentAssigns",
    "hoistRepeatedStrings",
  ],
  metadata: [
    "rename",
    "foldConstants",
    "propagateConstants",
    "removeUnusedLocals",
    "mergeAdjacentLocals",
    "mergeAdjacentAssigns",
    "hoistRepeatedStrings",
  ],
  broad: Object.keys(OPTION_LABELS) as (keyof AggressiveOptions)[],
};

function reflectionWarning(chunk: Chunk, options: AggressiveOptions): string | undefined {
  const { risks, apis } = detectReflectionUsage(chunk);
  if (!risks.size) return undefined;
  const detected = ` Detected: ${[...apis].sort().join(", ")}.`;
  if (risks.has("bytecode")) {
    return `This script inspects compiled bytecode.${detected} Any minification can change bytecode or hashes; test the output in your executor.`;
  }

  const relevant = new Set<keyof AggressiveOptions>();
  for (const risk of risks) {
    if (risk === "bytecode") continue;
    for (const key of RISK_OPTIONS[risk]) relevant.add(key);
  }
  const labels = [...relevant]
    .filter((key) => options[key])
    .map((key) => OPTION_LABELS[key])
    .filter((label): label is string => Boolean(label));
  if (!labels.length) {
    return risks.has("metadata")
      ? `Output formatting can change function names or line information reported by debug APIs.${detected} Test the output in your executor.`
      : undefined;
  }

  const metadataNote = risks.has("metadata") ? " Output formatting may also change reported line information." : "";
  return `This script uses reflection/executor APIs.${detected} These selected options may change what they observe: ` +
    `${labels.join(", ")}. The options remain enabled; test the output in your executor.${metadataNote}`;
}

function compressAggressiveCore(source: string, opts: AggressiveOptions): CompressResult {
  resetStringHoistCounter();
  let parsed;
  try {
    parsed = parse(source);
  } catch (error) {
    if (error instanceof ParseError) return parseError(error.message, error.line, error.col);
    throw error;
  }

  const { chunk, protectedComments } = parsed;
  const pinnedNames = pinnedTypeNames(chunk, opts);
  const resolved = transformForAggressive(chunk, opts, pinnedNames);
  const renameMap = opts.rename ? computeRenameMap(resolved, pinnedNames) : undefined;
  const printed = print(chunk, renameMap);

  let reverified;
  try {
    reverified = parse(printed);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return parseError(`Internal error: compressed output failed to re-parse (${detail}). Please report this.`);
  }
  const reresolved = resolveScopes(reverified.chunk);
  const equivalence = structurallyEqual(resolved.chunk, reresolved.chunk);
  if (!equivalence.equal) {
    return parseError(
      `Internal error: compressed output was not equivalent to the input (${equivalence.reason}). Please report this.`,
    );
  }

  let output = printed;
  if (protectedComments.length) output = `${protectedComments.join("\n")}\n${output}`;
  return { ok: true, output };
}

const OPTION_KEYS = Object.keys(DEFAULT_AGGRESSIVE_OPTIONS) as (keyof AggressiveOptions)[];

function byteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

export function compressAggressive(source: string, options: Partial<AggressiveOptions> = {}): CompressResult {
  let active: AggressiveOptions = { ...DEFAULT_AGGRESSIVE_OPTIONS, ...options };
  let best = compressAggressiveCore(source, active);
  if (!best.ok) return best;

  const rolledBack = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const key of OPTION_KEYS) {
      if (!active[key]) continue;
      const candidateOptions = { ...active, [key]: false };
      const candidate = compressAggressiveCore(source, candidateOptions);
      if (candidate.ok && byteLength(candidate.output) < byteLength(best.output)) {
        best = candidate;
        active = candidateOptions;
        rolledBack.add(OPTION_LABELS[key] ?? key);
        changed = true;
      }
    }
  }

  let warning: string | undefined;
  try {
    warning = reflectionWarning(parse(source).chunk, active);
  } catch {
    return best;
  }
  return {
    ok: true,
    output: best.output,
    warning,
    rolledBack: [...rolledBack],
    appliedOptions: active,
    aliasGlobalsSaving: aliasGlobalsSaving(source, active, best.output),
  };
}

// Global aliasing stays off by default because an alias freezes the value a
// global held when the chunk started, and the target here is executor
// scripts, where another script hooking a shared global at runtime is
// ordinary. That is a call for whoever is shipping the script, not one to
// make silently for 3% -- but it is also the single largest remaining
// saving, so measuring it is the difference between an informed choice and
// an invisible option. Returns undefined when it is already on, when the
// pass declines the script, or when it would not actually help.
function aliasGlobalsSaving(source: string, active: AggressiveOptions, output: string): number | undefined {
  if (active.aliasGlobals) return undefined;
  const aliased = compressAggressiveCore(source, { ...active, aliasGlobals: true });
  if (!aliased.ok) return undefined;
  const saving = byteLength(output) - byteLength(aliased.output);
  return saving > 0 ? saving : undefined;
}
