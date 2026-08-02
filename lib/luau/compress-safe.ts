import type { LuaDialect } from "./dialects";

const compoundSymbols = [
  "...", "..=", "//=", "<<=", ">>=", "==", "~=", "<=", ">=", "+=", "-=", "*=", "/=",
  "%=", "^=", "::", "->", "//", "<<", ">>", "..", "&=", "|=",
];
const compoundSymbolSet = new Set(compoundSymbols);
const compoundSymbolsByFirstChar = new Map<string, string[]>();
for (const symbol of compoundSymbols) {
  const key = symbol[0];
  const list = compoundSymbolsByFirstChar.get(key);
  if (list) list.push(symbol);
  else compoundSymbolsByFirstChar.set(key, [symbol]);
}

const whitespace = /\s/;
const digit = /\d/;
const identifierStart = /[A-Za-z_\u0080-\uFFFF]/;
const identifierContinue = /[A-Za-z0-9_\u0080-\uFFFF]/;
const newline = /[\r\n]/;
const protectedComment = /@license|@preserve|copyright|spdx/i;

function longBracket(source: string, start: number) {
  if (source[start] !== "[") return null;
  let cursor = start + 1;
  while (source[cursor] === "=") cursor += 1;
  if (source[cursor] !== "[") return null;
  return { level: cursor - start - 1, body: cursor + 1 };
}

function scanLongBracket(source: string, body: number, level: number) {
  const closer = `]${"=".repeat(level)}]`;
  const end = source.indexOf(closer, body);
  return end === -1 ? source.length : end + closer.length;
}

function scanQuoted(source: string, start: number, quote: string) {
  let cursor = start + 1;
  while (cursor < source.length) {
    if (source[cursor] === "\\") cursor += 2;
    else if (source[cursor] === quote) return cursor + 1;
    else cursor += 1;
  }
  return source.length;
}

function scanNumber(source: string, start: number, dialect: LuaDialect) {
  let cursor = start;
  const takeDigits = (pattern: RegExp) => {
    while (cursor < source.length && (pattern.test(source[cursor]) || source[cursor] === "_")) cursor += 1;
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
  } else if (source[cursor] === "0" && /[xX]/.test(source[cursor + 1] ?? "")) {
    cursor += 2;
    takeDigits(/[0-9a-fA-F]/);
    if (source[cursor] === "." && source[cursor + 1] !== ".") {
      cursor += 1;
      takeDigits(/[0-9a-fA-F]/);
    }
    takeExponent("p", "P");
  } else if (source[cursor] === "0" && /[bB]/.test(source[cursor + 1] ?? "")) {
    cursor += 2;
    takeDigits(/[01]/);
  } else {
    takeDigits(/[0-9]/);
    if (source[cursor] === "." && source[cursor + 1] !== ".") {
      cursor += 1;
      takeDigits(/[0-9]/);
    }
    takeExponent("e", "E");
  }

  if (dialect === "luajit") {
    const suffix = /^(?:ULL|LL|ull|ll)/.exec(source.slice(cursor));
    if (suffix) cursor += suffix[0].length;
  }
  return cursor;
}

function scanInterpolated(source: string, start: number): number {
  let cursor = start + 1;
  while (cursor < source.length) {
    const char = source[cursor];
    if (char === "\\") cursor += 2;
    else if (char === "`") return cursor + 1;
    else if (char === "{") cursor = scanInterpolationExpression(source, cursor + 1);
    else cursor += 1;
  }
  return source.length;
}

function scanInterpolationExpression(source: string, start: number) {
  let cursor = start;
  let depth = 1;
  while (cursor < source.length) {
    if (source.startsWith("--", cursor)) {
      const bracket = longBracket(source, cursor + 2);
      if (bracket) cursor = scanLongBracket(source, bracket.body, bracket.level);
      else {
        const lineEnd = source.slice(cursor).search(newline);
        cursor = lineEnd === -1 ? source.length : cursor + lineEnd;
      }
      continue;
    }
    const char = source[cursor];
    if (char === "'" || char === '"') cursor = scanQuoted(source, cursor, char);
    else if (char === "`") cursor = scanInterpolated(source, cursor);
    else if (char === "[") {
      const bracket = longBracket(source, cursor);
      cursor = bracket ? scanLongBracket(source, bracket.body, bracket.level) : cursor + 1;
    } else if (char === "{") {
      depth += 1;
      cursor += 1;
    } else if (char === "}") {
      depth -= 1;
      cursor += 1;
      if (depth === 0) return cursor;
    } else cursor += 1;
  }
  return source.length;
}

