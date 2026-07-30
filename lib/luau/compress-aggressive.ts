import { ParseError } from "./errors";
import { parse } from "./parser";
import { print } from "./printer";
import { resolveScopes } from "./scope-resolver";
import { computeRenameMap } from "./renamer";
import { structurallyEqual } from "./alpha-equivalence";

export type CompressResult =
  | { ok: true; output: string }
  | { ok: false; error: { message: string; line: number; col: number } };

function parseError(message: string, line = 0, col = 0): CompressResult {
  return { ok: false, error: { message, line, col } };
}

// lex -> parse -> resolve scopes -> compute safe local-rename map -> print
// -> self-validate. The self-validation step re-parses the printed code and
// checks it's alpha-equivalent to what we started with: it can't catch
// every possible bug (a shared blind spot between the parser and printer
// slips through), but it's a zero-dependency last line of defense that
// would have caught real bugs found in this codebase (see
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
  const resolved = resolveScopes(chunk);
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
