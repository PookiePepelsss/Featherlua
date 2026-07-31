"use client";

import { useState } from "react";
import { compressAggressive, DEFAULT_AGGRESSIVE_OPTIONS, type AggressiveOptions } from "@/lib/luau/compress-aggressive";

const compoundSymbols = [
  "...", "..=", "//=", "==", "~=", "<=", ">=", "+=", "-=", "*=", "/=",
  "%=", "^=", "::", "->", "//", "..",
];
const compoundSymbolSet = new Set(compoundSymbols);
const compoundSymbolsByFirstChar = new Map<string, string[]>();
for (const symbol of compoundSymbols) {
  const key = symbol[0];
  const list = compoundSymbolsByFirstChar.get(key);
  if (list) list.push(symbol);
  else compoundSymbolsByFirstChar.set(key, [symbol]);
}

const WHITESPACE_RE = /\s/;
const DIGIT_RE = /\d/;
const IDENT_START_RE = /[A-Za-z_-￿]/;
const IDENT_CONTINUE_RE = /[A-Za-z0-9_-￿]/;
const NEWLINE_RE = /[\r\n]/;
const LICENSE_RE = /@license|@preserve|copyright|spdx/i;

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
        const lineEnd = source.slice(cursor).search(NEWLINE_RE);
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
  if (IDENT_CONTINUE_RE.test(leftEnd) && IDENT_CONTINUE_RE.test(rightStart)) return true;
  if (DIGIT_RE.test(leftEnd) && rightStart === ".") return true;
  if (leftEnd === "." && DIGIT_RE.test(rightStart)) return true;
  if (leftEnd === "-" && rightStart === "-") return true;
  if (leftEnd === "[" && (rightStart === "[" || rightStart === "=")) return true;
  return compoundSymbolSet.has(left + right);
}

