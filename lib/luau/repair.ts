import { ParseError } from "./errors";
import { parse } from "./parser";
import { structurallyEqual } from "./alpha-equivalence";

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
    if (char === "`") {
      const end = interpolatedEnd(source, index);
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

/**
 * End of the backtick string starting at `start`. Its literal text is not
 * code, so an `end` or a stray `}` written inside one must not be counted
 * as a closer, and the `{...}` parts balance on their own. The whole thing
 * is therefore skipped as a unit.
 */
function interpolatedEnd(source: string, start: number): number {
  let index = start + 1;
  let depth = 0;
  while (index < source.length) {
    const char = source[index];
    if (char === "\\") index += 2;
    else if (char === "`") {
      if (depth === 0) return index + 1;
      index = interpolatedEnd(source, index); // a nested one, inside `{...}`
    } else if (char === "{") {
      depth += 1;
      index += 1;
    } else if (char === "}" && depth > 0) {
      depth -= 1;
      index += 1;
    } else if (depth > 0 && (char === '"' || char === "'")) {
      index = quotedEnd(source, index, char);
    } else index += 1;
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
  // A long file can genuinely be missing several closers, and each one is
  // placed from its own opener's indentation rather than guessed at, so the
  // count is not what makes this risky. The cap is only here to stop a file
  // that is wrong in some entirely different way from being papered over
  // with a wall of `end`s.
  if (missingEnds > 25) return undefined;

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

  const firstLine = Math.min(...insertions.map(({ at }) => lineOf(source, Math.min(at, source.length - 1))));
  return {
    description: missingEnds === 1 ? "added a missing `end`" : `added ${missingEnds} missing \`end\`s`,
    fixed,
    line: firstLine,
  };
}

function surplusEndRepair(source: string, error: ParseError): Repair | undefined {
  // When the parser names an `end` as unexpected it is saying no block was
  // open for it, and that token is the one to drop. Requiring the file to
  // balance to exactly one surplus first was wrong: a long script is
  // usually off in more than one way at once, and gating on the whole-file
  // count meant the named token was never even tried.
  const namedByParser = /^Unexpected token 'end'/.test(error.message) && source.startsWith("end", error.index);

  const candidates: number[] = [];
  if (namedByParser) candidates.push(error.index);

  // Falling back to the last `end` only makes sense when the count says
  // there is exactly one too many and the parser did not point anywhere.
  if (!namedByParser && blockBalance(source).missingEnds === -1) {
    let last: number | undefined;
    for (const token of codeTokens(source)) if (token.text === "end") last = token.index;
    if (last !== undefined) candidates.push(last);
  }
  if (!candidates.length) return undefined;

  for (const at of candidates) {
    const fixed = withoutEndAt(source, at);
    if (candidates.length === 1 || parses(fixed)) {
      // One `end` too many rarely has one answer. The parser names the
      // first that closes nothing, but removing an earlier one often parses
      // just as well and nests the code differently, and both compile, so
      // the mistake would be silent. Where a second removal also works,
      // this is a judgement about intent and belongs to the author.
      const ambiguity = ambiguousEndRemoval(source, at);
      if (ambiguity === "yes") return undefined;
      const description = ambiguity === "unchecked"
        ? "removed an `end` with no block left to close (this file is too large to check whether removing a different one would read the same, so look before you keep it)"
        : "removed an `end` with no block left to close";
      return { description, fixed, line: lineOf(source, at) };
    }
  }
  return undefined;
}

/** Deletes the `end` at `at`, taking its whole line when it sits alone. */
function withoutEndAt(source: string, at: number) {
  const lineStart = source.lastIndexOf("\n", at - 1) + 1;
  const alone = source.slice(lineStart, at).trim() === "";
  const cutFrom = alone ? lineStart : at;
  const cutTo = alone && source[at + 3] === "\n" ? at + 4 : at + 3;
  return `${source.slice(0, cutFrom)}${source.slice(cutTo)}`;
}

// Checking every `end` in a very large file would cost a parse each, so the
// search is bounded. Above that size the parser's choice is taken as it
// stands rather than spending seconds to second-guess it.
const AMBIGUITY_CHECK_LIMIT = 120000;

/**
 * Whether removing some other `end` would read just as well. "unchecked"
 * means the file was too large to ask: the answer is unknown, not no, and
 * the caller says so rather than implying the question was settled.
 */
function ambiguousEndRemoval(source: string, chosen: number): "yes" | "no" | "unchecked" {
  if (source.length > AMBIGUITY_CHECK_LIMIT) return "unchecked";
  let chosenChunk;
  try {
    chosenChunk = parse(withoutEndAt(source, chosen)).chunk;
  } catch {
    return "no";
  }
  for (const token of codeTokens(source)) {
    if (token.text !== "end" || token.index === chosen) continue;
    let otherChunk;
    try {
      otherChunk = parse(withoutEndAt(source, token.index)).chunk;
    } catch {
      continue;
    }
    // Removing either of two `end`s that close at the same place gives
    // different text and the same program, which is no ambiguity at all.
    // Only a genuinely different nesting counts.
    if (!structurallyEqual(chosenChunk, otherChunk).equal) return "yes";
  }
  return "no";
}

/** Inserts a keyword the parser said it wanted, at the point it wanted it. */
function missingKeywordRepair(source: string, error: ParseError): Repair | undefined {
  // `end` is deliberately absent: the parser reports it at the point it ran
  // out of input, which is rarely where the block was meant to close.
  // missingEndRepair works that out from indentation instead.
  //
  // `until` is absent for a different reason. Inserting the bare keyword
  // would take whatever follows as the loop condition, so `repeat f() x > 5`
  // would silently become `repeat f() until x > 5`. There is no evidence
  // for that condition anywhere, and a loop that stops on the wrong one
  // still compiles and still runs.
  const wanted = /^Expected '(then|do|,)'/.exec(error.message);
  if (wanted) {
    const keyword = wanted[1];
    const separator = keyword === "," ? "" : " ";
    const fixed = `${source.slice(0, error.index)}${keyword}${separator}${source.slice(error.index)}`;
    return { description: `added a missing \`${keyword}\``, fixed, line: error.line };
  }

  // A table or argument list missing a separator reads to the parser as a
  // closing bracket that never arrived, because the next entry is where it
  // expected `}`. The comma belongs just before that entry, which means
  // there has to BE one: at the end of the input the same message says the
  // bracket itself is missing, and that belongs to unclosedBracketRepair.
  if (/^Expected '[)\]}]'/.test(error.message) && error.index < source.length) {
    // The comma belongs at the end of the entry before the one the parser
    // stopped on. When entries sit on their own lines that is the previous
    // line's end; otherwise it is where the parser stopped.
    const beforeLine = source.lastIndexOf("\n", error.index - 1);
    if (beforeLine > 0 && !source.slice(beforeLine, error.index).trim()) {
      return {
        description: "added a missing `,`",
        fixed: `${source.slice(0, beforeLine)},${source.slice(beforeLine)}`,
        line: lineOf(source, beforeLine),
      };
    }
    return {
      description: "added a missing `,`",
      fixed: `${source.slice(0, error.index)}, ${source.slice(error.index)}`,
      line: error.line,
    };
  }
  return undefined;
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

  // A bracket wants closing where the expression visibly ends: just before
  // the first later line back at the opener's indentation, past which
  // everything is sibling code, or at the end of the file when nothing
  // dedents. Closing at the opener's own line end read well for one-line
  // calls, but it cut a truncated multi-line table off from the indented
  // entries that plainly belong inside it.
  const openerIndent = indentAt(source, stack[0].index).length;
  let insertBefore = source.length;
  let cursor = source.indexOf("\n", stack[0].index);
  while (cursor !== -1 && cursor < source.length) {
    const lineEnd = source.indexOf("\n", cursor + 1);
    const line = source.slice(cursor + 1, lineEnd === -1 ? source.length : lineEnd);
    const content = line.trim();
    if (content && !content.startsWith("--")) {
      const indent = (/^[ \t]*/.exec(line) ?? [""])[0].length;
      if (indent <= openerIndent) {
        insertBefore = cursor;
        break;
      }
    }
    cursor = lineEnd;
  }

  // The closers sit right after the last code before that point.
  let at = insertBefore;
  while (at > 0 && /\s/.test(source[at - 1])) at -= 1;
  if (at > 0 && at < source.length) {
    const candidate = `${source.slice(0, at)}${closers}${source.slice(at)}`;
    if (parses(candidate)) {
      return { description, fixed: candidate, line: lineOf(source, stack[0].index) };
    }
  }

  const atEnd = appendCode(source, closers);
  if (!parses(atEnd)) return undefined;
  return { description, fixed: atEnd, line: lineOf(source, stack[0].index) };
}

// `local t.field = v` is not Lua: `local` declares a name, and a field
// belongs to a table that already exists. Decompilers emit it regularly,
// and dropping the `local` is the only reading.
function localFieldRepair(source: string, error: ParseError): Repair | undefined {
  // The parser stops on the `.`, so what precedes it is `local` and the
  // name it was trying to declare.
  if (source[error.index] !== "." && source[error.index] !== "[") return undefined;
  const before = source.slice(0, error.index);
  const tail = before.slice(Math.max(0, before.length - 80));
  const declaration = /(?:^|[\s;])(local[ \t]+)[A-Za-z_][A-Za-z0-9_]*$/.exec(tail);
  if (!declaration) return undefined;
  const localAt = before.length - (declaration[0].length - (declaration[0].startsWith("local") ? 0 : 1));
  const fixed = `${source.slice(0, localAt)}${source.slice(localAt + "local ".length)}`;
  return { description: "dropped a `local` from a field assignment", fixed, line: lineOf(source, localAt) };
}

// A Luau decompiler will also drop a `local` in front of an expression that
// is not a declaration at all, as in `if local t.Character then`. The
// keyword can only begin a statement, so a parser asking for a name at one
// has a single minimal reading: it does not belong there.
function strayLocalRepair(source: string, error: ParseError): Repair | undefined {
  if (!/^Expected a name/.test(error.message)) return undefined;
  if (!source.startsWith("local", error.index)) return undefined;
  if (/[A-Za-z0-9_]/.test(source[error.index - 1] ?? "")) return undefined;
  let after = error.index + "local".length;
  if (!/[ \t]/.test(source[after] ?? "")) return undefined;
  while (/[ \t]/.test(source[after] ?? "")) after += 1;
  return {
    description: "dropped a stray `local`",
    fixed: `${source.slice(0, error.index)}${source.slice(after)}`,
    line: error.line,
  };
}

// `if x = 1 then` cannot be finished by the `then` the parser asked for
// while the `=` sits in the condition, and a comparison is the only thing
// an `=` there can have meant.
function equalsInConditionRepair(source: string, error: ParseError): Repair | undefined {
  if (!/^Expected '(then|do)'/.test(error.message)) return undefined;
  if (source[error.index] !== "=" || source[error.index + 1] === "=") return undefined;
  return {
    description: "changed `=` to `==` in a condition",
    fixed: `${source.slice(0, error.index)}==${source.slice(error.index + 1)}`,
    line: error.line,
  };
}

// A list ending `,)` or `return x,` at the end of a block lost nothing;
// the comma itself is the mistake. Only fires where the parser stopped on
// a closer or ran out of input, so a comma before anything else, which
// could be a genuinely missing entry, is left alone.
function trailingCommaRepair(source: string, error: ParseError): Repair | undefined {
  if (!/^Expected a name/.test(error.message)) return undefined;
  let before = error.index - 1;
  while (before >= 0 && /\s/.test(source[before])) before -= 1;
  if (source[before] !== ",") return undefined;
  if (!/^(\)|\]|end\b|until\b|else\b|elseif\b|$)/.test(source.slice(error.index))) return undefined;
  return {
    description: "removed a trailing `,`",
    fixed: `${source.slice(0, before)}${source.slice(before + 1)}`,
    line: lineOf(source, before),
  };
}

