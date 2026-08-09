import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { compressAggressive, DEFAULT_AGGRESSIVE_OPTIONS, type AggressiveOptions } from "../compress-aggressive";
import { createOfficialLuau, executeWithOfficialLuau, type LuauModule } from "../official/runtime";
import { withExecutorHarness } from "../executor-harness";
import { executorScenarios } from "./executor-scenarios";
import { largeExecutorScripts } from "./executor-large-scripts";

let module: LuauModule;

beforeAll(async () => {
  const wasm = readFileSync(join(process.cwd(), "public", "wasm", "luau.wasm"));
  module = await createOfficialLuau(new Uint8Array(wasm));
}, 30_000);

const OPTION_KEYS = Object.keys(DEFAULT_AGGRESSIVE_OPTIONS) as (keyof AggressiveOptions)[];

function normalize(output: string) {
  return output.replace(/0x[0-9a-f]+/g, "ADDR");
}

// The default settings are only one point in the option space: the UI lets
// every pass be toggled, and the auto-rollback search runs the compressor
// again with individual passes disabled looking for smaller output. Each of
// those configurations has to preserve behavior on its own, including the
// ones where a pass runs without the passes that usually clean up after it.
describe("every pass configuration preserves behavior", () => {
  for (const script of [...executorScenarios, ...largeExecutorScripts]) {
    it(`${script.name}: all pass configurations behave identically`, () => {
      const before = executeWithOfficialLuau(module, withExecutorHarness(script.source));
      expect(before.success, `baseline failed: ${before.error}`).toBe(true);

      const configurations: [string, Partial<AggressiveOptions>][] = [["defaults", {}]];
      for (const key of OPTION_KEYS) {
        configurations.push([`without ${key}`, { [key]: false }]);
        configurations.push([
          `only ${key}`,
          Object.fromEntries(OPTION_KEYS.map((other) => [other, other === key])) as Partial<AggressiveOptions>,
        ]);
      }

      const failures: string[] = [];
      for (const [label, options] of configurations) {
        const result = compressAggressive(script.source, options);
        if (!result.ok) {
          failures.push(`${label}: ${result.error.message}`);
          continue;
        }
        const after = executeWithOfficialLuau(module, withExecutorHarness(result.output));
        if (!after.success || normalize(after.output) !== normalize(before.output)) {
          failures.push(`${label}: ${after.error ?? "output differs"}`);
        }
      }
      expect(failures).toEqual([]);
    });
  }
});
