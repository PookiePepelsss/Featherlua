import { ParseError } from "./errors";
import { parse } from "./parser";

/** A single edit that turns unparseable source into parseable source. */
export interface Repair {
  /** What was done, in the words you would use telling someone. */
  description: string;
  fixed: string;
  /** Where the edit went, 1-based, for pointing at it. */
  line: number;
}

// Only the omissions that have exactly one sensible reading are attempted.
// Anything needing a guess about intent is left for a person: a compressor
// silently rewriting code it does not understand is worse than an error
// message. Every candidate below is checked by re-parsing before it is
// offered, and the caller checks it against the real compiler after that,
// so a repair that merely moves the error elsewhere never surfaces.

interface Cursor {
  index: number;
  line: number;
}

/** Walks source skipping strings and comments, so only real code is seen. */
function* codeTokens(source: string): Generator<{ text: string; index: number; line: number }> {
  let index = 0;
  let line = 1;
  const isWord = /[A-Za-z_]/;
  const isWordPart = /[A-Za-z0-9_]/;

  while (index < source.length) {
    const char = source[index];
    if (char === "\n") {
      line += 1;
      index += 1;
      continue;
    }
    if (source.startsWith("--", index)) {
      const long = longBracketEnd(source, index + 2);
      if (long !== undefined) {
        line += countNewlines(source.slice(index, long));
        index = long;
      } else {
        const nl = source.indexOf("\n", index);
        index = nl === -1 ? source.length : nl;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      const end = quotedEnd(source, index, char);
      line += countNewlines(source.slice(index, end));
      index = end;
      continue;
    }
    if (char === "[") {
      const long = longBracketEnd(source, index);
      if (long !== undefined) {
        line += countNewlines(source.slice(index, long));
        index = long;
        continue;
      }
    }
    if (isWord.test(char)) {
      let end = index + 1;
      while (end < source.length && isWordPart.test(source[end])) end += 1;
      yield { text: source.slice(index, end), index, line };
      index = end;
      continue;
    }
    yield { text: char, index, line };
    index += 1;
  }
}

function countNewlines(text: string) {
  let count = 0;
  for (const char of text) if (char === "\n") count += 1;
  return count;
}

function quotedEnd(source: string, start: number, quote: string) {
  let index = start + 1;
  while (index < source.length) {
    if (source[index] === "\\") index += 2;
    else if (source[index] === quote) return index + 1;
    else index += 1;
  }
  return source.length;
}

function longBracketEnd(source: string, start: number): number | undefined {
  if (source[start] !== "[") return undefined;
  let cursor = start + 1;
  while (source[cursor] === "=") cursor += 1;
  if (source[cursor] !== "[") return undefined;
  const closer = `]${"=".repeat(cursor - start - 1)}]`;
  const end = source.indexOf(closer, cursor + 1);
  return end === -1 ? source.length : end + closer.length;
}

/**
 * Counts block keywords the way Lua nests them. `function`, `if`, `for`,
 * `while` and `do` each want an `end`, except that the `do` belonging to a
 * `for` or `while` was already counted by its header, and `repeat` wants an
 * `until` rather than an `end`.
 */
function blockBalance(source: string) {
  const open: Cursor[] = [];
  let repeats = 0;
  let awaitingDo = 0;
  let surplusEnds = 0;

  for (const token of codeTokens(source)) {
    if (token.text === "for" || token.text === "while") {
      open.push({ index: token.index, line: token.line });
      awaitingDo += 1;
    } else if (token.text === "do") {
      if (awaitingDo > 0) awaitingDo -= 1;
      else open.push({ index: token.index, line: token.line });
    } else if (token.text === "function" || token.text === "if") {
      open.push({ index: token.index, line: token.line });
    } else if (token.text === "repeat") {
      repeats += 1;
    } else if (token.text === "end") {
      if (open.length) open.pop();
      else surplusEnds += 1;
    } else if (token.text === "until") {
      repeats -= 1;
    }
  }
  return { missingEnds: open.length - surplusEnds, missingUntils: repeats, open, surplusEnds };
}

/** Leading whitespace of the line containing `index`. */
function indentAt(source: string, index: number) {
  const lineStart = source.lastIndexOf("\n", index - 1) + 1;
  const match = /^[ \t]*/.exec(source.slice(lineStart));
  return match ? match[0] : "";
}

/**
 * Where an `end` belongs for a block opened at `openIndex`. Indentation is
 * the only evidence available about intent, and it is usually decisive: the
 * author indented the body, so the first later line at or left of the
 * opener's own indentation is where the block was meant to stop. Returning
 * the end of the source means no such line exists.
 */
function endInsertPoint(source: string, openIndex: number): number {
  const openIndent = indentAt(source, openIndex).length;
  let cursor = source.indexOf("\n", openIndex);
  if (cursor === -1) return source.length;
  cursor += 1;

  while (cursor < source.length) {
    const lineEnd = source.indexOf("\n", cursor);
    const line = source.slice(cursor, lineEnd === -1 ? source.length : lineEnd);
    const content = line.trim();
    if (content && !content.startsWith("--")) {
      const indent = (/^[ \t]*/.exec(line) ?? [""])[0].length;
      // A closer at this level belongs to an enclosing block, not this one.
      if (indent <= openIndent && !/^(end|else|elseif|until)\b/.test(content)) return cursor;
    }
    if (lineEnd === -1) break;
    cursor = lineEnd + 1;
  }
  return source.length;
}

function parses(source: string) {
  try {
    parse(source);
    return true;
  } catch {
    return false;
  }
}

function lineOf(source: string, index: number) {
  return countNewlines(source.slice(0, index)) + 1;
}

/** Appends text at the end, keeping a trailing newline last if there is one. */
function appendCode(source: string, addition: string) {
  const trimmed = source.replace(/\s+$/, "");
  const trailing = source.slice(trimmed.length);
  return `${trimmed}${addition}${trailing || "\n"}`;
}

function missingEndRepair(source: string): Repair | undefined {
  const { missingEnds, missingUntils, open, surplusEnds } = blockBalance(source);
  if (missingEnds <= 0 || missingUntils !== 0 || surplusEnds !== 0) return undefined;
  // More than a handful means the source is not simply missing a closer,
  // and guessing where several belong is exactly the judgement call this
  // is not willing to make.
  if (missingEnds > 3) return undefined;

  // Close the innermost unclosed block first, each at the place its own
  // indentation points to. Putting them all at the end of the file instead
  // would compile just as happily while quietly pulling every statement in
  // between inside the block, where it never runs.
  const insertions = open
    .slice(-missingEnds)
    .map((entry) => ({ at: endInsertPoint(source, entry.index), indent: indentAt(source, entry.index) }))
    .sort((a, b) => b.at - a.at);

  let fixed = source;
  for (const { at, indent } of insertions) {
    fixed = at >= fixed.length
      ? appendCode(fixed, `\n${indent}end`)
      : `${fixed.slice(0, at)}${indent}end\n${fixed.slice(at)}`;
  }
  if (!parses(fixed)) return undefined;

  const firstLine = Math.min(...insertions.map(({ at }) => lineOf(source, Math.min(at, source.length - 1))));
  return {
    description: missingEnds === 1 ? "added a missing `end`" : `added ${missingEnds} missing \`end\`s`,
    fixed,
    line: firstLine,
  };
}

function missingUntilRepair(source: string): Repair | undefined {
  const { missingUntils, missingEnds } = blockBalance(source);
  if (missingUntils !== 1 || missingEnds !== 0) return undefined;
  const fixed = appendCode(source, "\nuntil true");
  if (!parses(fixed)) return undefined;
  return { description: "closed a `repeat` with `until true`", fixed, line: countNewlines(source) + 1 };
}

function surplusEndRepair(source: string): Repair | undefined {
  const { missingEnds } = blockBalance(source);
  if (missingEnds !== -1) return undefined;
  // Drop the last `end`, which is the one that has nothing left to close.
  let last: { index: number; line: number } | undefined;
  for (const token of codeTokens(source)) if (token.text === "end") last = token;
  if (!last) return undefined;
  const fixed = `${source.slice(0, last.index)}${source.slice(last.index + 3)}`;
  if (!parses(fixed)) return undefined;
  return { description: "removed an `end` with no block left to close", fixed, line: last.line };
}

/** Inserts a keyword the parser said it wanted, at the point it wanted it. */
function missingKeywordRepair(source: string, error: ParseError): Repair | undefined {
  // `end` is deliberately absent: the parser reports it at the point it ran
  // out of input, which is rarely where the block was meant to close.
  // missingEndRepair works that out from indentation instead.
  const wanted = /^Expected '(then|do|until|,)'/.exec(error.message);
  if (!wanted) return undefined;
  const keyword = wanted[1];
  const separator = keyword === "," ? "" : " ";
  const fixed = `${source.slice(0, error.index)}${keyword}${separator}${source.slice(error.index)}`;
  if (!parses(fixed)) return undefined;
  return { description: `added a missing \`${keyword}\``, fixed, line: error.line };
}

/** Closes brackets left open, when only the count is wrong. */
function unclosedBracketRepair(source: string): Repair | undefined {
  const stack: { text: string; index: number }[] = [];
  const pairs: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
  for (const token of codeTokens(source)) {
    if (token.text in pairs) stack.push(token);
    else if (token.text === ")" || token.text === "]" || token.text === "}") {
      const top = stack[stack.length - 1];
      if (!top || pairs[top.text] !== token.text) return undefined; // crossed, not merely open
      stack.pop();
    }
  }
  if (!stack.length || stack.length > 2) return undefined;
  const closers = stack.map((entry) => pairs[entry.text]).reverse().join("");
  const description = `closed ${stack.length === 1 ? "an unclosed" : "two unclosed"} \`${stack.map((e) => e.text).join("` and `")}\``;

  // A bracket almost always wants closing at the end of the line it was
  // opened on, not at the end of the file: appending to the end would
  // swallow every statement in between into the call or the table.
  const lineEnd = source.indexOf("\n", stack[0].index);
  if (lineEnd !== -1) {
    const atLineEnd = `${source.slice(0, lineEnd)}${closers}${source.slice(lineEnd)}`;
    if (parses(atLineEnd)) {
      return { description, fixed: atLineEnd, line: lineOf(source, stack[0].index) };
    }
  }

  const atEnd = appendCode(source, closers);
  if (!parses(atEnd)) return undefined;
  return { description, fixed: atEnd, line: lineOf(source, stack[0].index) };
}

/**
 * Offers repairs for source that does not parse, best first. Returns an
 * empty list when the source parses already, or when nothing simple and
 * unambiguous accounts for the error.
 */
export function suggestRepairs(source: string): Repair[] {
  let error: ParseError;
  try {
    parse(source);
    return [];
  } catch (thrown) {
    if (!(thrown instanceof ParseError)) return [];
    error = thrown;
  }

  const candidates = [
    missingEndRepair(source),
    missingKeywordRepair(source, error),
    missingUntilRepair(source),
    unclosedBracketRepair(source),
    surplusEndRepair(source),
  ];

  const seen = new Set<string>();
  const repairs: Repair[] = [];
  for (const repair of candidates) {
    if (!repair || seen.has(repair.fixed)) continue;
    seen.add(repair.fixed);
    repairs.push(repair);
  }
  return repairs;
}
