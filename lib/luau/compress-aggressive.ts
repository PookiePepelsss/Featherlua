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

export type CompressResult =
  | { ok: true; output: string }
  | { ok: false; error: { message: string; line: number; col: number } };

function parseError(message: string, line = 0, col = 0): CompressResult {
  return { ok: false, error: { message, line, col } };
}

// Every AST-simplifying transform Aggressive mode applies, up to but not
// including renaming/printing. Exported (not just used internally) so
// tests can build an equivalent "expected" baseline by calling this exact
// function instead of hand-reimplementing the pipeline -- two copies of
// this ordering have already silently drifted out of sync twice in this
// codebase's history when a new transform was added to one but not the
// other. There must be exactly one source of truth for "what Aggressive
// mode does to an AST before printing".
export function transformForAggressive(chunk: Chunk): ResolvedProgram {
  // Fold literal arithmetic and eliminate literal-true/false branches
  // before scope resolution -- both are pure AST simplifications that need
  // no symbol information, and running them first means the (possibly
  // smaller) simplified tree is what gets resolved/renamed/printed.
  optimize(chunk);
  const resolved = resolveScopes(chunk);
  // Propagate locals that are provably never reassigned (proven by
  // scanning every assignment target in the program, not by trusting a
  // `<const>` attribute) into their use sites, then re-run optimize() --
  // this is what makes dead-branch elimination fire on real code, e.g.
  // `local DEBUG = false; if DEBUG then ... end` only becomes foldable
  // once DEBUG's value is substituted into the condition. Bounded rather
  // than a bare `while(true)` as a defensive guard against any unforeseen
  // non-termination; in practice this converges in 1-3 rounds, since each
  // round strictly shrinks the remaining candidate pool.
  for (let i = 0; i < 20; i += 1) {
    const changed = propagateConstants(resolved);
    if (!changed) break;
    optimize(resolved.chunk);
  }
  // Luau types are erased at compile time -- dropping them can never change
  // runtime behavior, only how much survives for static analysis/IDE
  // tooling on the *output*. Stripped before printing (not just skipped by
  // the printer) so self-validation below compares apples to apples: the
  // reparsed output naturally has no type spans either.
  stripTypeInfo(resolved.chunk);
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
export function compressAggressive(source: string): CompressResult {
  let parsed;
  try {
    parsed = parse(source);
  } catch (error) {
    if (error instanceof ParseError) return parseError(error.message, error.line, error.col);
    throw error;
  }

  const { chunk, protectedComments } = parsed;
  const resolved = transformForAggressive(chunk);
  const renameMap = computeRenameMap(resolved);
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
