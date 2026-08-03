// Luau-only lossless tokenizer. Every symbol here is one Luau lexes as a
// single token; Lua 5.x/LuaJIT-only forms (<<, >>, &=, |=, hex floats,
// LL/ULL suffixes) are deliberately absent because Luau has no bitwise
// operators and no integer suffixes.
const compoundSymbols = [
  "...", "..=", "//=", "==", "~=", "<=", ">=", "+=", "-=", "*=", "/=",
  "%=", "^=", "::", "->", "//", "..",
];
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

function scanNumber(source: string, start: number) {
  let cursor = start;
  const takeDigits = (pattern: RegExp) => {
    while (cursor < source.length && (pattern.test(source[cursor]) || source[cursor] === "_")) cursor += 1;
  };

  if (source[cursor] === "0" && /[xX]/.test(source[cursor + 1] ?? "")) {
    cursor += 2;
    takeDigits(/[0-9a-fA-F]/);
    return cursor;
  }
  if (source[cursor] === "0" && /[bB]/.test(source[cursor + 1] ?? "")) {
    cursor += 2;
    takeDigits(/[01]/);
    return cursor;
  }

  if (source[cursor] === ".") cursor += 1;
  takeDigits(/[0-9]/);
  // `1..2` is concatenation, not a fractional part, so a dot only opens the
  // fraction when it is not the start of `..`.
  if (source[cursor] === "." && source[cursor + 1] !== ".") {
    cursor += 1;
    takeDigits(/[0-9]/);
  }
  if (source[cursor] === "e" || source[cursor] === "E") {
    cursor += 1;
    if (source[cursor] === "+" || source[cursor] === "-") cursor += 1;
    takeDigits(/[0-9]/);
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

// End offset of the single token starting at `cursor`. Shared by the
// tokenizer and by needsSpace, so both agree on where a token stops.
function scanTokenEnd(source: string, cursor: number) {
  const char = source[cursor];
  if (char === "'" || char === '"') return scanQuoted(source, cursor, char);
  if (char === "`") return scanInterpolated(source, cursor);
  if (char === "[") {
    const bracket = longBracket(source, cursor);
    return bracket ? scanLongBracket(source, bracket.body, bracket.level) : cursor + 1;
  }
  if (digit.test(char) || (char === "." && digit.test(source[cursor + 1] ?? ""))) {
    return scanNumber(source, cursor);
  }
  if (identifierStart.test(char)) {
    let end = cursor + 1;
    while (end < source.length && identifierContinue.test(source[end])) end += 1;
    return end;
  }
  const candidates = compoundSymbolsByFirstChar.get(char);
  const matched = candidates?.find((candidate) => source.startsWith(candidate, cursor));
  return cursor + (matched?.length ?? 1);
}

// A hand-maintained rule list can only cover the merges someone thought of,
// and it missed several (`+` then `==` re-lexes to `+=` `=`; `..` then `..`
// becomes `...` `.`). Instead, join the two tokens and re-scan: if the first
// token of the joined text is not exactly `left`, the pair needs separating.
// Comment and long-bracket openers are checked first because those are not
// tokens at all, so re-scanning cannot see them.
function needsSpace(left: string, right: string) {
  const leftEnd = left.at(-1) ?? "";
  const rightStart = right[0] ?? "";
  if (leftEnd === "-" && rightStart === "-") return true;
  if (leftEnd === "[" && (rightStart === "[" || rightStart === "=")) return true;
  // Word characters stay apart even where this scanner would split them
  // correctly: Luau reads a number and the identifier touching it as one
  // malformed literal, so `1` before `and` has to keep its space.
  if (identifierContinue.test(leftEnd) && identifierContinue.test(rightStart)) return true;

  return scanTokenEnd(left + right, 0) !== left.length;
}

function scanSafe(source: string) {
  const tokens: string[] = [];
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
    cursor = scanTokenEnd(source, cursor);
    tokens.push(source.slice(start, cursor));
  }

  return { tokens, protectedComments };
}

function renderSafe(tokens: string[], protectedComments: string[]) {
  const outputParts: string[] = [];
  let previousToken: string | undefined;
  for (const token of tokens) {
    if (previousToken !== undefined && needsSpace(previousToken, token)) outputParts.push(" ");
    outputParts.push(token);
    previousToken = token;
  }

  const body = outputParts.join("").trim();
  return protectedComments.length ? `${protectedComments.join("\n")}\n${body}`.trim() : body;
}

export function compressSafe(source: string) {
  const scanned = scanSafe(source);
  return renderSafe(scanned.tokens, scanned.protectedComments);
}

export function verifySafeCompression(source: string, output: string) {
  const input = scanSafe(source);
  const compressed = scanSafe(output);

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
    if (input.tokens[index] !== compressed.tokens[index]) {
      return { success: false as const, error: `token ${index + 1} differs from the input` };
    }
  }
  if (compressSafe(output) !== output) {
    return { success: false as const, error: "the output is not stable after recompression" };
  }
  return { success: true as const };
}
