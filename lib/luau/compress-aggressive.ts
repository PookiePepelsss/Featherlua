import { ParseError } from "./errors";
import { parse } from "./parser";
import { print } from "./printer";
import { resolveScopes } from "./scope-resolver";
import { computeRenameMap } from "./renamer";

export type CompressResult =
  | { ok: true; output: string }
  | { ok: false; error: { message: string; line: number; col: number } };

// lex -> parse -> resolve scopes -> compute safe local-rename map -> print.
export function compressAggressive(source: string): CompressResult {
  let parsed;
  try {
    parsed = parse(source);
  } catch (error) {
    if (error instanceof ParseError) {
      return { ok: false, error: { message: error.message, line: error.line, col: error.col } };
    }
    throw error;
  }

  const { chunk, protectedComments } = parsed;
  const resolved = resolveScopes(chunk);
  const renameMap = computeRenameMap(resolved);
  let output = print(chunk, renameMap);
  if (protectedComments.length) output = `${protectedComments.join("\n")}\n${output}`;
  return { ok: true, output };
}
