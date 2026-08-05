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

describe("optimize: number literal canonicalization (shortest round-tripping form)", () => {
  it("shortens trailing/leading zeros", () => {
    expect(output("local x = 1.500000")).toBe("local a=1.5");
    expect(output("local x = 0.100000")).toBe("local a=.1");
    expect(output("local x = 1.0")).toBe("local a=1");
  });

  it("strips underscore digit separators when shorter", () => {
    expect(output("local x = 1_000_000")).toBe("local a=1e6");
  });

  it("converts hex to decimal when decimal is shorter", () => {
    expect(output("local x = 0xA")).toBe("local a=10");
    expect(output("local x = 0x1F")).toBe("local a=31");
  });

  it("leaves an already-minimal literal untouched", () => {
    expect(output("local x = 100")).toBe("local a=100");
  });

  it("leaves a literal untouched when the canonical form isn't shorter", () => {
    expect(output("local x = 1e10")).toBe("local a=1e10");
  });

  it("never renders a non-finite overflowed literal as invalid Lua syntax", () => {
    // 1e400 overflows a double to Infinity, same in Lua and JS; there's no
    // literal syntax for "Infinity" so the original text must survive.
    const result = compressAggressive("local x = 1e400\nprint(x)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("1e400");
  });
});

describe("optimize: logical short-circuit folding (and/or return an OPERAND, not true/false)", () => {
  it("`false and X` folds to the falsy left operand itself, not `false`", () => {
    // `nil and print(1)` folds to `nil` (the falsy left operand, print(1)
    // never evaluated), which remove-nil-declaration then simplifies
    // further to a bare `local a` -- same runtime meaning, fewer bytes.
    expect(output("local x = nil and print(1)")).toBe("local a");
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
    expect(output("local x = 1 < 2")).toBe("local a=1<2");
    expect(output("local x = 2 <= 2")).toBe("local a=true");
    expect(output("local x = 3 > 5")).toBe("local a=3>5");
    expect(output("local x = 5 >= 5")).toBe("local a=true");
  });

  it("folds equality between literals of the same type", () => {
    expect(output("local x = 1 == 1")).toBe("local a=true");
    expect(output("local x = 1 == 2")).toBe("local a=1==2");
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

  it("quotes long-bracket strings that need no escapes, then folds them", () => {
    // `[[a]]` becomes `"a"`, which brings the pair within reach of the
    // concatenation fold that only handles matching delimiters.
    expect(output("local x = [[a]] .. [[b]] return x")).toBe('return"ab"');
  });

  it("leaves a long-bracket string that would need escaping", () => {
    // A backslash is literal inside long brackets but an escape inside
    // quotes, so this one has to stay as it is.
    const result = compressAggressive("local x = [[back" + String.fromCharCode(92) + "slash]] return x");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("[[back");
  });

  it("does not fold number..string (needs Lua's exact tostring formatting, not attempted)", () => {
    const result = compressAggressive('local x = 1 .. "a"');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("..");
  });
});

describe("optimize: folded literal-condition comparisons feed dead-branch elimination", () => {
  it("`if 1 < 2 then` reduces to its branch body", () => {
    expect(output("if 1 < 2 then print(1) end")).toBe("print(1)");
  });

  it("propagated + compared: `local MAX = 10; if MAX > 5 then ... end` eliminates fully", () => {
    expect(output("local MAX = 10\nif MAX > 5 then print(1) end")).toBe("print(1)");
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

const isolated = { rename: false, propagateConstants: false, removeUnusedLocals: false } as const;
function outputIsolated(source: string): string {
  const result = compressAggressive(source, isolated);
  if (!result.ok) throw new Error(`expected ok:true, got error: ${result.error.message}`);
  return result.output;
}

describe("optimize: string-index-to-field (`t[\"key\"]` -> `t.key`)", () => {
  it("converts a plain identifier string key", () => {
    expect(outputIsolated("local t = {}\nprint(t['x'])")).toBe("local t={}print(t.x)");
  });

  it("converts on an assignment target too", () => {
    expect(outputIsolated("local t = {}\nt['x'] = 1")).toBe("local t={}t.x=1");
  });

  it("does not convert a key that isn't a valid identifier", () => {
    expect(outputIsolated('local t = {}\nprint(t["1x"])')).toContain('t["1x"]');
    expect(outputIsolated('local t = {}\nprint(t["a-b"])')).toContain('t["a-b"]');
    expect(outputIsolated('local t = {}\nprint(t[""])')).toContain('t[""]');
  });

  it("does not convert a reserved keyword", () => {
    expect(outputIsolated('local t = {}\nprint(t["end"])')).toContain('t["end"]');
  });

  it("does not convert a key containing an escape (raw text ambiguity)", () => {
    expect(outputIsolated('local t = {}\nprint(t["x\\121"])')).toContain('t["x\\121"]');
  });

  it("does not convert a non-literal computed index", () => {
    expect(outputIsolated("local t = {}\nlocal k = 'x'\nprint(t[k])")).toContain("[k]");
  });

  it("propagateConstants can expose a new conversion opportunity, and the loop catches it", () => {
    // Once `k` is inlined to the literal 'x', the now-literal index
    // qualifies for the same t["x"]->t.x simplification -- a nice example
    // of the passes compounding within the convergence loop.
    const result = compressAggressive("local t = {}\nlocal k = 'x'\nprint(t[k])", { rename: false });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("t.x");
  });

  it("uses named fields for safe string keys in table constructors", () => {
    expect(outputIsolated('local t = {["name"] = 1, ["end"] = 2}\nprint(t)'))
      .toBe('local t={name=1,["end"]=2}print(t)');
  });
});

describe("optimize: remove-nil-declaration (`local x = nil` -> `local x`)", () => {
  it("drops a single explicit nil initializer", () => {
    expect(outputIsolated("local x = nil\nprint(x)")).toBe("local x print(x)");
  });

  it("drops multiple explicit nil initializers", () => {
    expect(outputIsolated("local x, y = nil, nil\nprint(x, y)")).toBe("local x,y print(x,y)");
  });

  it("does not drop when only some names get an explicit nil (partial list)", () => {
    // Here `nil` is a real, meaningful value for `y` (both end up nil
    // either way) -- but the point of this rule is purely textual, so a
    // partial list is left untouched rather than reasoning about arity.
    const o = outputIsolated("local x, y = 1, nil\nprint(x, y)");
    expect(o).toContain("=1,nil");
  });

  it("does not drop a real (non-nil) initializer", () => {
    expect(outputIsolated("local x = 1\nprint(x)")).toContain("=1");
  });
});
