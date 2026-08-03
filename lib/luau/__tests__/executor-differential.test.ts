import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { compressAggressive } from "../compress-aggressive";
import { compressSafe } from "../compress-safe";
import { createOfficialLuau, executeWithOfficialLuau, type LuauModule } from "../official/runtime";
import { withExecutorHarness } from "./executor-harness";
import { executorScenarios } from "./executor-scenarios";
import { largeExecutorScripts } from "./executor-large-scripts";

let module: LuauModule;

beforeAll(async () => {
  const wasm = readFileSync(join(process.cwd(), "public", "wasm", "luau.wasm"));
  module = await createOfficialLuau(new Uint8Array(wasm));
}, 30_000);

// Table/function/thread identities print as raw pointers, which differ run
// to run for reasons unrelated to compression.
function normalize(output: string) {
  return output.replace(/0x[0-9a-f]+/g, "ADDR");
}

function run(source: string) {
  return executeWithOfficialLuau(module, withExecutorHarness(source));
}

describe("executor scripts: differential execution", () => {
  for (const scenario of executorScenarios) {
    it(`${scenario.name}: identical behavior after compression`, () => {
      const before = run(scenario.source);
      expect(before.success, `baseline failed: ${before.error}`).toBe(true);

      const safe = run(compressSafe(scenario.source, "luau"));
      expect(safe.success, `safe output failed: ${safe.error}`).toBe(true);
      expect(normalize(safe.output)).toBe(normalize(before.output));

      const compressed = compressAggressive(scenario.source);
      expect(compressed.ok).toBe(true);
      if (!compressed.ok) return;
      const aggressive = run(compressed.output);
      expect(aggressive.success, `aggressive output failed: ${aggressive.error}`).toBe(true);
      expect(normalize(aggressive.output)).toBe(normalize(before.output));
    });
  }
});

describe("executor scripts: large script differential execution", () => {
  for (const script of largeExecutorScripts) {
    it(`${script.name}: identical behavior after compression`, () => {
      const before = run(script.source);
      expect(before.success, `baseline failed: ${before.error}`).toBe(true);
      expect(before.output.length).toBeGreaterThan(0);

      const safe = run(compressSafe(script.source, "luau"));
      expect(safe.success, `safe output failed: ${safe.error}`).toBe(true);
      expect(normalize(safe.output)).toBe(normalize(before.output));

      const compressed = compressAggressive(script.source);
      expect(compressed.ok).toBe(true);
      if (!compressed.ok) return;
      const aggressive = run(compressed.output);
      expect(aggressive.success, `aggressive output failed: ${aggressive.error}`).toBe(true);
      expect(normalize(aggressive.output)).toBe(normalize(before.output));
      expect(compressed.output.length).toBeLessThan(script.source.length);
    });

    // Eliminating locals on the first pass changes how many short names the
    // renamer hands out on the next one, so a big script can take a second
    // pass to reach a fixed point. It must still converge, never grow, and
    // never change behavior along the way.
    it(`${script.name}: recompression converges without growing`, () => {
      let current = script.source;
      let previousLength = Number.POSITIVE_INFINITY;
      for (let round = 0; round < 4; round += 1) {
        const result = compressAggressive(current);
        expect(result.ok, `round ${round} failed`).toBe(true);
        if (!result.ok) return;
        expect(result.output.length, `round ${round} grew`).toBeLessThanOrEqual(previousLength);
        if (result.output === current) return;
        previousLength = result.output.length;
        current = result.output;
      }
      throw new Error("did not converge within 4 rounds");
    });
  }
});
