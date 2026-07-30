// Forked from app/page.tsx's Safe-mode tokenizer scanning primitives.
// Deliberately duplicated (not shared) so Aggressive-mode development can
// never regress Safe mode. Keep in sync manually if Safe mode's scanning
// edge cases change.

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

export function scanLongBracket(source: string, body: number, level: number) {
  const closer = `]${"=".repeat(level)}]`;
  const end = source.indexOf(closer, body);
  return end === -1 ? source.length : end + closer.length;
}

export function scanQuoted(source: string, start: number, quote: string) {
  let cursor = start + 1;
  while (cursor < source.length) {
    if (source[cursor] === "\\") cursor += 2;
    else if (source[cursor] === quote) return cursor + 1;
    else cursor += 1;
  }
  return source.length;
}

export function scanNumber(source: string, start: number) {
  let cursor = start;
  const takeDigits = (pattern: RegExp) => {
    while (cursor < source.length && (pattern.test(source[cursor]) || source[cursor] === "_")) {
      cursor += 1;
    }
  };
  const takeExponent = (lower: string, upper: string) => {
    if (source[cursor] !== lower && source[cursor] !== upper) return;
    cursor += 1;
    if (source[cursor] === "+" || source[cursor] === "-") cursor += 1;
    takeDigits(/[0-9]/);
  };

  if (source[cursor] === ".") {
    cursor += 1;
    takeDigits(/[0-9]/);
    takeExponent("e", "E");
    return cursor;
  }
  if (source[cursor] === "0" && (source[cursor + 1] === "x" || source[cursor + 1] === "X")) {
    cursor += 2;
    takeDigits(/[0-9a-fA-F]/);
    if (source[cursor] === "." && source[cursor + 1] !== ".") {
      cursor += 1;
      takeDigits(/[0-9a-fA-F]/);
    }
    takeExponent("p", "P");
    return cursor;
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
  return cursor;
}

// Finds the end of a long comment/line comment starting at `cursor` (which
// must point at the first `-` of `--`). Does not classify or collect it.
export function scanComment(source: string, cursor: number) {
  const bracket = longBracket(source, cursor + 2);
  if (bracket) return scanLongBracket(source, bracket.body, bracket.level);
  const lineEnd = source.slice(cursor).search(NEWLINE_RE);
  return lineEnd === -1 ? source.length : cursor + lineEnd;
}
