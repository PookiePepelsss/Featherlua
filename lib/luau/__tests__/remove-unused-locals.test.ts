import { describe, expect, it } from "vitest";
import { compressAggressive } from "../compress-aggressive";
import { parse } from "../parser";

function output(source: string): string {
  const result = compressAggressive(source);
  if (!result.ok) throw new Error(`expected ok:true, got error: ${result.error.message}`);
  return result.output;
}

describe("remove-unused-locals: removes genuinely unused declarations", () => {
  it("removes an unused local with a literal initializer", () => {
    expect(output("local unused = 5\nprint(1)")).toBe("print(1)");
  });

  it("removes an unused local function definition entirely (body never executes)", () => {
    expect(output('local function unused() print("side effect") end\nprint(1)')).toBe("print(1)");
  });

  it("removes an unused local whose initializer is a pure table constructor", () => {
    expect(output("local unused = {1, 2, 3}\nprint(1)")).toBe("print(1)");
  });

  it("removes an unused local whose initializer is a function expression", () => {
    expect(output("local unused = function() end\nprint(1)")).toBe("print(1)");
  });

  it("removes chains: unused b makes a unused on the next round", () => {
    // `a` is referenced (by b's init) on the first scan, so it survives
    // round 1; only after b is dropped does a's reference count hit zero.
    expect(output("local a = {1}\nlocal b = a\nprint(1)")).toBe("print(1)");
  });

  it("cleans up nested scopes and closures", () => {
    expect(output("local function f() local unused = 5 print(1) end\nf()")).toBe(
      "local function a()print(1)end a()",
    );
  });
});

describe("remove-unused-locals: safety boundaries", () => {
  it("never removes a <close> local even if unreferenced (scope-exit is a real side effect)", () => {
    const result = compressAggressive("local guard <close> = acquire()\nprint(1)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("<close>");
  });

  it("never removes a local whose initializer could error or have a side effect (a call)", () => {
    const result = compressAggressive("local x = riskyCall()\nprint(1)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("riskyCall(");
  });

  it("never removes a local whose initializer could error on incompatible types (arithmetic)", () => {
    const result = compressAggressive("local x = a + b\nprint(1)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("a+b");
  });

  it("never removes a local with multiple names (multi-value truncation/assignment semantics)", () => {
    const result = compressAggressive("local x, y = 1, 2\nprint(x)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // y is unused but the statement must survive as-is (can't safely drop
    // just one name from a multi-value local list).
    expect(result.output).toMatch(/local \w,\w=1,2/);
  });

  it("never drops extra discarded init expressions even for a single name (they may have side effects)", () => {
    // `local x = f(), g()` still calls g() for its side effect even though
    // only f()'s result is kept -- must not be treated as a simple/unused
    // single-init candidate.
    const result = compressAggressive("local x = f(), g()\nprint(1)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("g(");
  });

  it("a table constructor with an impure field is not considered pure", () => {
    const result = compressAggressive("local x = {sideEffect()}\nprint(1)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("sideEffect(");
  });

  it("does not remove a used local", () => {
    // A table constructor (not a scalar literal) so propagation doesn't
    // separately inline-and-remove it -- isolates this pass's own
    // "referenced, so keep it" behavior from propagation's.
    expect(output("local x = {1}\nprint(x)")).toBe("local a={1}print(a)");
  });

  it("a recursive-only local function (never called from outside) is conservatively kept", () => {
    // Its own recursive self-calls count as "references" under this pass's
    // simple counting -- a known, deliberately accepted conservative limit
    // (missing an optimization is safe; removing something live is not).
    const result = compressAggressive("local function fib(n) if n < 2 then return n end return fib(n-1)+fib(n-2) end");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output.length).toBeGreaterThan(0);
  });
});

describe("remove-unused-locals: output remains valid Luau", () => {
  it("re-parses cleanly after combined removal", () => {
    const source = `
      local unused1 = 5
      local unused2 = {1, 2}
      local function unusedFn() end
      local used = 10
      print(used)
    `;
    const result = compressAggressive(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(() => parse(result.output)).not.toThrow();
  });
});
