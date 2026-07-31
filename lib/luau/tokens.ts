export type TokenKind =
  | "Eof"
  | "Name"
  | "Number"
  | "String"
  | "LongString"
  | "InterpStringSegment"
  | "Keyword"
  | "Symbol";

export interface Token {
  kind: TokenKind;
  /** Raw source text: verbatim for Number/String/LongString/InterpStringSegment (quotes/brackets included, never decoded). */
  text: string;
  /** InterpStringSegment only: true if this segment starts the interpolated string (right after the opening backtick). */
  isFirst?: boolean;
  /** InterpStringSegment only: true if this segment ends the interpolated string (right before the closing backtick). */
  isLast?: boolean;
  start: number;
  end: number;
  line: number;
  col: number;
}

// Standard Lua reserved words plus Luau's `goto`. `continue`, `type`, and
// `export` are intentionally NOT here -- Luau treats them as contextual
// (soft) keywords, valid as plain identifiers everywhere except the
// specific statement positions the parser recognizes them in.
export const KEYWORDS = new Set([
  "and", "break", "do", "else", "elseif", "end", "false", "for", "function",
  "goto", "if", "in", "local", "nil", "not", "or", "repeat", "return",
  "then", "true", "until", "while",
]);
