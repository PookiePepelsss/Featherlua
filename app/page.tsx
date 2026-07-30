"use client";

import { useState } from "react";

const compoundSymbols = [
  "...", "..=", "//=", "==", "~=", "<=", ">=", "+=", "-=", "*=", "/=",
  "%=", "^=", "::", "->", "//", "..",
];

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
  if (/^0[xX]/.test(source.slice(cursor, cursor + 2))) {
    cursor += 2;
    takeDigits(/[0-9a-fA-F]/);
    if (source[cursor] === "." && source[cursor + 1] !== ".") {
      cursor += 1;
      takeDigits(/[0-9a-fA-F]/);
    }
    takeExponent("p", "P");
    return cursor;
  }
  if (/^0[bB]/.test(source.slice(cursor, cursor + 2))) {
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
        const lineEnd = source.slice(cursor).search(/[\r\n]/);
        cursor = lineEnd === -1 ? source.length : cursor + lineEnd;
      }
      continue;
    }
    const char = source[cursor];
    if (char === "'" || char === '"') cursor = scanQuoted(source, cursor, char);
    else if (char === "`") cursor = scanInterpolated(source, cursor);
    else if (char === "[") {
      const bracket = longBracket(source, cursor);
      cursor = bracket
        ? scanLongBracket(source, bracket.body, bracket.level)
        : cursor + 1;
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

function needsSpace(left: string, right: string) {
  const leftEnd = left.at(-1) ?? "";
  const rightStart = right[0] ?? "";
  const word = /[A-Za-z0-9_\u0080-\uFFFF]/;
  if (word.test(leftEnd) && word.test(rightStart)) return true;
  if (/\d/.test(leftEnd) && rightStart === ".") return true;
  if (leftEnd === "." && /\d/.test(rightStart)) return true;
  if (leftEnd === "-" && rightStart === "-") return true;
  if (leftEnd === "[" && (rightStart === "[" || rightStart === "=")) return true;
  return compoundSymbols.includes(left + right);
}

function compressSource(source: string) {
  const tokens: string[] = [];
  const protectedComments: string[] = [];
  let cursor = 0;

  if (source.startsWith("#!")) {
    const end = source.search(/[\r\n]/);
    protectedComments.push(source.slice(0, end === -1 ? source.length : end));
    cursor = end === -1 ? source.length : end;
  }

  while (cursor < source.length) {
    const char = source[cursor];
    if (/\s/.test(char)) {
      cursor += 1;
      continue;
    }

    if (source.startsWith("--", cursor)) {
      const start = cursor;
      const bracket = longBracket(source, cursor + 2);
      if (bracket) cursor = scanLongBracket(source, bracket.body, bracket.level);
      else {
        const lineEnd = source.slice(cursor).search(/[\r\n]/);
        cursor = lineEnd === -1 ? source.length : cursor + lineEnd;
      }
      const comment = source.slice(start, cursor);
      if (comment.startsWith("--!") || /@license|@preserve|copyright|spdx/i.test(comment)) {
        protectedComments.push(comment);
      }
      continue;
    }

    const start = cursor;
    if (char === "'" || char === '"') cursor = scanQuoted(source, cursor, char);
    else if (char === "`") cursor = scanInterpolated(source, cursor);
    else if (char === "[") {
      const bracket = longBracket(source, cursor);
      cursor = bracket
        ? scanLongBracket(source, bracket.body, bracket.level)
        : cursor + 1;
    } else if (/\d/.test(char) || (char === "." && /\d/.test(source[cursor + 1] ?? ""))) {
      cursor = scanNumber(source, cursor);
    } else if (/[A-Za-z_\u0080-\uFFFF]/.test(char)) {
      cursor += 1;
      while (cursor < source.length && /[A-Za-z0-9_\u0080-\uFFFF]/.test(source[cursor])) {
        cursor += 1;
      }
    } else {
      const symbol = compoundSymbols.find((value) => source.startsWith(value, cursor));
      cursor += symbol?.length ?? 1;
    }
    tokens.push(source.slice(start, cursor));
  }

  let output = "";
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const previous = tokens[index - 1];
    if (previous && needsSpace(previous, token)) output += " ";
    output += token;
  }
  if (protectedComments.length) output = `${protectedComments.join("\n")}\n${output}`;
  return output.trim();
}

export default function Home() {
  const [source, setSource] = useState("");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);

  function compress() {
    setOutput(compressSource(source));
    setCopied(false);
  }

  async function copyOutput() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
  }

  function downloadOutput() {
    if (!output) return;
    const url = URL.createObjectURL(new Blob([output], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "script.min.luau";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app">
      <section className="editors" aria-label="Luau compressor">
        <label className="srOnly" htmlFor="source">Input</label>
        <textarea
          id="source"
          value={source}
          onChange={(event) => setSource(event.target.value)}
          spellCheck={false}
          placeholder="Input"
          autoFocus
        />

        <label className="srOnly" htmlFor="output">Output</label>
        <textarea
          id="output"
          value={output}
          readOnly
          spellCheck={false}
          placeholder="Output"
        />
      </section>

      <div className="actions" aria-label="Actions">
        <button className="primary" onClick={compress} disabled={!source.trim()}>
          Compress
        </button>
        <button onClick={copyOutput} disabled={!output}>{copied ? "Copied" : "Copy"}</button>
        <button onClick={downloadOutput} disabled={!output}>Download</button>
      </div>
    </main>
  );
}
