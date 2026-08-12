"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  DEFAULT_AGGRESSIVE_OPTIONS,
  MEDIUM_AGGRESSIVE_OPTIONS,
  type AggressiveOptions,
} from "@/lib/luau/compress-aggressive";
import type { CompressionMode, CompressionRequest, CompressionResponse } from "@/lib/luau/compression-protocol";

interface Stats {
  inputChars: number;
  inputBytes: number;
  outputChars: number;
  outputBytes: number;
  durationMs: number;
}

// The third entry is what the checkbox says on hover. Nine bare labels
// tell nobody which one to switch off when a script misbehaves.
const optionLabels: Array<[keyof AggressiveOptions, string, string]> = [
  ["rename", "Rename locals", "Gives every local the shortest name free at that point. Much the largest saving, and the one a debug API reading locals by name would notice."],
  ["foldConstants", "Fold constants", "Works out the arithmetic between literals, drops branches that cannot run, and picks the shorter spelling of a form."],
  ["propagateConstants", "Propagate constants", "Replaces a local that never changes with the value it holds."],
  ["removeUnusedLocals", "Remove unused locals", "Drops declarations nothing reads, along with the work of computing them where that is free of side effects."],
  ["stripTypes", "Strip types", "Removes type annotations. Luau erases them at runtime, so nothing observes their absence."],
  ["mergeAdjacentLocals", "Merge adjacent locals", "Turns a run of declarations into one, held back where the register pool is tight."],
  ["mergeAdjacentAssigns", "Merge adjacent assigns", "Turns a run of assignments into one."],
  ["hoistRepeatedStrings", "Dedupe repeated strings", "Binds a literal used several times to a local, where that costs fewer bytes than repeating it."],
  [
    "aliasGlobals",
    "Alias repeated globals",
    "Binds a repeated global to a local, for the bytes: it makes no difference to speed, which is worth saying because localising globals is old Lua advice that Luau's import resolution has already taken care of. Off by default because an alias keeps whatever the global held when the script started, so anything that hooks or replaces it later is missed.",
  ],
];

const bytes = (text: string) => new TextEncoder().encode(text).length;

const MODES: Array<[CompressionMode, string, string]> = [
  ["safe", "Safe", "Strips whitespace and comments. Every token you wrote survives."],
  ["medium", "Medium", "Also folds constants and drops types and dead branches. No local is renamed, added or removed."],
  ["aggressive", "Aggressive", "Everything: renames locals, propagates constants, removes what is unused."],
];

