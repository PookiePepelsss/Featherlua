import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { compressAggressive } from "../compress-aggressive";
import {
  compileWithOfficialLuau,
  createOfficialLuau,
  executeWithOfficialLuau,
  type LuauModule,
} from "../official/runtime";
import { corpusScenarios } from "./corpus-scenarios";

let module: LuauModule;

beforeAll(async () => {
  const wasm = readFileSync(join(process.cwd(), "public", "wasm", "luau.wasm"));
  module = await createOfficialLuau(new Uint8Array(wasm));
}, 30_000);

describe("official Luau compiler and differential execution", () => {
  it("rejects invalid syntax and accepts valid compressed output", () => {
    expect(compileWithOfficialLuau(module, "local =").success).toBe(false);
    const result = compressAggressive("local longName=20+22\nprint(longName)");
    expect(result.ok).toBe(true);
    if (result.ok) expect(compileWithOfficialLuau(module, result.output).success).toBe(true);
  });

  for (const scenario of corpusScenarios.slice(0, 10)) {
    it(`preserves runtime output: ${scenario.name}`, () => {
      const compressed = compressAggressive(scenario.source);
      expect(compressed.ok).toBe(true);
      if (!compressed.ok) return;
      const originalRun = executeWithOfficialLuau(module, scenario.source);
      const compressedRun = executeWithOfficialLuau(module, compressed.output);
      expect(originalRun.success, originalRun.error).toBe(true);
      expect(compressedRun.success, compressedRun.error).toBe(true);
      expect(compressedRun.output).toBe(originalRun.output);
    });
  }
});