// A pasted script cut off inside a literal is missing exactly its closer.
// A quoted string cannot cross the line it opened on, so the line's end is
// the one place the quote can go; long brackets span lines, so those close
// at the end of the file, taking whatever the truncation left as body.
function unterminatedLiteralRepair(source: string, error: ParseError): Repair | undefined {
  if (/^Unterminated (string|interpolated string) /.test(error.message)) {
    const quote = source[error.index];
    const lineEnd = source.slice(error.index).search(/[\r\n]/);
    const at = lineEnd === -1 ? source.length : error.index + lineEnd;

    // Where the quote goes is a real choice when the line ends in brackets.
    // `print("hi)` can be read as the string `hi)` inside a call still
    // missing its `)`, or as the string `hi` whose `)` is already there.
    // The second needs one edit and the first needs two, so the closers at
    // the end of the line are tried as insertion points first, innermost
    // out, and the first reading that parses on its own wins.
    const candidates: number[] = [];
    let back = at;
    while (back > error.index && /[)\]}\s]/.test(source[back - 1])) {
      back -= 1;
      if (/[)\]}]/.test(source[back])) candidates.push(back);
    }
    candidates.push(at);

    const chosen = candidates.find((index) =>
      parses(`${source.slice(0, index)}${quote}${source.slice(index)}`),
    ) ?? at;

    return {
      description: "closed an unterminated string",
      fixed: `${source.slice(0, chosen)}${quote}${source.slice(chosen)}`,
      line: error.line,
    };
  }
  const long = /^Unterminated long (string|comment) /.exec(error.message);
  if (long) {
    const bracketAt = long[1] === "comment" ? error.index + 2 : error.index;
    let level = 0;
    while (source[bracketAt + 1 + level] === "=") level += 1;
    return {
      description: long[1] === "comment" ? "closed an unterminated comment" : "closed an unterminated string",
      fixed: appendCode(source, `]${"=".repeat(level)}]`),
      line: error.line,
    };
  }
  return undefined;
}

