/// <reference lib="webworker" />

// Runs the script and its compressed form side by side under the executor
// harness and compares what they printed. This lives in a worker of its
// own, separate from the compression worker, for one reason: a script with
// a loop that never ends will not return from `luau_execute`, and the only
// way out of that is for the page to terminate the whole worker. Losing a
// throwaway worker costs nothing; losing the compression worker would take
// the loaded compiler with it.

import type { BehaviourRequest, BehaviourResponse } from "./behaviour-protocol";
import { harnessLineOffset, withExecutorHarness } from "./executor-harness";
import {
  createOfficialLuau,
  executeWithOfficialLuau,
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

// The runtime numbers its lines against the harness plus the script, so an
// error in line 2 of a three-line script comes back as line 211. The
// traceback below it is all prelude and says nothing to the author, so it
// goes; the line number is shifted back to one they can find.
function readableRuntimeError(detail: string | undefined): string {
  if (!detail) return "unknown error";
  const offset = harnessLineOffset();
  const firstLine = detail.split("\n")[0];
  return firstLine
    .replace(/\bmain:(\d+):/g, (whole, digits: string) => {
      const line = Number(digits) - offset;
      return line > 0 ? `line ${line}:` : whole;
    })
    .trim();
}

/** The first line the two runs disagree on, with a little context. */
function firstDifference(before: string, after: string) {
  const a = before.split("\n");
  const b = after.split("\n");
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if (a[i] === b[i]) continue;
    const where = `line ${i + 1} of what the script printed`;
    if (a[i] === undefined) return `${where}: the original stopped here, the compressed one went on with \`${b[i]}\``;
    if (b[i] === undefined) return `${where}: the compressed one stopped here, the original went on with \`${a[i]}\``;
    return `${where}: original \`${a[i]}\`, compressed \`${b[i]}\``;
  }
  return "the two runs printed the same lines in a different order";
}

self.onmessage = async (event: MessageEvent<BehaviourRequest>) => {
  const request = event.data;
  let response: BehaviourResponse;
  try {
    const module = await getOfficialModule();
    const before = executeWithOfficialLuau(module, withExecutorHarness(request.original));
    if (!before.success) {
      // The harness stubs a great deal but not everything, and a script that
      // will not run under it says nothing about the compression.
      response = {
        id: request.id,
        verdict: "inconclusive",
        detail: `The original does not run under the stubbed executor, so there is nothing to compare against: ${readableRuntimeError(before.error)}`,
      };
    } else {
      const after = executeWithOfficialLuau(module, withExecutorHarness(request.compressed));
      if (!after.success) {
        response = {
          id: request.id,
          verdict: "differs",
          detail: `The original ran and the compressed one did not: ${readableRuntimeError(after.error)}`,
        };
      } else if (after.output !== before.output) {
        response = { id: request.id, verdict: "differs", detail: firstDifference(before.output, after.output) };
      } else {
        response = {
          id: request.id,
          verdict: "same",
          lines: before.output ? before.output.split("\n").length : 0,
        };
      }
    }
  } catch (error) {
    response = {
      id: request.id,
      verdict: "inconclusive",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
  self.postMessage(response);
};