function compressSource(source: string) {
  const outputParts: string[] = [];
  const protectedComments: string[] = [];
  let previousToken = "";
  let cursor = 0;

  if (source.startsWith("#!")) {
    const end = source.search(NEWLINE_RE);
    protectedComments.push(source.slice(0, end === -1 ? source.length : end));
    cursor = end === -1 ? source.length : end;
  }

  while (cursor < source.length) {
    const char = source[cursor];
    if (WHITESPACE_RE.test(char)) {
      cursor += 1;
      continue;
    }

    if (source.startsWith("--", cursor)) {
      const start = cursor;
      const bracket = longBracket(source, cursor + 2);
      if (bracket) cursor = scanLongBracket(source, bracket.body, bracket.level);
      else {
        const lineEnd = source.slice(cursor).search(NEWLINE_RE);
        cursor = lineEnd === -1 ? source.length : cursor + lineEnd;
      }
      const comment = source.slice(start, cursor);
      if (comment.startsWith("--!") || LICENSE_RE.test(comment)) {
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
    } else if (DIGIT_RE.test(char) || (char === "." && DIGIT_RE.test(source[cursor + 1] ?? ""))) {
      cursor = scanNumber(source, cursor);
    } else if (IDENT_START_RE.test(char)) {
      cursor += 1;
      while (cursor < source.length && IDENT_CONTINUE_RE.test(source[cursor])) {
        cursor += 1;
      }
    } else {
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
      cursor += matched?.length ?? 1;
    }

    const token = source.slice(start, cursor);
    if (previousToken && needsSpace(previousToken, token)) outputParts.push(" ");
    outputParts.push(token);
    previousToken = token;
  }

  let output = outputParts.join("");
  if (protectedComments.length) output = `${protectedComments.join("\n")}\n${output}`;
  return output.trim();
}

type Mode = "safe" | "aggressive";

export default function Home() {
  const [source, setSource] = useState("");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<Mode>("safe");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [options, setOptions] = useState<AggressiveOptions>(DEFAULT_AGGRESSIVE_OPTIONS);
  const [stats, setStats] = useState<{ inputChars: number; inputBytes: number; outputChars: number; outputBytes: number } | null>(null);

  function toggleOption(key: keyof AggressiveOptions) {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function byteLength(text: string) {
    return new TextEncoder().encode(text).length;
  }

  function compress() {
    let result: string | null = null;
    setWarning(null);
    if (mode === "safe") {
      result = compressSource(source);
      setOutput(result);
      setError(null);
    } else {
      const aggressiveResult = compressAggressive(source, options);
      if (aggressiveResult.ok) {
        result = aggressiveResult.output;
        setOutput(result);
        setError(null);
        setWarning(aggressiveResult.warning ?? null);
      } else {
        setOutput("");
        setError(aggressiveResult.error.message);
      }
    }
    setStats(
      result === null
        ? null
        : {
            inputChars: source.length,
            inputBytes: byteLength(source),
            outputChars: result.length,
            outputBytes: byteLength(result),
          },
    );
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
          value={error ?? output}
          readOnly
          spellCheck={false}
          placeholder="Output"
          aria-invalid={error ? true : undefined}
        />
      </section>

      {stats && (
        <div
          className="stats"
          aria-live="polite"
          key={`${stats.inputBytes}-${stats.outputBytes}-${stats.outputChars}`}
        >
          <span>Input: {stats.inputChars.toLocaleString()} chars / {stats.inputBytes.toLocaleString()} bytes</span>
          <span aria-hidden="true">→</span>
          <span>Output: {stats.outputChars.toLocaleString()} chars / {stats.outputBytes.toLocaleString()} bytes</span>
          {stats.inputBytes > 0 && (
            <span className="statsDelta">
              {stats.outputBytes <= stats.inputBytes
                ? `−${Math.round((1 - stats.outputBytes / stats.inputBytes) * 100)}%`
                : `+${Math.round((stats.outputBytes / stats.inputBytes - 1) * 100)}%`}
            </span>
          )}
        </div>
      )}

      {warning && (
        <div className="warning" role="status">
          {warning}
        </div>
      )}

      {mode === "aggressive" && (
        <fieldset className="options" aria-label="Aggressive mode passes">
          <legend className="srOnly">Aggressive mode passes</legend>
          <label>
            <input
              type="checkbox"
              checked={options.rename}
              onChange={() => toggleOption("rename")}
            />
            Rename locals
          </label>
          <label>
            <input
              type="checkbox"
              checked={options.foldConstants}
              onChange={() => toggleOption("foldConstants")}
            />
            Fold constants
          </label>
          <label>
            <input
              type="checkbox"
              checked={options.propagateConstants}
              onChange={() => toggleOption("propagateConstants")}
            />
            Propagate constants
          </label>
          <label>
            <input
              type="checkbox"
              checked={options.removeUnusedLocals}
              onChange={() => toggleOption("removeUnusedLocals")}
            />
            Remove unused locals
          </label>
          <label>
            <input
              type="checkbox"
              checked={options.stripTypes}
              onChange={() => toggleOption("stripTypes")}
            />
            Strip types
          </label>
          <label>
            <input
              type="checkbox"
              checked={options.mergeAdjacentLocals}
              onChange={() => toggleOption("mergeAdjacentLocals")}
            />
            Merge adjacent locals
          </label>
          <label>
            <input
              type="checkbox"
              checked={options.mergeAdjacentAssigns}
              onChange={() => toggleOption("mergeAdjacentAssigns")}
            />
            Merge adjacent assigns
          </label>
          <label>
            <input
              type="checkbox"
              checked={options.hoistRepeatedStrings}
              onChange={() => toggleOption("hoistRepeatedStrings")}
            />
            Dedupe repeated strings
          </label>
          <label title="Experimental: assumes accessed tables have no custom __index side effects. Off by default.">
            <input
              type="checkbox"
              checked={options.hoistRepeatedAccess}
              onChange={() => toggleOption("hoistRepeatedAccess")}
            />
            Hoist repeated access (experimental)
          </label>
          <label title="Experimental: assumes reading the global has no side effect. Off by default.">
            <input
              type="checkbox"
              checked={options.aliasRepeatedGlobalCalls}
              onChange={() => toggleOption("aliasRepeatedGlobalCalls")}
            />
            Alias repeated global calls (experimental)
          </label>
        </fieldset>
      )}

      <div className="actions" aria-label="Actions">
        <div className="modeToggle" role="radiogroup" aria-label="Compression mode">
          <button
            type="button"
            className={mode === "safe" ? "modeActive" : undefined}
            aria-pressed={mode === "safe"}
            onClick={() => setMode("safe")}
          >
            Safe
          </button>
          <button
            type="button"
            className={mode === "aggressive" ? "modeActive" : undefined}
            aria-pressed={mode === "aggressive"}
            onClick={() => setMode("aggressive")}
          >
            Aggressive
          </button>
        </div>
        <button className="primary" onClick={compress} disabled={!source.trim()}>
          Compress
        </button>
        <button
          className={copied ? "copied" : undefined}
          onClick={copyOutput}
          disabled={!output || Boolean(error)}
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <button onClick={downloadOutput} disabled={!output || Boolean(error)}>Download</button>
      </div>
    </main>
  );
}
