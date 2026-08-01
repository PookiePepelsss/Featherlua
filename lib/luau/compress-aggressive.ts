import { ParseError } from "./errors";
import { parse } from "./parser";
import { print } from "./printer";
import { resolveScopes } from "./scope-resolver";
import type { ResolvedProgram } from "./scope-resolver";
import type { Chunk } from "./ast";
import { computeRenameMap } from "./renamer";
import { structurallyEqual } from "./alpha-equivalence";
import { stripTypeInfo } from "./strip-types";
import { optimize } from "./optimize";
import { propagateConstants } from "./constant-propagate";
import { removeUnusedLocals } from "./remove-unused-locals";
import { hoistRepeatedStrings, resetStringHoistCounter } from "./hoist-repeated-strings";
import { mergeAdjacentLocals } from "./merge-adjacent-locals";
import { mergeAdjacentAssigns } from "./merge-adjacent-assigns";
import { detectReflectionUsage, type ReflectionRisk } from "./reflection-risks";

export type CompressResult =
  | { ok: true; output: string; warning?: string; rolledBack?: string[]; appliedOptions?: AggressiveOptions }
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
};

function parseError(message: string, line = 0, col = 0): CompressResult {
  return { ok: false, error: { message, line, col } };
}

export function transformForAggressive(chunk: Chunk, options: AggressiveOptions = DEFAULT_AGGRESSIVE_OPTIONS): ResolvedProgram {
  if (options.foldConstants) optimize(chunk);
  if (options.hoistRepeatedStrings) hoistRepeatedStrings(chunk);
  const resolved = resolveScopes(chunk);
  if (options.propagateConstants || options.removeUnusedLocals) {
    for (let i = 0; i < 20; i += 1) {
      let changed = false;
      if (options.propagateConstants) changed = propagateConstants(resolved, options.rename) || changed;
      if (options.removeUnusedLocals) changed = removeUnusedLocals(resolved) || changed;
      if (!changed) break;
      if (options.foldConstants) optimize(resolved.chunk);
    }
  }
  if (options.mergeAdjacentLocals) mergeAdjacentLocals(resolved);
  if (options.mergeAdjacentAssigns) mergeAdjacentAssigns(resolved);
  if (options.stripTypes) stripTypeInfo(resolved.chunk);
  return resolved;
}

const OPTION_LABELS: Partial<Record<keyof AggressiveOptions, string>> = {
  rename: "Rename locals",
  foldConstants: "Fold constants",
  propagateConstants: "Propagate constants",
  removeUnusedLocals: "Remove unused locals",
  mergeAdjacentLocals: "Merge adjacent locals",
  mergeAdjacentAssigns: "Merge adjacent assigns",
  hoistRepeatedStrings: "Dedupe repeated strings",
};

const RISK_OPTIONS: Record<Exclude<ReflectionRisk, "bytecode">, readonly (keyof AggressiveOptions)[]> = {
  bindings: [
    "rename",
    "foldConstants",
    "propagateConstants",
    "removeUnusedLocals",
    "mergeAdjacentLocals",
    "hoistRepeatedStrings",
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
  const resolved = transformForAggressive(chunk, opts);
  const renameMap = opts.rename ? computeRenameMap(resolved) : undefined;
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
  };
}
