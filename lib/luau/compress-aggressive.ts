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

// Medium leaves the locals alone: none renamed, invented or deleted, so
// anything reading one by name still finds it. What it does change is the
// part no runtime can see, such as types, constant arithmetic and branches
// that cannot run.
export const MEDIUM_AGGRESSIVE_OPTIONS: AggressiveOptions = {
  rename: false,
  foldConstants: true,
  propagateConstants: false,
  removeUnusedLocals: false,
  stripTypes: true,
  mergeAdjacentLocals: true,
  mergeAdjacentAssigns: true,
  hoistRepeatedStrings: false,
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

// Trying each pass switched off means compressing the whole script again
// per option, and on a large script that is seconds of work for a fraction
// of a percent: across a corpus of real scripts the search cost eighteen
// times the single pass and saved 0.23%. Timing the first pass says how
// expensive a search would be here, so small scripts still get the full
// one and large scripts are not held up for a rounding error.
const ROLLBACK_SEARCH_BUDGET_MS = 750;

// The parser, the passes, the printer and the equivalence check all walk
// the tree by recursion, so a script nested past a few thousand levels
// exhausts the JS stack. Obfuscators produce exactly that: a concatenation
// of ten thousand pieces is a right spine ten thousand deep. What surfaced
// was the engine's own wording, which reads as a crash. Safe mode is a
// loop over tokens and has no depth limit at all, so there is somewhere
// useful to send people.
function isStackExhaustion(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  return /call stack size exceeded|too much recursion|stack overflow/i.test(message);
}

const TOO_DEEP =
  "This script nests too deeply to parse: an expression or block runs thousands of levels down, " +
  "which is usually an obfuscator's doing. Safe mode has no depth limit and will still compress it.";

export function compressAggressive(source: string, options: Partial<AggressiveOptions> = {}): CompressResult {
  try {
    return compressAggressiveSearching(source, options);
  } catch (error) {
    if (isStackExhaustion(error)) return parseError(TOO_DEEP);
    throw error;
  }
}

function compressAggressiveSearching(source: string, options: Partial<AggressiveOptions>): CompressResult {
  let active: AggressiveOptions = { ...DEFAULT_AGGRESSIVE_OPTIONS, ...options };
  const startedFirstPass = Date.now();
  let best = compressAggressiveCore(source, active);
  if (!best.ok) return best;
  const firstPassMs = Date.now() - startedFirstPass;

  const rolledBack = new Set<string>();
  const enabledCount = OPTION_KEYS.filter((key) => active[key]).length;
  let changed = firstPassMs * enabledCount <= ROLLBACK_SEARCH_BUDGET_MS;
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