function parseErrorOf(source: string): ParseError | undefined {
  try {
    parse(source);
    return undefined;
  } catch (thrown) {
    return thrown instanceof ParseError ? thrown : undefined;
  }
}

function candidateFixes(source: string, error: ParseError): Repair[] {
  // The parser names the token it wanted, so the edit driven by that comes
  // first; the structural guesses are for when it named nothing useful.
  const found = [
    // A lexer error first: nothing structural can be judged while a
    // literal is swallowing the rest of the file.
    unterminatedLiteralRepair(source, error),
    // Before missingKeywordRepair: both react to "Expected 'then'", and
    // inserting the keyword in front of a stray `=` fixes nothing.
    equalsInConditionRepair(source, error),
    missingKeywordRepair(source, error),
    localFieldRepair(source, error),
    strayLocalRepair(source, error),
    trailingCommaRepair(source, error),
    surplusEndRepair(source, error),
    missingEndRepair(source),
    unclosedBracketRepair(source),
  ];
  const seen = new Set<string>();
  const repairs: Repair[] = [];
  for (const repair of found) {
    if (!repair || repair.fixed === source || seen.has(repair.fixed)) continue;
    seen.add(repair.fixed);
    repairs.push(repair);
  }
  return repairs;
}

// A file with one omission in it is the easy case. A file with the same
// omission six times over is the common one, and fixing only the first
// leaves something that still does not parse, so nothing was offered at
// all. Each edit has to move the parser strictly further into the file
// than the last, which both guarantees progress and stops the loop from
// circling.
const MAX_ITERATIVE_EDITS = 40;

