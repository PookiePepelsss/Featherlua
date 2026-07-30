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

// Every pass is independently toggleable and defaults to on (today's
// behavior). Turning a pass off never changes what a LOWER pass does --
// e.g. disabling `foldConstants` just means propagateConstants won't have
// newly-exposed literals/dead branches to re-fold between its iterations,
// not that propagation itself becomes unsafe.
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

// Every AST-simplifying transform Aggressive mode can apply, up to but not
// including renaming/printing. Exported (not just used internally) so
// tests can build an equivalent "expected" baseline by calling this exact
// function instead of hand-reimplementing the pipeline -- two copies of
// this ordering have already silently drifted out of sync twice in this
// codebase's history when a new transform was added to one but not the
// other. There must be exactly one source of truth for "what Aggressive
// mode does to an AST before printing".
export function transformForAggressive(chunk: Chunk, options: AggressiveOptions = DEFAULT_AGGRESSIVE_OPTIONS): ResolvedProgram {
  // Fold literal arithmetic and eliminate literal-true/false branches
  // before scope resolution -- both are pure AST simplifications that need
  // no symbol information, and running them first means the (possibly
  // smaller) simplified tree is what gets resolved/renamed/printed.
  if (options.foldConstants) optimize(chunk);
  const resolved = resolveScopes(chunk);
  // Propagate locals that are provably never reassigned (proven by
  // scanning every assignment target in the program, not by trusting a
  // `<const>` attribute) into their use sites, and drop locals referenced
  // nowhere at all (a separate concern from propagation -- see
  // remove-unused-locals.ts), re-running optimize() between rounds -- this
  // is what makes dead-branch elimination fire on real code, e.g. `local
  // DEBUG = false; if DEBUG then ... end` only becomes foldable once
  // DEBUG's value is propagated into the condition. Looped together
  // because they can feed each other (`local a=5; local b=a` -- removing
  // b as unused only makes a's reference count drop to zero on the NEXT
  // round). Bounded rather than a bare `while(true)` as a defensive guard
  // against any unforeseen non-termination; in practice this converges in
  // a handful of rounds, since each round strictly shrinks what's left.
  if (options.propagateConstants || options.removeUnusedLocals) {
    for (let i = 0; i < 20; i += 1) {
      let changed = false;
      if (options.propagateConstants) changed = propagateConstants(resolved) || changed;
      if (options.removeUnusedLocals) changed = removeUnusedLocals(resolved) || changed;
      if (!changed) break;
      if (options.foldConstants) optimize(resolved.chunk);
    }
  }
  // Luau types are erased at compile time -- dropping them can never change
  // runtime behavior, only how much survives for static analysis/IDE
  // tooling on the *output*. Stripped before printing (not just skipped by
  // the printer) so self-validation below compares apples to apples: the
  // reparsed output naturally has no type spans either.
  if (options.stripTypes) stripTypeInfo(resolved.chunk);
  return resolved;
}

// lex -> parse -> transformForAggressive -> compute safe local-rename map
// -> print -> self-validate. The self-validation step re-parses the
// printed code and checks it's alpha-equivalent to what we started with:
// it can't catch every possible bug (a shared blind spot between the
// parser and printer slips through), but it's a zero-dependency last line
// of defense that would have caught real bugs found in this codebase (see
// regressions.test.ts) before they ever reached a user. On any failure
// here we refuse to return the (broken) output rather than shipping it.
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
