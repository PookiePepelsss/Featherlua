"use client";

import { useEffect, useId, useRef, useState } from "react";
import { DEFAULT_AGGRESSIVE_OPTIONS, type AggressiveOptions } from "@/lib/luau/compress-aggressive";
import type { CompressionMode, CompressionRequest, CompressionResponse } from "@/lib/luau/compression-protocol";
import { DIALECTS, type LuaDialect } from "@/lib/luau/dialects";

interface Stats {
  inputChars: number;
  inputBytes: number;
  outputChars: number;
  outputBytes: number;
  durationMs: number;
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

interface DialectDropdownProps {
  value: LuaDialect;
  onChange: (value: LuaDialect) => void;
}

function DialectDropdown({ value, onChange }: DialectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(() => DIALECTS.findIndex((item) => item.value === value));
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listId = useId();
  const selected = DIALECTS.find((item) => item.value === value) ?? DIALECTS[0];

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  function focusOption(index: number) {
    const next = (index + DIALECTS.length) % DIALECTS.length;
    setHighlighted(next);
    requestAnimationFrame(() => optionRefs.current[next]?.focus());
  }

  function choose(next: LuaDialect) {
    onChange(next);
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <div className="dialectPicker" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={open ? "dialectTrigger dialectOpen" : "dialectTrigger"}
        aria-label="Language version"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) focusOption(DIALECTS.findIndex((item) => item.value === value));
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            focusOption(DIALECTS.findIndex((item) => item.value === value));
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      >
        <span>{selected.label}</span>
        <span className="dialectChevron" aria-hidden="true" />
      </button>
      <div id={listId} className={open ? "dialectMenu menuOpen" : "dialectMenu"} role="listbox" aria-label="Language version">
        {DIALECTS.map((item, index) => (
          <button
            key={item.value}
            ref={(element) => { optionRefs.current[index] = element; }}
            type="button"
            role="option"
            aria-selected={item.value === value}
            className={index === highlighted ? "dialectOption optionHighlighted" : "dialectOption"}
            tabIndex={open ? 0 : -1}
            style={{ "--option-index": index } as React.CSSProperties}
            onMouseEnter={() => setHighlighted(index)}
            onClick={() => choose(item.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                focusOption(index + 1);
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                focusOption(index - 1);
              } else if (event.key === "Home" || event.key === "End") {
                event.preventDefault();
                focusOption(event.key === "Home" ? 0 : DIALECTS.length - 1);
              } else if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                choose(item.value);
              } else if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
                triggerRef.current?.focus();
              } else if (event.key === "Tab") {
                setOpen(false);
              }
            }}
          >
            <span className="optionMark" aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

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
  const activeRequest = useRef<number | null>(null);
  const pendingSource = useRef("");
  const requestId = useRef(0);

  useEffect(() => () => workerRef.current?.terminate(), []);

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
        return;
      }
      const result = event.data;
      setOutput(result.output);
      const rollback = result.rolledBack.length
        ? `Skipped because they did not reduce size: ${result.rolledBack.join(", ")}.`
        : null;
      setWarning([result.warning, rollback].filter(Boolean).join(" ") || null);
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
            spellCheck={false}
            placeholder="Paste code here"
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
        <DialectDropdown
          value={dialect}
          onChange={(next) => {
            setDialect(next);
            if (next !== "luau") setMode("safe");
            invalidateResult();
          }}
        />
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