function repairIteratively(source: string, firstError: ParseError): Repair | undefined {
  let current = source;
  let error: ParseError | undefined = firstError;
  const descriptions: string[] = [];

  for (let step = 0; step < MAX_ITERATIVE_EDITS; step += 1) {
    if (!error) {
      const summary = new Set(descriptions);
      return {
        description: summary.size === 1 && descriptions.length === 1
          ? descriptions[0]
          : `made ${descriptions.length} small fixes (${[...summary].join("; ")})`,
        fixed: current,
        line: lineOf(source, Math.min(firstError.index, source.length - 1)),
      };
    }

    const reached = error.index;
    let advanced: Repair | undefined;
    for (const candidate of candidateFixes(current, error)) {
      const next = parseErrorOf(candidate.fixed);
      // An edit that removes text shifts every later position back with it,
      // so progress is measured against where the old error would now sit
      // rather than against its original offset.
      const shift = candidate.fixed.length - current.length;
      if (!next || next.index > reached + Math.min(0, shift)) {
        advanced = candidate;
        error = next;
        break;
      }
    }
    if (!advanced) return undefined;
    current = advanced.fixed;
    descriptions.push(advanced.description);
  }
  return undefined;
}

/**
 * Repairs for source that will not parse, best first. Empty when it parses
 * already, or when nothing simple and unambiguous explains the error.
 */
export function suggestRepairs(source: string): Repair[] {
  const error = parseErrorOf(source);
  if (!error) return [];

  const repairs = candidateFixes(source, error).filter((repair) => parses(repair.fixed));
  if (repairs.length) return repairs;

  const iterative = repairIteratively(source, error);
  return iterative ? [iterative] : [];
}
