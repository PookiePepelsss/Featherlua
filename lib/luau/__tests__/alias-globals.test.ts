import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { compressAggressive } from "../compress-aggressive";
import { createOfficialLuau, compileWithOfficialLuau, executeWithOfficialLuau, type LuauModule } from "../official/runtime";
import { executorScenarios } from "./executor-scenarios";
import { withExecutorHarness } from "../executor-harness";

let module: LuauModule;

beforeAll(async () => {
  const wasm = readFileSync(join(process.cwd(), "public", "wasm", "luau.wasm"));
  module = await createOfficialLuau(new Uint8Array(wasm));
}, 30_000);

const on = { aliasGlobals: true } as const;

function run(source: string) {
  return executeWithOfficialLuau(module, source);
}

describe("global aliasing", () => {
  it("aliases a global read often enough to pay for itself", () => {
    const source = Array.from({ length: 8 }, (_, i) => `tostring(${i})`).join("\n");
    const result = compressAggressive(`local acc = ""\n${source.split("\n").map((c) => `acc ..= ${c}`).join("\n")}\nprint(acc)`, on);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toMatch(/^local \w+=tostring/);
  });

  it("leaves a global alone when it is assigned anywhere", () => {
    const source = `${Array.from({ length: 8 }, () => "someglobalname()").join("\n")}\nsomeglobalname = nil`;
    const result = compressAggressive(source, on);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).not.toMatch(/^local \w+=someglobalname/);
  });

  // Anything that can reach the global table by another route can replace a
  // global without ever assigning to it here, and the alias would go on
  // holding the old value.
  const RISKY = [
    "print(getfenv(1))",
    "_G.x = 1",
    "print(_G.x)",
    "shared.flag = true",
    "print(getrawmetatable(game))",
    "hookfunction(print, warn)",
    "local f = newcclosure(function() end)",
  ];

  for (const risky of RISKY) {
    it(`does nothing at all alongside ${risky}`, () => {
      const source = `${Array.from({ length: 8 }, () => "tostring(1)").join("\n")}\n${risky}`;
      const result = compressAggressive(source, on);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.output).not.toMatch(/^local \w+=tostring/);
    });
  }

  it("is off by default", () => {
    const source = Array.from({ length: 8 }, () => "tostring(1)").join("\n");
    const result = compressAggressive(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).not.toMatch(/^local \w+=tostring/);
  });

  for (const scenario of executorScenarios) {
    it(`${scenario.name}: aliasing preserves behavior`, () => {
      const before = run(withExecutorHarness(scenario.source));
      expect(before.success, `baseline failed: ${before.error}`).toBe(true);
      const result = compressAggressive(scenario.source, on);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const after = run(withExecutorHarness(result.output));
      expect(after.success, `compressed failed: ${after.error}`).toBe(true);
      expect(after.output.replace(/0x[0-9a-f]+/g, "A")).toBe(before.output.replace(/0x[0-9a-f]+/g, "A"));
    });
  }
});

// Luau caps locals at 200 per function. Synthesized declarations from
// aliasing and string hoisting have to fit in what the script has left, or
// the output stops compiling on exactly the large scripts they help most.
describe("synthesized locals respect the 200 register limit", () => {
  function bigScript(existingLocals: number) {
    const lines: string[] = [];
    for (let i = 0; i < existingLocals; i += 1) lines.push(`local v${i} = {id = ${i}}`);
    for (let i = 0; i < existingLocals; i += 1) lines.push(`print(v${i}.id)`);
    for (let g = 0; g < 40; g += 1) {
      for (let k = 0; k < 6; k += 1) lines.push(`someGlobalFunction${g}("a-long-repeated-string-payload-${g}", ${k})`);
    }
    return lines.join("\n");
  }

  for (const existing of [0, 120, 180, 195, 199]) {
    it(`${existing} existing locals: output still compiles`, () => {
      const source = bigScript(existing);
      expect(compileWithOfficialLuau(module, source).success, "fixture itself must compile").toBe(true);
      const result = compressAggressive(source, on);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const compiled = compileWithOfficialLuau(module, result.output);
      expect(compiled.success, `output rejected: ${compiled.error}`).toBe(true);
    });
  }
});
