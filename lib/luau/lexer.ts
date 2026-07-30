import { ParseError } from "./errors";
import {
  DIGIT_RE, IDENT_START_RE, IDENT_CONTINUE_RE, LICENSE_RE, NEWLINE_RE, WHITESPACE_RE,
  compoundSymbolsByFirstChar, longBracket, scanComment, scanLongBracket, scanNumber, scanQuoted,
} from "./scan";
import { KEYWORDS, type Token } from "./tokens";

export interface LexResult {
  tokens: Token[];
  protectedComments: string[];
}

function buildNewlineOffsets(source: string): number[] {
  const offsets: number[] = [];
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] === "\n") offsets.push(i);
  }
  return offsets;
}

// Binary search for the 1-based line/col of `index`, given sorted newline offsets.
function lineColAt(newlineOffsets: number[], index: number): { line: number; col: number } {
  let lo = 0;
  let hi = newlineOffsets.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (newlineOffsets[mid] < index) lo = mid + 1;
    else hi = mid;
  }
  const line = lo + 1;
  const lineStart = lo === 0 ? 0 : newlineOffsets[lo - 1] + 1;
  return { line, col: index - lineStart + 1 };
}

export function tokenize(source: string): LexResult {
  const newlineOffsets = buildNewlineOffsets(source);
  const tokens: Token[] = [];
  const protectedComments: string[] = [];
  let cursor = 0;

  function emit(kind: Token["kind"], text: string, start: number, end: number, extra?: Partial<Token>) {
    const { line, col } = lineColAt(newlineOffsets, start);
    tokens.push({ kind, text, start, end, line, col, ...extra });
  }

  function fail(message: string, at: number): never {
    const { line, col } = lineColAt(newlineOffsets, at);
    throw new ParseError(message, line, col, at);
  }

  // Consumes an interpolated string starting at the opening backtick.
  // Emits InterpStringSegment tokens interleaved with the real token stream
  // for each `{expr}`, recursing through lexOne for nested content so
  // nested backtick strings / long strings / comments inside an
  // interpolation expression are handled correctly.
  function lexInterpolatedString(start: number) {
    cursor = start + 1;
    let segStart = cursor;
    let isFirst = true;

    for (;;) {
      if (cursor >= source.length) {
        fail("Unterminated interpolated string", start);
      }
      const char = source[cursor];
      if (char === "\\") {
        cursor += 2;
        continue;
      }
      if (char === "`") {
        emit("InterpStringSegment", source.slice(segStart, cursor), segStart, cursor, { isFirst, isLast: true });
        cursor += 1;
        return;
      }
      if (char === "{") {
        emit("InterpStringSegment", source.slice(segStart, cursor), segStart, cursor, { isFirst, isLast: false });
        cursor += 1;
        let depth = 1;
        while (depth > 0) {
          if (cursor >= source.length) fail("Unterminated interpolated expression", cursor);
          lexOne();
          const last = tokens[tokens.length - 1];
          if (last.kind === "Symbol" && last.text === "{") depth += 1;
          else if (last.kind === "Symbol" && last.text === "}") {
            depth -= 1;
            if (depth === 0) tokens.pop();
          }
        }
        isFirst = false;
        segStart = cursor;
        continue;
      }
      cursor += 1;
    }
  }

  // Consumes and emits exactly one meaningful token (skipping any leading
  // whitespace/comments first), except for interpolated strings, which may
  // emit several tokens. Advances `cursor` past what it consumes.
  function lexOne() {
    while (cursor < source.length) {
      const char = source[cursor];
      if (WHITESPACE_RE.test(char)) {
        cursor += 1;
        continue;
      }
      if (source.startsWith("--", cursor)) {
        const start = cursor;
        const end = scanComment(source, cursor);
        if (end === -1) fail("Unterminated long comment", start);
        cursor = end;
        const comment = source.slice(start, cursor);
        if (comment.startsWith("--!") || LICENSE_RE.test(comment)) protectedComments.push(comment);
        continue;
      }
      break;
    }
    if (cursor >= source.length) return;

    const char = source[cursor];
    const start = cursor;

    if (char === "'" || char === '"') {
      const end = scanQuoted(source, cursor, char);
      if (end === -1) fail("Unterminated string", start);
      cursor = end;
      emit("String", source.slice(start, cursor), start, cursor);
      return;
    }
    if (char === "`") {
      lexInterpolatedString(start);
      return;
    }
    if (char === "[") {
      const bracket = longBracket(source, cursor);
      if (bracket) {
        const end = scanLongBracket(source, bracket.body, bracket.level);
        if (end === -1) fail("Unterminated long string", start);
        cursor = end;
        emit("LongString", source.slice(start, cursor), start, cursor);
        return;
      }
      cursor += 1;
      emit("Symbol", "[", start, cursor);
      return;
    }
    if (DIGIT_RE.test(char) || (char === "." && DIGIT_RE.test(source[cursor + 1] ?? ""))) {
      const end = scanNumber(source, cursor);
      if (end === -1) fail("Malformed number (missing exponent digits)", start);
      cursor = end;
      emit("Number", source.slice(start, cursor), start, cursor);
      return;
    }
    if (IDENT_START_RE.test(char)) {
      cursor += 1;
      while (cursor < source.length && IDENT_CONTINUE_RE.test(source[cursor])) cursor += 1;
      const text = source.slice(start, cursor);
      emit(KEYWORDS.has(text) ? "Keyword" : "Name", text, start, cursor);
      return;
    }

    const candidates = compoundSymbolsByFirstChar.get(char);
    let matched: string | undefined;
    if (candidates) {
      for (const candidate of candidates) {
        if (source.startsWith(candidate, cursor)) {
          matched = candidate;
          break;
        }
      }
    }
    const text = matched ?? char;
    cursor += text.length;
    emit("Symbol", text, start, cursor);
  }

  if (source.startsWith("#!")) {
    const end = source.search(NEWLINE_RE);
    protectedComments.push(source.slice(0, end === -1 ? source.length : end));
    cursor = end === -1 ? source.length : end;
  }

  while (cursor < source.length) {
    const before = cursor;
    lexOne();
    if (cursor === before) break; // pure-whitespace/comment tail with nothing left to lex
  }

  const eofAt = source.length;
  const { line, col } = lineColAt(newlineOffsets, eofAt);
  tokens.push({ kind: "Eof", text: "", start: eofAt, end: eofAt, line, col });

  return { tokens, protectedComments };
}
