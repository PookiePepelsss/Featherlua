/// <reference lib="webworker" />

import { compressAggressive } from "./compress-aggressive";
import type { CompressionRequest, CompressionResponse } from "./compression-protocol";
import { compressSafe, verifySafeCompression } from "./compress-safe";
import { suggestRepairs } from "./repair";
import { runSelfTest, SELF_TEST_COMMAND } from "./self-test";
import { isRuntimeCollapse, loadOnce } from "./official/module-cache";
import {
  compileWithOfficialLuau,
  createOfficialLuau,
  verifyOfficialLuauWasm,
  type LuauModule,
} from "./official/runtime";

// Remembered once loaded, forgotten if it fails, so pressing Compress
// again after a network blip actually tries again.
const officialModule = loadOnce(async (): Promise<LuauModule> => {
  const response = await fetch("/wasm/luau.wasm");
  if (!response.ok) {
    throw new Error(`Unable to load the official Luau compiler (${response.status}). Check your connection and press Compress again.`);
  }
  const wasm = new Uint8Array(await response.arrayBuffer());
  await verifyOfficialLuauWasm(wasm);
  return createOfficialLuau(wasm);
});

const getOfficialModule = () => officialModule.get();

// The compiler runs in a fixed amount of WebAssembly memory: the binary
// declares 32MB to start and 512MB at most, and the glue around it refuses
// to grow past that. Exhausting it does not report a problem, it aborts
// the whole instance, which then fails every call after it. Saying "memory
// access out of bounds" tells nobody anything, and keeping the dead
// instance meant one oversized script broke the tab until it was reloaded.
//
// Measured, a script of ordinary density stops fitting a little past a
// megabyte. What is in it matters as much as how long it is, so the figure
// below is offered as roughly where the wall is rather than as a rule.
function ranOutOfMemory(source: string): string {
  const megabytes = (new TextEncoder().encode(source).length / 1048576).toFixed(2);
  return (
    `The official Luau compiler ran out of memory on this script (${megabytes} MB). It runs inside the page in a ` +
    "fixed amount of memory, and in practice scripts stop fitting somewhere around a megabyte, depending on what " +
    "is in them. The compiler has been reloaded, so anything smaller will work again."
  );
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
  let repairWasDeclined = false;
  try {
    const module = await getOfficialModule();

    // A command rather than a script. `run tests` checks this build of the
    // compressor against the official compiler and reports back in the
    // output box. It is not valid Luau, so nothing can be shadowed by it.
    if (SELF_TEST_COMMAND.test(request.source)) {
      const report = runSelfTest(module);
      self.postMessage({
        id: request.id,
        ok: true,
        output: report.text,
        warning: report.failed ? `${report.failed} self-check(s) failed. This build is not behaving correctly.` : undefined,
        durationMs: performance.now() - started,
        rolledBack: [],
      } satisfies CompressionResponse);
      return;
    }

    // With Auto Repair on, a script the compiler will not accept gets one
    // verified edit applied before anything else runs, so the rest of the
    // pipeline sees a script that compiles. The edit is reported alongside
    // the result rather than folded in silently.
    let source = request.source;
    let repaired: { description: string; line: number; source: string } | undefined;
    if (request.autoRepair && !compileWithOfficialLuau(module, source).success) {
      const repair = findRepair(module, source);
      if (repair) {
        source = repair.fixed;
        repaired = { description: repair.description, line: repair.line, source: repair.fixed };
      } else {
        // Saying nothing here reads as Auto Repair being broken rather than
        // as it having looked and declined, which is the honest outcome for
        // anything with more than one sensible reading.
        repairWasDeclined = true;
      }
    }

    // Safe is the only mode that keeps the token stream, so it is the only
    // one the token-preservation check applies to. Medium and Aggressive
    // both run the AST pipeline and differ only in which passes are on.
    const parsing = request.mode !== "safe";
    const result = parsing
      ? compressAggressive(source, request.options)
      : { ok: true as const, output: compressSafe(source) };
    const safeCheck = result.ok && !parsing
      ? verifySafeCompression(source, result.output)
      : { success: true as const };

    if (!result.ok) {
      response = {
        id: request.id,
        ok: false,
        error: result.error.message,
        repair: findRepair(module, source),
      };
    } else if (!safeCheck.success) {
      response = { id: request.id, ok: false, error: `Token-preservation check failed: ${safeCheck.error}.` };
    } else {
      const inputValidation = compileWithOfficialLuau(module, source);
      if (!inputValidation.success) {
        response = {
          id: request.id,
          ok: false,
          error: compilerError("input", inputValidation.error),
          repair: findRepair(module, source),
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
              repaired,
            }
          : { id: request.id, ok: false, error: compilerError("output", outputValidation.error) };
      }
    }
  } catch (error) {
    if (isRuntimeCollapse(error)) {
      // The instance is past saving; drop it so the next press gets a new one.
      officialModule.forget();
      response = { id: request.id, ok: false, error: ranOutOfMemory(request.source) };
    } else {
      response = { id: request.id, ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
  // Auto Repair saying nothing at all reads as it being broken rather than
  // as it having looked and declined, so the outcome is reported wherever
  // the failure happened to come from.
  if (!response.ok && repairWasDeclined) {
    response = { ...response, error: `${response.error}

Auto Repair looked at this and did not find a single unambiguous fix, so it changed nothing. It only handles an unclosed block, a missing then/do, an unclosed bracket, a missing comma, or one end too many.` };
  }
  self.postMessage(response);
};
