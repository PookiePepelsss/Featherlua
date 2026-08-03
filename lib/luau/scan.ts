// Forked from Safe mode's scanning primitives in compress-safe.ts.
// Deliberately duplicated (not shared) so Aggressive-mode development can
// never regress Safe mode, and because these variants report -1 on
// unterminated literals so the parser can raise a real error, where Safe
// mode instead runs to EOF and stays lossless on malformed input.

export const WHITESPACE_RE = /\s/;
export const DIGIT_RE = /\d/;
export const IDENT_START_RE = /[A-Za-z_-￿]/;
export const IDENT_CONTINUE_RE = /[A-Za-z0-9_-￿]/;
export const NEWLINE_RE = /[\r\n]/;
export const LICENSE_RE = /@license|@preserve|copyright|spdx/i;

export const compoundSymbols = [
  "...", "..=", "//=", "==", "~=", "<=", ">=", "+=", "-=", "*=", "/=",
  "%=", "^=", "::", "->", "//", "..",
];
export const compoundSymbolSet = new Set(compoundSymbols);
export const compoundSymbolsByFirstChar = new Map<string, string[]>();
for (const symbol of compoundSymbols) {
  const key = symbol[0];
  const list = compoundSymbolsByFirstChar.get(key);
  if (list) list.push(symbol);
  else compoundSymbolsByFirstChar.set(key, [symbol]);
}

export function longBracket(source: string, start: number) {
  if (source[start] !== "[") return null;
  let cursor = start + 1;
  while (source[cursor] === "=") cursor += 1;
  if (source[cursor] !== "[") return null;
  return { level: cursor - start - 1, body: cursor + 1 };
}

// Returns -1 if the closing bracket is never found (unterminated long
// string/comment) so callers can report it as a parse error instead of
// silently treating the rest of the source as the string's body.
export function scanLongBracket(source: string, body: number, level: number) {
  const closer = `]${"=".repeat(level)}]`;
  const end = source.indexOf(closer, body);
  return end === -1 ? -1 : end + closer.length;
}

// Returns -1 if the closing quote is never found (unterminated string).
export function scanQuoted(source: string, start: number, quote: string) {
  let cursor = start + 1;
  while (cursor < source.length) {
    if (source[cursor] === "\\") cursor += 2;
    else if (source[cursor] === quote) return cursor + 1;
    else cursor += 1;
  }
  return -1;
}

// Returns -1 if an exponent marker (e/E/p/P) is present with no digits
// following it (e.g. "1e", "0x1p+"), an incomplete literal that isn't a
// valid Lua/Luau number.
export function scanNumber(source: string, start: number) {
  let cursor = start;
  let invalid = false;
  const takeDigits = (pattern: RegExp) => {
    let sawDigit = false;
    while (cursor < source.length && (pattern.test(source[cursor]) || source[cursor] === "_")) {
      if (pattern.test(source[cursor])) sawDigit = true;
      cursor += 1;
    }
    return sawDigit;
  };
  const takeExponent = (lower: string, upper: string) => {
    if (source[cursor] !== lower && source[cursor] !== upper) return;
    cursor += 1;
    if (source[cursor] === "+" || source[cursor] === "-") cursor += 1;
    if (!takeDigits(/[0-9]/)) invalid = true;
  };

  if (source[cursor] === ".") {
    cursor += 1;
    takeDigits(/[0-9]/);
    takeExponent("e", "E");
    return invalid ? -1 : cursor;
  }
  if (source[cursor] === "0" && (source[cursor + 1] === "x" || source[cursor + 1] === "X")) {
    cursor += 2;
    takeDigits(/[0-9a-fA-F]/);
    if (source[cursor] === "." && source[cursor + 1] !== ".") {
      cursor += 1;
      takeDigits(/[0-9a-fA-F]/);
    }
    takeExponent("p", "P");
    return invalid ? -1 : cursor;
  }
  if (source[cursor] === "0" && (source[cursor + 1] === "b" || source[cursor + 1] === "B")) {
    cursor += 2;
    takeDigits(/[01]/);
    return cursor;
  }
  takeDigits(/[0-9]/);
  if (source[cursor] === "." && source[cursor + 1] !== ".") {
    cursor += 1;
    takeDigits(/[0-9]/);
  }
  takeExponent("e", "E");
  return invalid ? -1 : cursor;
}

// Finds the end of a long comment/line comment starting at `cursor` (which
// must point at the first `-` of `--`). Does not classify or collect it.
// Returns -1 if a long comment is unterminated (line comments can never be
// unterminated -- EOF always ends them).
export function scanComment(source: string, cursor: number) {
  const bracket = longBracket(source, cursor + 2);
  if (bracket) return scanLongBracket(source, bracket.body, bracket.level);
  const lineEnd = source.slice(cursor).search(NEWLINE_RE);
  return lineEnd === -1 ? source.length : cursor + lineEnd;
}
