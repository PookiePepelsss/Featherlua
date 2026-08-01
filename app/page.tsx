"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_AGGRESSIVE_OPTIONS, type AggressiveOptions } from "@/lib/luau/compress-aggressive";
import type { CompressionMode, CompressionRequest, CompressionResponse } from "@/lib/luau/compression-protocol";
import { DIALECTS, type LuaDialect } from "@/lib/luau/dialects";

interface Stats {
  inputChars: number;
  inputBytes: number;
  outputChars: number;
  outputBytes: number;
  durationMs: number;
  validation: "official-luau" | "lexical";
}

const optionLabels: Array<[keyof AggressiveOptions, string]> = [
  ["rename", "Rename locals"],
  ["foldConstants", "Fold constants"],
  ["propagateConstants", "Propagate constants"],
  ["removeUnusedLocals", "Remove unused locals"],
  ["stripTypes", "Strip types"],
  ["mergeAdjacentLocals", "Merge adjacent locals"],
  ["mergeAdjacentAssigns", "Merge adjacent assigns"],
  ["hoistRepeatedStrings", "Dedupe repeated strings"],
];

const bytes = (text: string) => new TextEncoder().encode(text).length;

export default function Home() {
  const [source, setSource] = useState("");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [working, setWorking] = useState(false);
  const [mode, setMode] = useState<CompressionMode>("safe");
  const [dialect, setDialect] = useState<LuaDialect>("luau");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [options, setOptions] = useState<AggressiveOptions>(DEFAULT_AGGRESSIVE_OPTIONS);
  const [stats, setStats] = useState<Stats | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestId = useRef(0);

  useEffect(() => () => workerRef.current?.terminate(), []);

  function invalidateResult() {
    workerRef.current?.terminate();
    workerRef.current = null;
    setWorking(false);
    setOutput("");
    setError(null);
    setWarning(null);
    setStats(null);
    setCopied(false);
  }

  function toggleOption(key: keyof AggressiveOptions) {
    setOptions((previous) => ({ ...previous, [key]: !previous[key] }));
    invalidateResult();
  }

  function compress() {
    invalidateResult();
    setWorking(true);
    const id = ++requestId.current;
    const worker = new Worker(new URL("../lib/luau/compression.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<CompressionResponse>) => {
      if (event.data.id !== id) return;
      worker.terminate();
      workerRef.current = null;
      setWorking(false);
      if (!event.data.ok) {
        setError(event.data.error);
        return;
      }
      const result = event.data;
      setOutput(result.output);
      const rollback = result.rolledBack.length
        ? `Skipped because they did not reduce size: ${result.rolledBack.join(", ")}.`
        : null;
      setWarning([result.warning, rollback].filter(Boolean).join(" ") || null);
      setStats({
        inputChars: source.length,
        inputBytes: bytes(source),
        outputChars: result.output.length,
        outputBytes: bytes(result.output),
        durationMs: result.durationMs,
        validation: result.validation,
      });
    };
    worker.onerror = (event) => {
      worker.terminate();
      workerRef.current = null;
      setWorking(false);
      setError(event.message || "Compression worker failed.");
    };
    const request: CompressionRequest = { id, source, dialect, mode, options };
    worker.postMessage(request);
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
    link.download = dialect === "luau" ? "script.min.luau" : "script.min.lua";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app">
      <section className="editors" aria-label="Lua compressor">
        <label className="srOnly" htmlFor="source">Input</label>
        <textarea
          id="source"
          value={source}
          onChange={(event) => {
            setSource(event.target.value);
            invalidateResult();
          }}
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
          placeholder={working ? "Compressing and validating…" : "Output"}
          aria-invalid={error ? true : undefined}
          aria-busy={working}
        />
      </section>

      {stats && (
        <div className="stats" aria-live="polite">
          <span>{stats.inputBytes.toLocaleString()} B</span>
          <span aria-hidden="true">→</span>
          <span>{stats.outputBytes.toLocaleString()} B</span>
          {stats.inputBytes > 0 && (
            <span className="statsDelta">
              {stats.outputBytes <= stats.inputBytes
                ? `−${Math.round((1 - stats.outputBytes / stats.inputBytes) * 100)}%`
                : `+${Math.round((stats.outputBytes / stats.inputBytes - 1) * 100)}%`}
            </span>
          )}
          <span>{stats.durationMs.toFixed(1)} ms</span>
          <span className={stats.validation === "official-luau" ? "validated" : undefined}>
            {stats.validation === "official-luau" ? "Official Luau validated" : "Lexically validated"}
          </span>
        </div>
      )}

      {warning && <div className="warning" role="status">{warning}</div>}

      {mode === "aggressive" && dialect === "luau" && (
        <fieldset className="options" aria-label="Aggressive mode passes">
          <legend className="srOnly">Aggressive mode passes</legend>
          {optionLabels.map(([key, label]) => (
            <label key={key}>
              <input type="checkbox" checked={options[key]} onChange={() => toggleOption(key)} />
              {label}
            </label>
          ))}
        </fieldset>
      )}

      <div className="actions" aria-label="Actions">
        <label className="dialectSelect">
          <span className="srOnly">Language version</span>
          <select
            value={dialect}
            onChange={(event) => {
              const next = event.target.value as LuaDialect;
              setDialect(next);
              if (next !== "luau") setMode("safe");
              invalidateResult();
            }}
          >
            {DIALECTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <div className="modeToggle" role="radiogroup" aria-label="Compression mode">
          <button
            type="button"
            className={mode === "safe" ? "modeActive" : undefined}
            aria-pressed={mode === "safe"}
            onClick={() => { setMode("safe"); invalidateResult(); }}
          >
            Safe
          </button>
          <button
            type="button"
            className={mode === "aggressive" ? "modeActive" : undefined}
            aria-pressed={mode === "aggressive"}
            disabled={dialect !== "luau"}
            title={dialect === "luau" ? undefined : "Aggressive AST rewrites are Luau-only."}
            onClick={() => { setMode("aggressive"); invalidateResult(); }}
          >
            Aggressive
          </button>
        </div>
        <button className="primary" onClick={compress} disabled={!source.trim() || working}>
          {working ? "Working…" : "Compress"}
        </button>
        <button className={copied ? "copied" : undefined} onClick={copyOutput} disabled={!output || Boolean(error)}>
          {copied ? "Copied" : "Copy"}
        </button>
        <button onClick={downloadOutput} disabled={!output || Boolean(error)}>Download</button>
      </div>
    </main>
  );
}