interface SafeToken {
  text: string;
  // Only true for a scanned NUMBER token. The digit-before-dot guard below
  // exists to keep a real number like `1` from merging with a following
  // `.5` into what would misread as `1.5` -- it must never fire just
  // because an IDENTIFIER happens to end in a digit (Vector3, Color3,
  // UDim2, ...), which is never ambiguous the same way.
  isNumber: boolean;
}

function needsSpace(left: SafeToken, right: SafeToken) {
  const leftEnd = left.text.at(-1) ?? "";
  const rightStart = right.text[0] ?? "";
  if (identifierContinue.test(leftEnd) && identifierContinue.test(rightStart)) return true;
  if (left.isNumber && digit.test(leftEnd) && rightStart === ".") return true;
  if (leftEnd === "." && digit.test(rightStart)) return true;
  if (leftEnd === "-" && rightStart === "-") return true;
  if (leftEnd === "[" && (rightStart === "[" || rightStart === "=")) return true;
  return compoundSymbolSet.has(left.text + right.text);
}

function scanSafe(source: string, dialect: LuaDialect) {
  const tokens: SafeToken[] = [];
  const protectedComments: string[] = [];
  let cursor = 0;

  if (source.startsWith("#!")) {
    const end = source.search(newline);
    protectedComments.push(source.slice(0, end === -1 ? source.length : end));
    cursor = end === -1 ? source.length : end;
  }

  while (cursor < source.length) {
    const char = source[cursor];
    if (whitespace.test(char)) {
      cursor += 1;
      continue;
    }
    if (source.startsWith("--", cursor)) {
      const start = cursor;
      const bracket = longBracket(source, cursor + 2);
      if (bracket) cursor = scanLongBracket(source, bracket.body, bracket.level);
      else {
        const lineEnd = source.slice(cursor).search(newline);
        cursor = lineEnd === -1 ? source.length : cursor + lineEnd;
      }
      const comment = source.slice(start, cursor);
      if (comment.startsWith("--!") || protectedComment.test(comment)) protectedComments.push(comment);
      continue;
    }

    const start = cursor;
    let isNumberToken = false;
    if (char === "'" || char === '"') cursor = scanQuoted(source, cursor, char);
    else if (char === "`") cursor = scanInterpolated(source, cursor);
    else if (char === "[") {
      const bracket = longBracket(source, cursor);
      cursor = bracket ? scanLongBracket(source, bracket.body, bracket.level) : cursor + 1;
    } else if (digit.test(char) || (char === "." && digit.test(source[cursor + 1] ?? ""))) {
      cursor = scanNumber(source, cursor, dialect);
      isNumberToken = true;
    } else if (identifierStart.test(char)) {
      cursor += 1;
      while (cursor < source.length && identifierContinue.test(source[cursor])) cursor += 1;
    } else {
      const candidates = compoundSymbolsByFirstChar.get(char);
      const matched = candidates?.find((candidate) => source.startsWith(candidate, cursor));
      cursor += matched?.length ?? 1;
    }

    const text = source.slice(start, cursor);
    tokens.push({ text, isNumber: isNumberToken });
  }

  return { tokens, protectedComments };
}

function renderSafe(tokens: SafeToken[], protectedComments: string[]) {
  const outputParts: string[] = [];
  let previousToken: SafeToken | undefined;
  for (const token of tokens) {
    if (previousToken && needsSpace(previousToken, token)) outputParts.push(" ");
    outputParts.push(token.text);
    previousToken = token;
  }

  const body = outputParts.join("").trim();
  return protectedComments.length ? `${protectedComments.join("\n")}\n${body}`.trim() : body;
}

export function compressSafe(source: string, dialect: LuaDialect = "luau") {
  const scanned = scanSafe(source, dialect);
  return renderSafe(scanned.tokens, scanned.protectedComments);
}

export function verifySafeCompression(source: string, output: string, dialect: LuaDialect = "luau") {
  const input = scanSafe(source, dialect);
  const compressed = scanSafe(output, dialect);

  if (input.protectedComments.length !== compressed.protectedComments.length) {
    return { success: false as const, error: "a protected comment was changed or removed" };
  }
  for (let index = 0; index < input.protectedComments.length; index += 1) {
    if (input.protectedComments[index] !== compressed.protectedComments[index]) {
      return { success: false as const, error: "a protected comment was changed or removed" };
    }
  }
  if (input.tokens.length !== compressed.tokens.length) {
    return { success: false as const, error: "the output token count differs from the input" };
  }
  for (let index = 0; index < input.tokens.length; index += 1) {
    if (input.tokens[index].text !== compressed.tokens[index].text) {
      return { success: false as const, error: `token ${index + 1} differs from the input` };
    }
  }
  if (compressSafe(output, dialect) !== output) {
    return { success: false as const, error: "the output is not stable after recompression" };
  }
  return { success: true as const };
}
