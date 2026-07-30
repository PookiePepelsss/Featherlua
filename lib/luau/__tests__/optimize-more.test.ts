import { describe, expect, it } from "vitest";
import { compressAggressive } from "../compress-aggressive";
import { parse } from "../parser";

// removeUnusedLocals is disabled here: these tests use minimal `local x =
// ...` snippets with no subsequent read, specifically to test folding in
// isolation. See remove-unused-locals.test.ts for that pass.
function output(source: string): string {
  const result = compressAggressive(source, { removeUnusedLocals: false });
  if (!result.ok) throw new Error(`expected ok:true, got error: ${result.error.message}`);
  return result.output;
}

describe("optimize: logical short-circuit folding (and/or return an OPERAND, not true/false)", () => {
  it("`false and X` folds to the falsy left operand itself, not `false`", () => {
    expect(output("local x = nil and print(1)")).toBe("local a=nil");
  });

  it("`true and X` folds to X (evaluated)", () => {
    expect(output("local x = true and 5")).toBe("local a=5");
  });

  it("`true or X` folds to the truthy left operand itself", () => {
    expect(output("local x = 5 or print(1)")).toBe("local a=5");
  });

  it("`false or X` folds to X", () => {
    expect(output("local x = false or 5")).toBe("local a=5");
  });

  it("0 and \"\" are truthy in Lua, unlike JS -- must not be folded as falsy", () => {
    expect(output("local x = 0 and 5")).toBe("local a=5");
    expect(output('local x = "" and 5')).toBe("local a=5");
  });

  it("does not evaluate or drop a non-literal right side's potential side effects", () => {
    // `f()` must remain in the output since Lua would actually call it
    // when the left side is truthy.
    const result = compressAggressive("local x = true and f()");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("f(");
  });
});

describe("optimize: `not` folding on literals", () => {
  it("folds not true/false/nil/truthy-literal", () => {
    expect(output("local x = not true")).toBe("local a=false");
    expect(output("local x = not false")).toBe("local a=true");
    expect(output("local x = not nil")).toBe("local a=true");
    expect(output("local x = not 0")).toBe("local a=false"); // 0 is truthy in Lua
  });
});

describe("optimize: comparison folding", () => {
  it("folds numeric ordering comparisons", () => {
    expect(output("local x = 1 < 2")).toBe("local a=true");
    expect(output("local x = 2 <= 2")).toBe("local a=true");
    expect(output("local x = 3 > 5")).toBe("local a=false");
    expect(output("local x = 5 >= 5")).toBe("local a=true");
  });

  it("folds equality between literals of the same type", () => {
    expect(output("local x = 1 == 1")).toBe("local a=true");
    expect(output("local x = 1 == 2")).toBe("local a=false");
    expect(output("local x = 1 ~= 2")).toBe("local a=true");
    expect(output("local x = true == true")).toBe("local a=true");
    expect(output("local x = nil == nil")).toBe("local a=true");
  });

  it("folds equality between literals of DIFFERENT types (never coerced in Lua)", () => {
    expect(output("local x = 1 == \"1\"")).toBe("local a=false");
    expect(output("local x = nil == false")).toBe("local a=false");
    expect(output("local x = 1 ~= \"1\"")).toBe("local a=true");
  });

  it("does NOT fold string==string (would need escape-aware decoding to be safe)", () => {
    const result = compressAggressive('local x = "a" == "a"');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("==");
  });

  it("does NOT fold ordering comparisons between mismatched types (that's a Lua runtime error, not a boolean)", () => {
    const result = compressAggressive('local x = a\nlocal y = 1 < a');
    expect(result.ok).toBe(true);
  });
});

describe("optimize: string literal concatenation", () => {
  it("folds two same-quote string literals via raw splicing", () => {
    expect(output('local x = "hello, " .. "world"')).toBe('local a="hello, world"');
    expect(output("local x = 'a' .. 'b'")).toBe("local a='ab'");
  });

  it("folds a chain of concatenations bottom-up", () => {
    expect(output('local x = "a" .. "b" .. "c"')).toBe('local a="abc"');
  });

  it("preserves escape sequences verbatim through the splice (no decoding needed)", () => {
    expect(output('local x = "a\\n" .. "b"')).toBe('local a="a\\nb"');
  });

  it("does not fold mismatched quote characters", () => {
    const result = compressAggressive("local x = \"a\" .. 'b'");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("..");
  });

  it("does not fold long-bracket strings", () => {
    const result = compressAggressive('local x = [[a]] .. [[b]]');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("..");
  });

  it("does not fold number..string (needs Lua's exact tostring formatting, not attempted)", () => {
    const result = compressAggressive('local x = 1 .. "a"');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("..");
  });
});

describe("optimize: folded literal-condition comparisons feed dead-branch elimination", () => {
  it("`if 1 < 2 then` becomes `do...end`", () => {
    expect(output("if 1 < 2 then print(1) end")).toBe("do print(1)end");
  });

  it("propagated + compared: `local MAX = 10; if MAX > 5 then ... end` eliminates fully", () => {
    expect(output("local MAX = 10\nif MAX > 5 then print(1) end")).toBe("do print(1)end");
  });

  it("output remains valid, re-parseable Luau after all new folds combined", () => {
    const source = `
      local a = "x" .. "y"
      local b = 1 == 1
      local c = true and 5 or 10
      local d = not false
      print(a, b, c, d)
    `;
    const result = compressAggressive(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(() => parse(result.output)).not.toThrow();
  });
});
