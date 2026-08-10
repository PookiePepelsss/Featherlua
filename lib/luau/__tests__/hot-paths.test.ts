import { describe, expect, it } from "vitest";
import { findHotPaths } from "../hot-paths";
import { parse } from "../parser";
import { resolveScopes } from "../scope-resolver";

function advise(source: string) {
  const { chunk } = parse(source);
  resolveScopes(chunk);
  return findHotPaths(chunk);
}

function kinds(source: string) {
  return advise(source).map((hit) => hit.kind);
}

describe("string built up inside a loop", () => {
  it("is reported", () => {
    const hits = advise(`local s = ""
for i = 1, 100 do
  s = s .. "x"
end
print(s)`);
    expect(hits).toHaveLength(1);
    expect(hits[0].kind).toBe("loop-concat");
    expect(hits[0].line).toBe(2);
    expect(hits[0].message).toContain("table.concat");
  });

  it("is reported in its compound form too", () => {
    expect(kinds(`local s = ""
while true do s ..= "x" end`)).toContain("loop-concat");
  });

  it("is not reported when the loop merely assigns a concatenation", () => {
    // `line` is rebuilt from scratch each time, so nothing accumulates.
    expect(kinds(`local line = ""
for i = 1, 100 do
  line = "prefix" .. i
end
print(line)`)).toEqual([]);
  });

  it("is not reported outside a loop", () => {
    expect(kinds(`local s = "" s = s .. "x" print(s)`)).toEqual([]);
  });
});

describe("a field chain read repeatedly in a loop", () => {
  it("is reported", () => {
    const hits = advise(`local cfg = { a = { b = 1 } }
local total = 0
for i = 1, 100 do
  total = total + cfg.a.b + cfg.a.b
end
print(total)`);
    expect(hits.map((h) => h.kind)).toContain("repeated-field");
    expect(hits.find((h) => h.kind === "repeated-field")!.message).toContain("cfg.a.b");
  });

  it("is left alone when the loop writes it", () => {
    expect(kinds(`local cfg = { a = { b = 1 } }
for i = 1, 100 do
  cfg.a.b = cfg.a.b + 1
  print(cfg.a.b)
end`)).not.toContain("repeated-field");
  });

  it("is left alone when the loop writes something it hangs off", () => {
    expect(kinds(`local cfg = { a = { b = 1 } }
local total = 0
for i = 1, 100 do
  cfg.a = { b = i }
  total = total + cfg.a.b + cfg.a.b
end
print(total)`)).not.toContain("repeated-field");
  });

  it("is left alone when a call in the loop could change anything", () => {
    expect(kinds(`local cfg = { a = { b = 1 } }
local total = 0
for i = 1, 100 do
  refresh()
  total = total + cfg.a.b + cfg.a.b
end
print(total)`)).not.toContain("repeated-field");
  });

  it("is left alone for a single read", () => {
    expect(kinds(`local cfg = { a = { b = 1 } }
local total = 0
for i = 1, 100 do total = total + cfg.a.b end
print(total)`)).not.toContain("repeated-field");
  });

  it("is left alone for a shallow field, where there is nothing to save", () => {
    expect(kinds(`local cfg = { b = 1 }
local total = 0
for i = 1, 100 do total = total + cfg.b + cfg.b end
print(total)`)).not.toContain("repeated-field");
  });
});

describe("a length taken in a loop condition", () => {
  it("is reported", () => {
    const hits = advise(`local t = { 1, 2, 3 }
local i = 1
while i <= #t do
  i = i + 1
end`);
    expect(hits.map((h) => h.kind)).toContain("length-in-condition");
  });

  it("is not reported for `repeat ... until`, where the recount is the point", () => {
    // `repeat wait() until #thing > 0` waits for something to be filled in.
    // Hoisting the length there turns it into an infinite loop, and every
    // hit of this shape on a real corpus was exactly that.
    expect(kinds(`local t = {}
repeat wait() until #t > 0
print(#t)`)).not.toContain("length-in-condition");
  });

  it("is not reported when the loop appends to the thing it measures", () => {
    expect(kinds(`local t = {}
local i = 1
while i <= #t do
  t[#t + 1] = i
  i = i + 1
end`)).not.toContain("length-in-condition");
  });

  it("is not reported for a numeric for, where the bound is evaluated once", () => {
    expect(kinds(`local t = { 1, 2, 3 }
local total = 0
for i = 1, #t do total = total + t[i] end
print(total)`)).not.toContain("length-in-condition");
  });
});

describe("the advisor stays quiet on ordinary code", () => {
  const QUIET = [
    "print('hello')",
    "local t = {} for i = 1, 10 do t[i] = i end print(#t)",
    "for _, v in pairs({ 1, 2 }) do print(v) end",
    "local function f(a) return a + 1 end print(f(1))",
    "while wait() do print(1) end",
  ];

  for (const source of QUIET) {
    it(source.slice(0, 46), () => {
      expect(advise(source)).toEqual([]);
    });
  }
});

describe("loops inside callbacks are reached", () => {
  it("looks inside a function expression, which is where render loops live", () => {
    expect(kinds(`game:GetService("RunService").RenderStepped:Connect(function()
  local s = ""
  for i = 1, 100 do s = s .. "x" end
  print(s)
end)`)).toContain("loop-concat");
  });

  it("looks inside a declared function", () => {
    expect(kinds(`local function build()
  local s = ""
  for i = 1, 100 do s = s .. "x" end
  return s
end
print(build())`)).toContain("loop-concat");
  });
});

// Where the saving can be taken depends on what the chain hangs off. A
// chain rooted at the loop variable is a different object each time round,
// so hoisting it above the loop would be wrong; it can only be read once
// per iteration. A real corpus script had exactly this shape.
describe("the advice says where the read can move to", () => {
  it("says above the loop when the chain does not depend on the loop", () => {
    const [hit] = advise(`local cfg = { a = { b = 1 } }
local total = 0
for i = 1, 100 do total = total + cfg.a.b + cfg.a.b end
print(total)`).filter((h) => h.kind === "repeated-field");
    expect(hit.message).toContain("above the loop");
  });

  it("says top of the body when the chain hangs off the loop variable", () => {
    const [hit] = advise(`local total = 0
for _, part in ipairs(parts) do
  total = total + part.base.Position + part.base.Position
end
print(total)`).filter((h) => h.kind === "repeated-field");
    expect(hit.message).toContain("top of the body");
    expect(hit.message).not.toContain("above the loop");
  });
});
