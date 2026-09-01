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

describe("branches that only return become an if-expression", () => {
  it("a two-armed if", () => {
    expect(output("local function f(c) if c then return 1 else return 2 end end return f"))
      .toBe("local function a(a)return if a then 1 else 2 end return a");
  });

  it("an elseif chain", () => {
    expect(output("local function f(x) if x==1 then return 'a' elseif x==2 then return 'b' else return 'c' end end return f"))
      .toBe("local function a(a)return if a==1 then'a'elseif a==2 then'b'else'c'end return a");
  });

  it("leaves a branch with no else arm", () => {
    // Falling through returns nothing, which is not the nil an
    // if-expression would hand back.
    expect(output("local function f(c) if c then return 1 end return 2 end return f"))
      .toBe("local function a(a)if a then return 1 end return 2 end return a");
  });

  it("leaves an arm returning a call", () => {
    // `return f()` passes every result through; an if-expression would
    // truncate it to one.
    expect(output("local function g(c) if c then return print(1) else return 2 end end return g"))
      .toContain("return print");
  });

  it("leaves an arm returning varargs", () => {
    expect(output("local function v(...) if ... then return ... else return 0 end end return v"))
      .toContain("return...");
  });
});

describe("boolean-return branches collapse to coercion", () => {
  it("returns the condition when it already produces a boolean", () => {
    expect(output("local function f(a) if a == 1 then return true else return false end end return f"))
      .toBe("local function a(a)return a==1 end return a");
  });

  it("coerces a value to boolean without evaluating it twice", () => {
    expect(output("local function f(a) if a then return true else return false end end return f"))
      .toBe("local function a(a)return not not a end return a");
  });

  it("uses one negation for reversed boolean arms", () => {
    expect(output("local function f(a) if a then return false else return true end end return f"))
      .toBe("local function a(a)return not a end return a");
  });
});

describe("literal conditions collapse using Luau truthiness", () => {
  it("treats nil as false", () => {
    expect(output("if nil then print('bad') else print('ok') end")).toBe("print'ok'");
  });

  it("treats zero and an empty string as true", () => {
    expect(output("if 0 then print('zero') end if '' then print('empty') end"))
      .toBe("print'zero'print'empty'");
  });

  it("removes a while loop whose condition is nil", () => {
    expect(output("while nil do print('bad') end print('ok')")).toBe("print'ok'");
  });

  it("selects a constant if-expression arm", () => {
    expect(output("return if nil then 1 else 2")).toBe("return 2");
  });

  it("keeps a selected call single-valued", () => {
    expect(output("local function pair() return 1, 2 end return if true then pair() else 0"))
      .toBe("local function a()return 1,2 end return(a())");
  });
});

describe("redundant syntax is dropped", () => {
  it("a numeric for step of 1", () => {
    expect(output("local t = {} for i = 1, 10, 1 do t[i] = i end return t"))
      .toBe("local a={}for b=1,10 do a[b]=b end return a");
  });

  it("keeps a step that is not 1", () => {
    expect(output("local t = {} for i = 1, 10, 2 do t[i] = i end return t")).toContain("1,10,2");
  });

  it("a bare return at the end of a function body", () => {
    expect(output("local function f(a) print(a) return end return f"))
      .toBe("local function a(a)print(a)end return a");
  });

  it("keeps a bare return that is not last", () => {
    expect(output("local function f(a) if a then return end print(a) end return f"))
      .toContain("return end");
  });
});

describe("long-bracket strings become quoted when nothing needs escaping", () => {
  it("plain contents", () => {
    expect(output("local a = [[alpha]] local b = [[beta]] return a, b")).toBe('return"alpha","beta"');
  });

  it("contents holding one quote kind use the other", () => {
    expect(output(`local s = [[a"b]] return s`)).toBe(`return'a"b'`);
  });

  it("leaves contents holding both quote kinds", () => {
    expect(output(`local s = [[a'b"c]] return s`)).toContain("[[");
  });

  it("leaves contents holding a backslash", () => {
    // A backslash is literal inside long brackets and an escape inside
    // quotes, so converting would change the bytes.
    expect(output(`local s = [[back${String.fromCharCode(92)}slash]] return s`)).toContain("[[back");
  });
});

