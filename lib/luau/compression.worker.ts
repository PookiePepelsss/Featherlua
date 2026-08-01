/// <reference lib="webworker" />

import { compressAggressive } from "./compress-aggressive";
import type { CompressionRequest, CompressionResponse } from "./compression-protocol";
import { compressSafe, verifySafeCompression } from "./compress-safe";
import { dialectLabel } from "./dialects";
import {
  compileWithOfficialLuau,
  createOfficialLuau,
  verifyOfficialLuauWasm,
  type LuauModule,
} from "./official/runtime";

let modulePromise: Promise<LuauModule> | undefined;

function getOfficialModule() {
  modulePromise ??= fetch("/wasm/luau.wasm")
    .then((response) => {
      if (!response.ok) throw new Error(`Unable to load official Luau compiler (${response.status}).`);
      return response.arrayBuffer();
    })
    .then(async (buffer) => {
      const wasm = new Uint8Array(buffer);
      await verifyOfficialLuauWasm(wasm);
      return createOfficialLuau(wasm);
    });
  return modulePromise;
}

function compilerError(kind: "input" | "output", detail?: string) {
  return `Official Luau compiler rejected the ${kind}: ${detail ?? "unknown compiler error"}`;
}

self.onmessage = async (event: MessageEvent<CompressionRequest>) => {
  const request = event.data;
  const started = performance.now();
  let response: CompressionResponse;
  try {
    const aggressive = request.mode === "aggressive" && request.dialect === "luau";
    const result = aggressive
      ? compressAggressive(request.source, request.options)
      : { ok: true as const, output: compressSafe(request.source, request.dialect) };
    const safeCheck = result.ok && !aggressive
      ? verifySafeCompression(request.source, result.output, request.dialect)
      : { success: true as const };

    if (!result.ok) {
      response = { id: request.id, ok: false, error: result.error.message };
    } else if (!safeCheck.success) {
      response = {
        id: request.id,
        ok: false,
        error: `${dialectLabel(request.dialect)} token-preservation check failed: ${safeCheck.error}.`,
      };
    } else if (request.dialect === "luau") {
      const module = await getOfficialModule();
      const inputValidation = compileWithOfficialLuau(module, request.source);
      if (!inputValidation.success) {
        response = { id: request.id, ok: false, error: compilerError("input", inputValidation.error) };
      } else {
        const outputValidation = compileWithOfficialLuau(module, result.output);
        response = outputValidation.success
          ? {
              id: request.id,
              ok: true,
              output: result.output,
              warning: result.warning,
              durationMs: performance.now() - started,
              validation: "official-luau",
              rolledBack: result.rolledBack ?? [],
            }
          : { id: request.id, ok: false, error: compilerError("output", outputValidation.error) };
      }
    } else {
      response = {
        id: request.id,
        ok: true,
        output: result.output,
        warning: `${dialectLabel(request.dialect)} uses lossless lexical compression with token-preservation checks; test the result in the target runtime.`,
        durationMs: performance.now() - started,
        validation: "lexical",
        rolledBack: [],
      };
    }
  } catch (error) {
    response = { id: request.id, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  self.postMessage(response);
};
