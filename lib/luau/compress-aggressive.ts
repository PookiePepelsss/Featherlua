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
import { hoistRepeatedGlobalAccess } from "./hoist-repeated-access";
import { hoistRepeatedStrings } from "./hoist-repeated-strings";
import { mergeAdjacentLocals } from "./merge-adjacent-locals";
import { mergeAdjacentAssigns } from "./merge-adjacent-assigns";

export type CompressResult =
  | { ok: true; output: string }
  | { ok: false; error: { message: string; line: number; col: number } };

// Independently toggleable; disabling one never makes another unsafe, only
// less effective (e.g. no foldConstants means propagateConstants has
// nothing to re-fold between rounds).
export interface AggressiveOptions {
  /** Rename locals to short, scope-reuse-aware names. */
  rename: boolean;
  /** Fold literal arithmetic/logical/comparison/concat expressions and
   * eliminate literal-true/false branches. */
  foldConstants: boolean;
  /** Substitute never-reassigned locals' values into their use sites. */
  propagateConstants: boolean;
  /** Remove locals (and local functions) referenced nowhere, when the
   * initializer can't possibly have a side effect or throw. */
  removeUnusedLocals: boolean;
  /** Merge adjacent single-name `local` declarations into one statement
   * (`local a=1 local b=2` -> `local a,b=1,2`). */
  mergeAdjacentLocals: boolean;
  /** Merge adjacent single-target plain-identifier assignments into one
   * statement (`a=1 b=2` -> `a,b=1,2`). */
  mergeAdjacentAssigns: boolean;
  /** Hoist a string literal repeated 3+ times in one function's scope
   * into a single local. Unconditionally safe -- strings have no
   * observable identity or metatable in Lua. */
  hoistRepeatedStrings: boolean;
  /** Drop type annotations, generics, and `type`/`export type` aliases
   * (zero runtime effect in Luau -- erased at compile time). */
  stripTypes: boolean;
  /** EXPERIMENTAL, off by default: hoist a `global.field.field...` chain
   * read multiple times in a loop into a local computed once before it.
   * Unlike every other option here, this rests on an assumption that
   * can't be verified from source -- that the accessed tables have no
   * custom `__index` metamethod with a side effect. See
   * hoist-repeated-access.ts for the full safety scoping. */
  hoistRepeatedAccess: boolean;
}

export const DEFAULT_AGGRESSIVE_OPTIONS: AggressiveOptions = {
  rename: true,
  foldConstants: true,
  propagateConstants: true,
  removeUnusedLocals: true,
  stripTypes: true,
  hoistRepeatedAccess: false,
  mergeAdjacentLocals: true,
  mergeAdjacentAssigns: true,
  hoistRepeatedStrings: true,
};

function parseError(message: string, line = 0, col = 0): CompressResult {
  return { ok: false, error: { message, line, col } };
}

// Single source of truth for the AST transforms Aggressive mode applies
// before printing -- exported so tests build their comparison baseline
// from this instead of a hand-copied pipeline that can drift out of sync.
export function transformForAggressive(chunk: Chunk, options: AggressiveOptions = DEFAULT_AGGRESSIVE_OPTIONS): ResolvedProgram {
  // Both need no symbol info, so they run before resolution. Folding first,
  // so hoisting sees an already-simplified tree (e.g. a dead branch that
  // would have contained a disqualifying call is gone before hoisting
  // looks for candidates).
  if (options.foldConstants) optimize(chunk);
  if (options.hoistRepeatedAccess) hoistRepeatedGlobalAccess(chunk);
  if (options.hoistRepeatedStrings) hoistRepeatedStrings(chunk);
  const resolved = resolveScopes(chunk);
  // Looped: propagation and unused-local removal feed each other (removing
  // an unused `local b = a` can make `a` itself newly unused), and folding
  // a propagated value can expose a new dead branch (`local DEBUG = false;
  // if DEBUG then` only folds once DEBUG's value lands in the condition).
  // Bounded as a guard against unforeseen non-termination; converges in a
  // handful of rounds in practice.
  if (options.propagateConstants || options.removeUnusedLocals) {
    for (let i = 0; i < 20; i += 1) {
      let changed = false;
      if (options.propagateConstants) changed = propagateConstants(resolved) || changed;
      if (options.removeUnusedLocals) changed = removeUnusedLocals(resolved) || changed;
      if (!changed) break;
      if (options.foldConstants) optimize(resolved.chunk);
    }
  }
  // Runs once, after unused-local removal has settled -- a deletion can
  // newly place two locals adjacent to each other.
  if (options.mergeAdjacentLocals) mergeAdjacentLocals(resolved);
  if (options.mergeAdjacentAssigns) mergeAdjacentAssigns(resolved);
  // Luau types are erased at compile time, so stripping them can't change
  // behavior -- only removes info for static analysis on the output.
  if (options.stripTypes) stripTypeInfo(resolved.chunk);
  return resolved;
}

// Re-parses and structurally re-verifies the output before returning it,
// refusing to ship anything that fails -- a zero-dependency backstop
// against a printer/renamer bug (see regressions.test.ts for real ones it
// would have caught).
export function compressAggressive(source: string, options: Partial<AggressiveOptions> = {}): CompressResult {
  const opts: AggressiveOptions = { ...DEFAULT_AGGRESSIVE_OPTIONS, ...options };
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