describe("the shorter statements run identically", () => {
  const SCRIPTS = [
    "local function f(c) if c then return 1 else return 2 end end print(f(true), f(false))",
    "local function f(x) if x==1 then return 'a' elseif x==2 then return 'b' else return 'c' end end print(f(1), f(2), f(3))",
    "local function g(c) if c then return print('x') else return 2 end end print(g(true))",
    "local function v(...) if ... then return ... else return 0 end end print(v(1, 2))",
    "for i = 1, 3, 1 do print(i) end",
    "for i = 6, 1, -2 do print(i) end",
    "local function k() print(1) return end print(k())",
    "local function k2() return end print(k2())",
    "local s = [[abc]] print(#s, s)",
    `local s = [[a"b]] print(#s, s, string.byte(s, 1, -1))`,
    `local s = [[a'b"c]] print(#s, s, string.byte(s, 1, -1))`,
    `local s = [[back${String.fromCharCode(92)}slash]] print(#s, s, string.byte(s, 1, -1))`,
    "local s = [[a]] .. [[b]] print(#s, s)",
    "local s = [==[has ]] inside]==] print(#s, s)",
    "local function b(v) if v then return true else return false end end print(b(nil), b(0), b(''))",
    "local function b(v) if v then return false else return true end end print(b(nil), b(0), b(''))",
    "if nil then print('bad') else print('nil') end if 0 then print('zero') end if '' then print('empty') end",
    "while nil do print('bad') end print(if false then 'bad' else 'ok')",
    "local function pair() return 1, 2 end local function count(...) return select('#', ...) end print(count(true and pair()), count(false or pair()), count(if true then pair() else 0))",
  ];

  for (const source of SCRIPTS) {
    it(source.slice(0, 62), () => {
      const before = executeWithOfficialLuau(module, source);
      expect(before.success, `baseline failed: ${before.error}`).toBe(true);
      const after = executeWithOfficialLuau(module, output(source));
      expect(after.success, `compressed failed: ${after.error}`).toBe(true);
      expect(after.output).toBe(before.output);
    });
  }
});

// Each case here also runs through the real runtime, so the shorter shape
// is proven to do what the longer one did, not just to look right.
function sameBehaviour(source: string) {
  const result = compressAggressive(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  const before = executeWithOfficialLuau(module, source);
  const after = executeWithOfficialLuau(module, result.output);
  expect(before.success).toBe(true);
  expect(after.output).toBe(before.output);
}

describe("an else holding a lone if collapses to elseif", () => {
  it("one level", () => {
    expect(output("if a then f() else if b then g() else h() end end"))
      .toBe("if a then f()elseif b then g()else h()end");
  });

  it("several levels at once", () => {
    expect(output("if a then f() else if b then g() else if c then h() end end end"))
      .toBe("if a then f()elseif b then g()elseif c then h()end");
  });

  it("does not touch an else holding more than the if", () => {
    expect(output("if a then f() else g() if b then h() end end"))
      .toBe("if a then f()else g()if b then h()end end");
  });

  it("behaves the same", () => {
    sameBehaviour('local x = 2\nif x == 1 then print("a") else if x == 2 then print("b") else print("c") end end');
  });
});

describe("a negated condition swaps its branches instead", () => {
  it("plain not", () => {
    expect(output("if not a then f() else g() end")).toBe("if a then g()else f()end");
  });

  it("an empty then arm disappears entirely", () => {
    expect(output("if not a then else g() end")).toBe("if a then g()end");
  });

  it("stays put without an else to swap with", () => {
    expect(output("if not a then f() end")).toBe("if not a then f()end");
  });

  it("behaves the same", () => {
    sameBehaviour('local x = nil\nif not x then print("nil branch") else print("value branch") end');
  });
});

describe("double negation in a condition folds away", () => {
  it("in an if", () => {
    expect(output("if not not a then f() end")).toBe("if a then f()end");
  });

  it("in a while", () => {
    expect(output("while not not a do f() end")).toBe("while a do f()end");
  });

  it("in an until", () => {
    expect(output("repeat f() until not not done")).toBe("repeat f()until done");
  });

  it("keeps a single not", () => {
    expect(output("while not a do f() end")).toBe("while not a do f()end");
  });

  it("keeps the pair where the value matters", () => {
    // As a return value the coercion to a real boolean is observable.
    expect(output("local function f(v) return not not v end return f"))
      .toBe("local function a(a)return not not a end return a");
  });

  it("behaves the same", () => {
    sameBehaviour('local x = 5\nwhile not not x do x = nil end\nprint(x)');
  });
});

describe("statements that say nothing are dropped", () => {
  it("an empty else", () => {
    expect(output("if a then f() else end")).toBe("if a then f()end");
  });

  it("a trailing bare return at the top level", () => {
    expect(output("f() return")).toBe("f()");
  });

  it("keeps a trailing return that carries a value", () => {
    expect(output("local t = {} return t")).toBe("local a={}return a");
  });
});

describe("mixed-quote concatenation still folds", () => {
  it("plain pieces", () => {
    expect(output("print(\"a\" .. 'b')")).toBe('print"ab"');
  });

  it("re-escapes what the surviving delimiter needs", () => {
    expect(output("print('say \"hi\"' .. \"!\")")).toBe("print'say \"hi\"!'");
  });

  it("behaves the same", () => {
    sameBehaviour("print(\"left-\" .. 'right', #(\"a\" .. 'b\"c'))");
  });
});
