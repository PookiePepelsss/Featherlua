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

describe("quotes are chosen to need the fewest escapes", () => {
  const CASES: [string, string][] = [
    // The local is propagated away; what matters here is the literal.
    [`local s = 'say \\"hi\\"' return s`, `return'say "hi"'`],
    [`local s = "a\\"b\\"c\\"d" return s`, `return'a"b"c"d'`],
    [`local s = 'it\\'s here' return s`, `return"it's here"`],
    // A tie leaves the literal alone rather than churning it.
    [`local s = "mixed ' and \\" here" return s`, `return"mixed ' and \\" here"`],
    [`local s = "plain" return s`, `return"plain"`],
  ];

  for (const [source, expected] of CASES) {
    it(source, () => {
      expect(output(source)).toBe(expected);
    });
  }
});

describe("assignments back to their own target become compound", () => {
  const CASES: [string, string][] = [
    ["local a = 1 a = a + 1 return a", "local a=1 a+=1 return a"],
    ["local t = {n = 1} t.n = t.n * 2 return t.n", "local a={n=1}a.n*=2 return a.n"],
    ["local s = 'x' s = s .. 'y' return s", "local a='x'a..='y'return a"],
    // The target has to be the LEFT operand: `a = 1 - a` is not `a -= 1`,
    // and a metamethod can tell the operands apart even when the operator
    // is commutative for numbers.
    ["local a = 5 a = 1 - a return a", "local a=5 a=1-a return a"],
    ["local a, b = 1, 2 a = b + a return a", "local a,b=1,2 a=b+a return a"],
  ];

  for (const [source, expected] of CASES) {
    it(source, () => {
      expect(output(source)).toBe(expected);
    });
  }

  it("leaves a target that cannot be re-read without side effects", () => {
    const source = "local t, n = {}, 0\nlocal function k() n = n + 1 return 1 end\nt[k()] = (t[k()] or 0) + 1\nreturn n";
    expect(output(source)).toContain("or 0)+1");
  });
});

describe("negated equality collapses to the inequality operator", () => {
  it("not (a == b) becomes a ~= b", () => {
    expect(output("local a, b = 1, 2 return not (a == b)")).toBe("local a,b=1,2 return a~=b");
  });

  it("not (a ~= b) becomes a == b", () => {
    expect(output("local a, b = 1, 2 return not (a ~= b)")).toBe("local a,b=1,2 return a==b");
  });

  it("leaves ordering comparisons alone", () => {
    // `not (a < b)` is not `a >= b`: NaN makes both comparisons false, and
    // `__lt` need not agree with `__le`.
    expect(output("local a, b = 1, 2 return not (a < b)")).toBe("local a,b=1,2 return not(a<b)");
  });
});

describe("plain string facts fold without decoding escapes", () => {
  it("folds the byte length of an ASCII string", () => {
    expect(output("return #'hello'")).toBe("return 5");
  });

  it("folds equality across quote styles", () => {
    expect(output(`return "same" == 'same', "a" ~= 'b'`)).toBe("return true,true");
  });

  it("leaves escaped and non-ASCII lengths to Luau", () => {
    expect(output(`return #"a\\n", #"é"`)).toBe(`return#"a\\n",#"é"`);
  });
});

describe("the shorter forms run identically", () => {
  const SCRIPTS = [
    "local a = 1 a = a + 1 a = a * 2 print(a)",
    "local t = {n = 1} t.n = t.n + 1 print(t.n)",
    "local t = {a = {b = 2}} t.a.b = t.a.b * 3 print(t.a.b)",
    "local n = 0/0 print(not (n == n), n ~= n)",
    "local q, r = {}, {} print(not (q == r))",
    "local o = setmetatable({}, {__eq = function() return true end})\nlocal p = setmetatable({}, getmetatable(o))\nprint(not (o == p))",
    "local t = setmetatable({v = 1}, {__add = function(s, o) return s.v + o end})\nlocal x = t x = x + 1 print(x)",
    "local t = setmetatable({}, {__index = function() return 5 end})\nt.n = t.n + 1 print(rawget(t, 'n'))",
    `local s = 'say \\"hi\\"' print(#s, s, string.byte(s, 1, -1))`,
    `local s = "a\\"b\\"c\\"d" print(#s, s, string.byte(s, 1, -1))`,
    `local s = "\\65\\66\\z   x" print(#s, s, string.byte(s, 1, -1))`,
    "local a = 1 a = a - 1 a = a // 2 a = a % 3 a = a ^ 2 print(a)",
    `print(#"plain", #"", "same" == 'same', "a" ~= 'b')`,
    `print(#"a\\n", #"é")`,
  ];

  for (const source of SCRIPTS) {
    it(source.split("\n")[0], () => {
      const before = executeWithOfficialLuau(module, source);
      expect(before.success, `baseline failed: ${before.error}`).toBe(true);
      const after = executeWithOfficialLuau(module, output(source));
      expect(after.success, `compressed failed: ${after.error}`).toBe(true);
      expect(after.output).toBe(before.output);
    });
  }
});
