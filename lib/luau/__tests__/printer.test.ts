import { describe, expect, it } from "vitest";
import { parse } from "../parser";
import { print } from "../printer";

function roundtrip(source: string) {
  const { chunk } = parse(source);
  return print(chunk);
}

describe("printer: minimal parens fall out of precedence-aware printing", () => {
  it("left-assoc chain needs no parens: a-b-c", () => {
    expect(roundtrip("local r = a - b - c")).toBe("local r=a-b-c");
  });

  it("right operand of a left-assoc op needs parens: a-(b-c)", () => {
    expect(roundtrip("local r = a - (b - c)")).toBe("local r=a-(b-c)");
  });

  it("`-x^2` prints without parens (already unambiguous)", () => {
    expect(roundtrip("local r = -a ^ 2")).toBe("local r=-a^2");
  });

  it("`(-x)^2` keeps its parens (genuinely different value)", () => {
    expect(roundtrip("local r = (-a) ^ 2")).toBe("local r=(-a)^2");
  });

  it("right-assoc `^` chain needs no parens: 2^3^4", () => {
    expect(roundtrip("local r = 2 ^ 3 ^ 4")).toBe("local r=2^3^4");
  });

  it("`(f())` keeps its parens (multi-value truncation, not cosmetic)", () => {
    expect(roundtrip("local a, b = (f())")).toBe("local a,b=(f())");
  });

  it("`f()` without source parens prints without parens", () => {
    expect(roundtrip("local a, b = f()")).toBe("local a,b=f()");
  });

  it("drops genuinely redundant parens the source happened to include", () => {
    expect(roundtrip("local r = (a + b) * c")).toBe("local r=(a+b)*c");
    expect(roundtrip("local r = (a * b) + c")).toBe("local r=a*b+c");
  });

  it("collapses redundant double-parens around a call, keeping exactly one truncating pair", () => {
    expect(roundtrip("local a, b = ((f()))")).toBe("local a,b=(f())");
  });
});

describe("printer: needsSpace prevents token collisions", () => {
  it("keeps a space between adjacent keywords/identifiers", () => {
    expect(roundtrip("return a")).toBe("return a");
    expect(roundtrip("local x = not a")).toBe("local x=not a");
  });

  it("keeps a space to avoid forming a line comment from two minus signs", () => {
    expect(roundtrip("local r = a - -b")).toBe("local r=a- -b");
  });

  it("keeps a space between a token ending in '.' and a following digit (avoids '..5' reading as '.' + '.5')", () => {
    // Matches Safe mode's existing needsSpace rule verbatim -- ".." followed
    // directly by a digit is deliberately kept apart as a conservative
    // anti-ambiguity guard, even though this particular case (".." is
    // already a complete 2-char token) happens to re-lex fine either way.
    expect(roundtrip("local r = a .. 5")).toBe("local r=a.. 5");
  });
});

describe("printer: license/shebang not handled here (compress-aggressive's job)", () => {
  it("print() itself only emits code, comments are stripped upstream by the lexer", () => {
    expect(roundtrip("-- @license MIT\nlocal x = 1")).toBe("local x=1");
  });
});
