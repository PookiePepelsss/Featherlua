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
  /** Drop type annotations, generics, and `type`/`export type` aliases
   * (zero runtime effect in Luau -- erased at compile time). */
  stripTypes: boolean;
}

export const DEFAULT_AGGRESSIVE_OPTIONS: AggressiveOptions = {
  rename: true,
  foldConstants: true,
  propagateConstants: true,
  removeUnusedLocals: true,
  stripTypes: true,
};

function parseError(message: string, line = 0, col = 0): CompressResult {
  return { ok: false, error: { message, line, col } };
}

// Single source of truth for the AST transforms Aggressive mode applies
// before printing -- exported so tests build their comparison baseline
// from this instead of a hand-copied pipeline that can drift out of sync.
export function transformForAggressive(chunk: Chunk, options: AggressiveOptions = DEFAULT_AGGRESSIVE_OPTIONS): ResolvedProgram {
  // Needs no symbol info, so it can run before resolution.
  if (options.foldConstants) optimize(chunk);
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