export default function Home() {
  const [source, setSource] = useState("");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [working, setWorking] = useState(false);
  const [mode, setMode] = useState<CompressionMode>("safe");
  const [autoRepair, setAutoRepair] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [repair, setRepair] = useState<{ description: string; line: number; fixed: string; applied: boolean } | null>(null);
  const [options, setOptions] = useState<AggressiveOptions>(DEFAULT_AGGRESSIVE_OPTIONS);
  const [stats, setStats] = useState<Stats | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const activeRequest = useRef<number | null>(null);
  const pendingSource = useRef("");
  const requestId = useRef(0);

  useEffect(() => () => {
    workerRef.current?.terminate();
  }, []);

  function invalidateResult() {
    if (activeRequest.current !== null) {
      workerRef.current?.terminate();
      workerRef.current = null;
      activeRequest.current = null;
    }
    setWorking(false);
    setOutput("");
    setError(null);
    setWarning(null);
    setRepair(null);
    setStats(null);
    setCopied(false);
  }

  // Each mode is a starting set of passes rather than a locked one, so
  // switching loads that profile and leaves the checkboxes free afterwards.
  function selectMode(next: CompressionMode) {
    setMode(next);
    if (next === "medium") setOptions(MEDIUM_AGGRESSIVE_OPTIONS);
    if (next === "aggressive") setOptions(DEFAULT_AGGRESSIVE_OPTIONS);
    invalidateResult();
  }

  function toggleOption(key: keyof AggressiveOptions) {
    setOptions((previous) => ({ ...previous, [key]: !previous[key] }));
    invalidateResult();
  }

  function compress() {
    invalidateResult();
    setWorking(true);
    const id = ++requestId.current;
    activeRequest.current = id;
    pendingSource.current = source;
    const worker = workerRef.current ?? new Worker(new URL("../lib/luau/compression.worker.ts", import.meta.url), { type: "module" });
    workerRef.current ??= worker;
    worker.onmessage = (event: MessageEvent<CompressionResponse>) => {
      if (event.data.id !== id) return;
      activeRequest.current = null;
      setWorking(false);
      if (!event.data.ok) {
        setError(event.data.error);
        setRepair(event.data.repair ? { ...event.data.repair, applied: false } : null);
        return;
      }
      const result = event.data;
      setOutput(result.output);
      const rollback = result.rolledBack.length
        ? `Skipped because they did not reduce size: ${result.rolledBack.join(", ")}.`
        : null;
      setWarning([result.warning, rollback].filter(Boolean).join(" ") || null);
      setRepair(
        result.repaired
          ? { description: result.repaired.description, line: result.repaired.line, fixed: result.repaired.source, applied: true }
          : null,
      );
      setStats({
        inputChars: pendingSource.current.length,
        inputBytes: bytes(pendingSource.current),
        outputChars: result.output.length,
        outputBytes: bytes(result.output),
        durationMs: result.durationMs,
      });
    };
    worker.onerror = (event) => {
      worker.terminate();
      workerRef.current = null;
      activeRequest.current = null;
      setWorking(false);
      setError(event.message || "Compression worker failed.");
    };
    const request: CompressionRequest = { id, source, mode, options, autoRepair };
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
    link.download = "script.min.luau";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app">
      <section className="editors" aria-label="Lua compressor">
        <div className="editorPanel">
          <div className="editorHeader">
            <label htmlFor="source">Input</label>
            <span>{source ? `${bytes(source).toLocaleString()} B` : ""}</span>
          </div>
          <textarea
            id="source"
            value={source}
            onChange={(event) => {
              setSource(event.target.value);
              invalidateResult();
            }}
            onKeyDown={(event) => {
              // Ctrl+Enter compresses without reaching for the mouse.
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && source.trim() && !working) {
                event.preventDefault();
                compress();
              }
            }}
            spellCheck={false}
            placeholder="Paste code here, or type: run tests"
            autoFocus
          />
        </div>

        <div className={working ? "editorPanel outputPanel panelWorking" : "editorPanel outputPanel"}>
          <div className="editorHeader">
            <label htmlFor="output">Output</label>
            <span className={error ? "panelState panelError" : output ? "panelState panelReady" : "panelState"}>
              {working ? "Validating" : error ? "Error" : output ? "Ready" : ""}
            </span>
          </div>
          <textarea
            id="output"
            className={error ? "outputArea outputError" : output ? "outputArea outputReady" : "outputArea"}
            value={error ?? output}
            readOnly
            spellCheck={false}
            placeholder={working ? "Compressing and validating…" : "Compressed code appears here"}
            aria-invalid={error ? true : undefined}
            aria-busy={working}
          />
        </div>
      </section>

      {stats && (
        <div className="stats" aria-live="polite">
          <span><span className="statsLabel">Before</span>{stats.inputBytes.toLocaleString()} B</span>
          <span><span className="statsLabel">After</span>{stats.outputBytes.toLocaleString()} B</span>
          {stats.inputBytes > 0 && (
            <span className="statsDelta">
              {stats.outputBytes <= stats.inputBytes
                ? `−${Math.round((1 - stats.outputBytes / stats.inputBytes) * 100)}%`
                : `+${Math.round((stats.outputBytes / stats.inputBytes - 1) * 100)}%`}
            </span>
          )}
          <span>{stats.durationMs.toFixed(1)} ms</span>
        </div>
      )}

      {repair && (
        <div className="repair" role="status">
          <span>
            {repair.applied
              ? `Auto Repair ${repair.description}, at line ${repair.line}, then compressed.`
              : `One edit makes this compile: ${repair.description}, at line ${repair.line}.`}
          </span>
          <button
            type="button"
            onClick={() => {
              setSource(repair.fixed);
              invalidateResult();
            }}
          >
            {repair.applied ? "Keep it in the input" : "Apply the fix"}
          </button>
        </div>
      )}

      {warning && <div className="warning" role="status">{warning}</div>}

      {mode !== "safe" && (
        <fieldset className="options" aria-label="Compression passes">
          <legend className="srOnly">Compression passes</legend>
          {optionLabels.map(([key, label, description]) => (
            <label key={key} title={description}>
              <input type="checkbox" checked={options[key]} onChange={() => toggleOption(key)} />
              {label}
            </label>
          ))}
        </fieldset>
      )}

      <div className="actions" aria-label="Actions">
        <div className="modeToggle" role="radiogroup" aria-label="Compression mode">
          {MODES.map(([value, label, description]) => (
            <button
              key={value}
              type="button"
              className={mode === value ? "modeActive" : undefined}
              aria-pressed={mode === value}
              title={description}
              onClick={() => selectMode(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="repairToggle">
          <button
            type="button"
            className={autoRepair ? "modeActive" : undefined}
            aria-pressed={autoRepair}
            title="Apply a single verified fix for an unclosed block or a stray end, then compress."
            onClick={() => { setAutoRepair((on) => !on); invalidateResult(); }}
          >
            Auto Repair
          </button>
        </div>
        <button className={working ? "primary isWorking" : "primary"} onClick={compress} disabled={!source.trim() || working}>
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
