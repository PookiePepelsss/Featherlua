import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { compressAggressive } from "../compress-aggressive";
import { compileWithOfficialLuau, createOfficialLuau, executeWithOfficialLuau, type LuauModule } from "../official/runtime";

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

// A nested scope may reuse an outer name whenever the outer binding is not
// read anywhere inside: shadowing something nothing looks at cannot be
// observed. Allocating around only the bindings that are actually live is
// what keeps a large chunk on single-character names instead of spilling
// into two once it has more than 52 locals.
describe("names are reused wherever the outer binding is not read", () => {
  it("a parameter takes the enclosing function's own name when it does not recurse", () => {
    expect(output("local function f(x) return x end return f(1)")).toBe("local function a(a)return a end return a(1)");
  });

  it("a recursive function keeps its name distinct from its parameter", () => {
    const result = output("local function f(n) if n <= 0 then return 0 end return f(n - 1) end return f(3)");
    expect(result).toBe("local function a(b)if b<=0 then return 0 end return a(b-1)end return a(3)");
  });

  it("a closure cannot take the name of an outer local it reads", () => {
    // `outer` is read inside, so the parameter cannot have its name; the
    // function's own name is free inside because nothing there calls it.
    const result = output("local outer = {} local function g(inner) return outer, inner end return g(1)");
    expect(result).toBe("local a={}local function b(b)return a,b end return b(1)");
  });

  it("sibling scopes independently reuse the same names", () => {
    const source = "local base = {}\nlocal function one(p) return p end\nlocal function two(q) return q end\nreturn base, one(1), two(2)";
    const result = output(source);
    expect(result).toBe("local a={}local function b(a)return a end local function c(a)return a end return a,b(1),c(2)");
  });
});

describe("reused names never change behavior", () => {
  const SCRIPTS = [
    "local o = 1 local function f(x) return x end print(f(2), o)",
    "local o = 1 local function f(x) return x + o end print(f(2), o)",
    "local acc = {} for i = 1, 3 do acc[i] = function() return i end end print(acc[1](), acc[3]())",
    "local n = 5 local function outer() local n = 6 local function inner() return n end return inner() end print(outer(), n)",
    "local t = {v = 1} function t:m() local t = 2 return self.v + t end print(t:m())",
    "local up = 0 local function bump() up = up + 1 return up end bump() bump() print(up)",
    "local a = 1 do local a = 2 do local a = 3 print(a) end print(a) end print(a)",
    "local function fact(n) if n <= 1 then return 1 end return n * fact(n - 1) end print(fact(5))",
    "local x = 10 local f = function(x) return function(x) return x end end print(f(1)(2), x)",
    "local shared = 7 local function a() return shared end local function b(shared) return shared end print(a(), b(1))",
  ];

  for (const source of SCRIPTS) {
    it(source.slice(0, 60), () => {
      const before = executeWithOfficialLuau(module, source);
      expect(before.success, `baseline failed: ${before.error}`).toBe(true);
      const after = executeWithOfficialLuau(module, output(source));
      expect(after.success, `compressed failed: ${after.error}`).toBe(true);
      expect(after.output).toBe(before.output);
    });
  }
});

// Also from the real-script corpus: a 759KB decompiled file whose worst
// function already held over 200 live locals. Luau draws locals and the
// temporaries every expression needs from one pool of 200 registers, so a
// pass that adds locals to a body already near the limit produces output
// the compiler refuses even though the input compiled.
describe("synthesized locals leave room for the registers Luau needs to compute with", () => {
  function functionWith(locals: number, repeatedStrings: number) {
    const lines = ["local function crowded()"];
    for (let i = 0; i < locals; i += 1) lines.push(`\tlocal v${i} = {n = ${i}}`);
    for (let g = 0; g < repeatedStrings; g += 1) {
      for (let k = 0; k < 5; k += 1) lines.push(`\tsend("a-long-repeated-payload-${g}", ${k})`);
    }
    lines.push("\treturn v0", "end", "return crowded");
    return lines.join("\n");
  }

  for (const locals of [0, 100, 170, 190]) {
    it(`${locals} locals already in the function: output still compiles`, () => {
      const source = functionWith(locals, 30);
      expect(compileWithOfficialLuau(module, source).success, "fixture must compile").toBe(true);
      const result = compressAggressive(source);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const compiled = compileWithOfficialLuau(module, result.output);
      expect(compiled.success, `output rejected: ${compiled.error}`).toBe(true);
    });
  }

  it("counts locals in nested blocks, not just the function's top level", () => {
    // Locals inside a loop body are live alongside everything around them,
    // so a budget that only looked at the top block saw a nearly empty
    // function and filled it past the limit.
    const lines = ["local function crowded()", "\tfor i = 1, 10 do"];
    for (let i = 0; i < 185; i += 1) lines.push(`\t\tlocal v${i} = {n = ${i}}`);
    for (let g = 0; g < 30; g += 1) {
      for (let k = 0; k < 5; k += 1) lines.push(`\t\tsend("a-long-repeated-payload-${g}", ${k})`);
    }
    lines.push("\tend", "end", "return crowded");
    const source = lines.join("\n");
    expect(compileWithOfficialLuau(module, source).success, "fixture must compile").toBe(true);
    const result = compressAggressive(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const compiled = compileWithOfficialLuau(module, result.output);
    expect(compiled.success, `output rejected: ${compiled.error}`).toBe(true);
  });
});
