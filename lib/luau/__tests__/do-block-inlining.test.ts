import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { compressAggressive } from "../compress-aggressive";
import { createOfficialLuau, executeWithOfficialLuau, type LuauModule } from "../official/runtime";

let module: LuauModule;

beforeAll(async () => {
  const wasm = readFileSync(join(process.cwd(), "public", "wasm", "luau.wasm"));
  module = await createOfficialLuau(new Uint8Array(wasm));
}, 30_000);

function output(source: string) {
  const result = compressAggressive(source);
  expect(result.ok).toBe(true);
  return result.ok ? result.output : "";
}

describe("do-blocks are inlined only when they bind nothing", () => {
  it("a wrapper with no declarations disappears", () => {
    expect(output("do print(1) end")).toBe("print(1)");
  });

  it("a wrapper holding a local keeps its scope", () => {
    // A literal init would be propagated away and the wrapper would then
    // legitimately inline, so this uses one constant propagation leaves alone.
    expect(output("do local x = {} print(x) end print(2)")).toBe("do local a={}print(a)end print(2)");
  });

  it("a wrapper holding a local function keeps its scope", () => {
    expect(output("do local function f() return 1 end print(f()) end print(2)"))
      .toBe("do local function a()return 1 end print(a())end print(2)");
  });

  it("a trailing return is not lifted into the middle of a block", () => {
    const result = output("local function f() do return 1 end print(2) end print(f())");
    expect(result).toContain("do return 1 end");
  });

  it("a trailing return is lifted when the wrapper ends the block", () => {
    expect(output("local function f() do return 1 end end print(f())"))
      .toBe("local function a()return 1 end print(a())");
  });
});

describe("inlining a do-block never changes what runs", () => {
  const SCRIPTS = [
    "do print(1) end print(2)",
    "do local x = 1 print(x) end local x = 2 print(x)",
    "local v = 1 do v = v + 1 end print(v)",
    "local function f() do return 1 end print(2) end print(f())",
    "for i = 1, 2 do do print(i) end end",
    "if true then print('a') else print('b') end print('c')",
    "local t = {} do t.k = 1 end print(t.k)",
    "do local a = 1 do local a = 2 print(a) end print(a) end",
  ];

  for (const source of SCRIPTS) {
    it(`${source}`, () => {
      const before = executeWithOfficialLuau(module, source);
      expect(before.success, `baseline failed: ${before.error}`).toBe(true);
      const after = executeWithOfficialLuau(module, output(source));
      expect(after.success, `compressed failed: ${after.error}`).toBe(true);
      expect(after.output).toBe(before.output);
    });
  }
});
