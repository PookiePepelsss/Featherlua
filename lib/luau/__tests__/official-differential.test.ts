import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { compressAggressive } from "../compress-aggressive";
import {
  compileWithOfficialLuau,
  createOfficialLuau,
  executeWithOfficialLuau,
  verifyOfficialLuauWasm,
  type LuauModule,
} from "../official/runtime";
import { corpusScenarios } from "./corpus-scenarios";

let module: LuauModule;

beforeAll(async () => {
  const wasm = readFileSync(join(process.cwd(), "public", "wasm", "luau.wasm"));
  await verifyOfficialLuauWasm(new Uint8Array(wasm));
  module = await createOfficialLuau(new Uint8Array(wasm));
}, 30_000);

describe("official Luau compiler and differential execution", () => {
  it("rejects a modified compiler binary", async () => {
    const changed = new Uint8Array([0, 97, 115, 109]);
    await expect(verifyOfficialLuauWasm(changed)).rejects.toThrow("integrity check failed");
  });

  it("rejects invalid syntax and accepts valid compressed output", () => {
    expect(compileWithOfficialLuau(module, "local =").success).toBe(false);
    const result = compressAggressive("local longName=20+22\nprint(longName)");
    expect(result.ok).toBe(true);
    if (result.ok) expect(compileWithOfficialLuau(module, result.output).success).toBe(true);
  });

  it("preserves shorthand calls, table keys, and type-exposed folds", () => {
    const source = `
      local function id(value) return value end
      local receiver = {}
      function receiver:take(value) return value end
      local item = id({["name"] = 3})
      print(id("payload"), receiver:take("method"), item.name, (1 :: number) + 2)
    `;
    const compressed = compressAggressive(source);
    expect(compressed.ok).toBe(true);
    if (!compressed.ok) return;
    expect(compressed.output).toMatch(/[A-Za-z]"payload"/);
    expect(compressed.output).toContain("{name=3}");
    const originalRun = executeWithOfficialLuau(module, source);
    const compressedRun = executeWithOfficialLuau(module, compressed.output);
    expect(originalRun.success, originalRun.error).toBe(true);
    expect(compressedRun.success, compressedRun.error).toBe(true);
    expect(compressedRun.output).toBe(originalRun.output);
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
