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
import { executorScenarios } from "./executor-scenarios";

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

  it("preserves RemoteEvent and RemoteFunction argument order and values", () => {
    const source = `
      local remote = {}
      function remote:FireServer(...)
        local count = select("#", ...)
        local action, amount, missing, data = ...
        print(count, action, amount, missing == nil, data.slot, data.enabled)
      end
      function remote:InvokeServer(action, data, enabled)
        return action, data.id, enabled
      end
      remote:FireServer("equip", 42, nil, {slot = 3, enabled = true})
      print(remote:InvokeServer("lookup", {id = 7}, true))
    `;
    const compressed = compressAggressive(source);
    expect(compressed.ok).toBe(true);
    if (!compressed.ok) return;
    const originalRun = executeWithOfficialLuau(module, source);
    const compressedRun = executeWithOfficialLuau(module, compressed.output);
    expect(originalRun.success, originalRun.error).toBe(true);
    expect(compressedRun.success, compressedRun.error).toBe(true);
    expect(compressedRun.output).toBe(originalRun.output);
  });

  for (const scenario of executorScenarios) {
    it(`official compiler accepts executor fixture: ${scenario.name}`, () => {
      expect(compileWithOfficialLuau(module, scenario.source).success).toBe(true);
      const compressed = compressAggressive(scenario.source);
      expect(compressed.ok).toBe(true);
      if (compressed.ok) expect(compileWithOfficialLuau(module, compressed.output).success).toBe(true);
    });
  }

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

// Found by fuzzing. `f"s"` and `f{...}` need no brackets, so the printer
// dropped them around a lone interpolated string too. Luau's grammar does
// not allow that and its compiler rejects `f`s``, but ours parsed it, so
// the self-check waved the output through and only the real compiler
// noticed. The parser now refuses it as well, which is what keeps the
// self-check able to catch this in future.
describe("an interpolated string as the only call argument", () => {
  const CASES = [
    "print(`hello`)",
    "local n = 4 print(`value {n}`)",
    "local o = { m = function(_, s) return s end } print(o:m(`hi`))",
    "local t = {} t[1] = tostring(`a {1 + 1} b`) print(t[1])",
    "for i = 1, 2 do print(`row {i}`) end",
  ];

  for (const source of CASES) {
    it(source, () => {
      const result = compressAggressive(source);
      expect(result.ok, result.ok ? "" : result.error.message).toBe(true);
      if (!result.ok) return;

      const compiled = compileWithOfficialLuau(module, result.output);
      expect(compiled.success, `output rejected by the real compiler: ${compiled.error}`).toBe(true);
      // The opening backtick must still sit behind a bracket. The bug
      // printed `tostring`txt`` with the bracket gone.
      expect(result.output, "brackets were dropped around a backtick string").toMatch(/\(`/);

      const before = executeWithOfficialLuau(module, source);
      const after = executeWithOfficialLuau(module, result.output);
      expect(after.success).toBe(true);
      expect(after.output).toBe(before.output);
    });
  }
});
