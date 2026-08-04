/// <reference lib="webworker" />

import { compressAggressive } from "./compress-aggressive";
import type { CompressionRequest, CompressionResponse } from "./compression-protocol";
import { compressSafe, verifySafeCompression } from "./compress-safe";
import { suggestRepairs } from "./repair";
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

// A repair is only worth offering if the real compiler accepts the result.
// Parsing again proves the edit was understood; compiling proves it was
// right.
function findRepair(module: LuauModule, source: string) {
  for (const repair of suggestRepairs(source)) {
    if (compileWithOfficialLuau(module, repair.fixed).success) {
      return { description: repair.description, line: repair.line, fixed: repair.fixed };
    }
  }
  return undefined;
}

self.onmessage = async (event: MessageEvent<CompressionRequest>) => {
  const request = event.data;
  const started = performance.now();
  let response: CompressionResponse;
  try {
    const aggressive = request.mode === "aggressive";
    const result = aggressive
      ? compressAggressive(request.source, request.options)
      : { ok: true as const, output: compressSafe(request.source) };
    const safeCheck = result.ok && !aggressive
      ? verifySafeCompression(request.source, result.output)
      : { success: true as const };

    if (!result.ok) {
      response = {
        id: request.id,
        ok: false,
        error: result.error.message,
        repair: findRepair(await getOfficialModule(), request.source),
      };
    } else if (!safeCheck.success) {
      response = { id: request.id, ok: false, error: `Token-preservation check failed: ${safeCheck.error}.` };
    } else {
      const module = await getOfficialModule();
      const inputValidation = compileWithOfficialLuau(module, request.source);
      if (!inputValidation.success) {
        response = {
          id: request.id,
          ok: false,
          error: compilerError("input", inputValidation.error),
          repair: findRepair(module, request.source),
        };
      } else {
        const outputValidation = compileWithOfficialLuau(module, result.output);
        response = outputValidation.success
          ? {
              id: request.id,
              ok: true,
              output: result.output,
              warning: result.warning,
              durationMs: performance.now() - started,
              rolledBack: result.rolledBack ?? [],
              aliasGlobalsSaving: result.aliasGlobalsSaving,
            }
          : { id: request.id, ok: false, error: compilerError("output", outputValidation.error) };
      }
    }
  } catch (error) {
    response = { id: request.id, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  self.postMessage(response);
};
