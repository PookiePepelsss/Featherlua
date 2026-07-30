import { describe, expect, it } from "vitest";
import { parse } from "../parser";
import type { BinaryExpr, Expr, LocalStat, Stat, UnaryExpr } from "../ast";
import { loadFixtures } from "./fixtures";

describe("parser: fixture corpus parses without throwing", () => {
  for (const fixture of loadFixtures()) {
    it(fixture.name, () => {
      expect(() => parse(fixture.source)).not.toThrow();
    });
  }
});

describe("parser: grammar wrinkles", () => {
  it("local function is self-visible (LocalFunctionStat)", () => {
    const { chunk } = parse("local function f() return f end");
    expect(chunk.body[0].type).toBe("LocalFunctionStat");
  });

  it("plain `local f = function` is a LocalStat with a FunctionExpr init, not LocalFunctionStat", () => {
    const { chunk } = parse("local f = function() return f end");
    const stat = chunk.body[0] as LocalStat;
    expect(stat.type).toBe("LocalStat");
    expect(stat.init[0].type).toBe("FunctionExpr");
  });

  it("repeat/until parses body then cond in that structural order", () => {
    const { chunk } = parse("repeat local x = 1 until x > 0");
    const stat = chunk.body[0] as Extract<Stat, { type: "RepeatStat" }>;
    expect(stat.type).toBe("RepeatStat");
    expect(stat.body[0].type).toBe("LocalStat");
    expect(stat.cond.type).toBe("BinaryExpr");
  });

  it("`::` is a single non-repeatable type assertion, tighter than binary ops", () => {
    const { chunk } = parse("local x = a + b :: number");
    const stat = chunk.body[0] as LocalStat;
    const bin = stat.init[0] as BinaryExpr;
    expect(bin.type).toBe("BinaryExpr");
    expect(bin.operator).toBe("+");
    expect(bin.right.type).toBe("TypeAssertionExpr");
  });

  it("`::` used as a goto label is distinct from `::` as a type assertion in the same file", () => {
    const { chunk } = parse("::top::\nlocal y = 1 :: number\ngoto top");
    expect(chunk.body[0].type).toBe("LabelStat");
    expect((chunk.body[1] as LocalStat).init[0].type).toBe("TypeAssertionExpr");
    expect(chunk.body[2].type).toBe("GotoStat");
  });

  it("double type-assertion requires explicit parens", () => {
    expect(() => parse("local x = a :: number :: string")).toThrow();
    expect(() => parse("local x = (a :: number) :: string")).not.toThrow();
  });

  it("`if...then...else` is an expression usable as any operand", () => {
    const { chunk } = parse("local x = 1 or if a then b else c");
    const stat = chunk.body[0] as LocalStat;
    const bin = stat.init[0] as BinaryExpr;
    expect(bin.operator).toBe("or");
    expect(bin.right.type).toBe("IfExpr");
  });

  it("`-x^2` parses as `-(x^2)` (^ binds tighter than unary)", () => {
    const { chunk } = parse("local r = -a ^ 2");
    const stat = chunk.body[0] as LocalStat;
    const unary = stat.init[0] as UnaryExpr;
    expect(unary.type).toBe("UnaryExpr");
    expect(unary.operator).toBe("-");
    expect(unary.operand.type).toBe("BinaryExpr");
    expect((unary.operand as BinaryExpr).operator).toBe("^");
  });

  it("`(-x)^2` is structurally different from `-x^2`", () => {
    const { chunk } = parse("local r = (-a) ^ 2");
    const stat = chunk.body[0] as LocalStat;
    const bin = stat.init[0] as BinaryExpr;
    expect(bin.type).toBe("BinaryExpr");
    expect(bin.operator).toBe("^");
    expect(bin.left.type).toBe("ParenExpr");
  });

  it("`2^3^4` is right-associative: 2^(3^4)", () => {
    const { chunk } = parse("local r = 2 ^ 3 ^ 4");
    const stat = chunk.body[0] as LocalStat;
    const outer = stat.init[0] as BinaryExpr;
    expect(outer.operator).toBe("^");
    expect((outer.left as Expr).type).toBe("NumberExpr");
    expect(outer.right.type).toBe("BinaryExpr");
    expect((outer.right as BinaryExpr).operator).toBe("^");
  });

  it("`a - b - c` is left-associative: (a-b)-c", () => {
    const { chunk } = parse("local r = a - b - c");
    const stat = chunk.body[0] as LocalStat;
    const outer = stat.init[0] as BinaryExpr;
    expect(outer.operator).toBe("-");
    expect(outer.left.type).toBe("BinaryExpr");
    expect(outer.right.type).toBe("Identifier");
  });

  it("`(f())` is a ParenExpr, distinct from a bare call", () => {
    const { chunk } = parse("local a, b = (f())");
    const stat = chunk.body[0] as LocalStat;
    expect(stat.init).toHaveLength(1);
    expect(stat.init[0].type).toBe("ParenExpr");
  });

  it("`f()` without parens is a bare CallExpr", () => {
    const { chunk } = parse("local a, b = f()");
    const stat = chunk.body[0] as LocalStat;
    expect(stat.init[0].type).toBe("CallExpr");
  });

  it("implicit self on method declarations", () => {
    const { chunk } = parse("function obj:method(a) return a end");
    const stat = chunk.body[0] as Extract<Stat, { type: "FunctionDeclStat" }>;
    expect(stat.target.isMethod).toBe(true);
    expect(stat.func.implicitSelf).toBe(true);
    expect(stat.func.params.map((p) => p.name)).toEqual(["a"]);
  });

  it("nested interpolation produces nested InterpolatedStringExpr parts", () => {
    const { chunk } = parse("local s = `outer {`inner {x}`} tail`");
    const stat = chunk.body[0] as LocalStat;
    const outer = stat.init[0] as Extract<Expr, { type: "InterpolatedStringExpr" }>;
    expect(outer.type).toBe("InterpolatedStringExpr");
    expect(outer.parts[0]).toBe("outer ");
    const inner = outer.parts[1] as Extract<Expr, { type: "InterpolatedStringExpr" }>;
    expect(inner.type).toBe("InterpolatedStringExpr");
    expect(inner.parts[1]).toMatchObject({ type: "Identifier", name: "x" });
    expect(outer.parts[2]).toBe(" tail");
  });

  it("`continue` inside a loop is a ContinueStat", () => {
    const { chunk } = parse("for i = 1, 10 do continue end");
    const forStat = chunk.body[0] as Extract<Stat, { type: "NumericForStat" }>;
    expect(forStat.body[0].type).toBe("ContinueStat");
  });

  it("`continue` used as an ordinary identifier is not a ContinueStat", () => {
    const { chunk } = parse("local continue = 5\nprint(continue)");
    expect(chunk.body[0].type).toBe("LocalStat");
    const callStat = chunk.body[1] as Extract<Stat, { type: "CallStat" }>;
    expect(callStat.call.args[0]).toMatchObject({ type: "Identifier", name: "continue" });
  });

  it("`type X = ...` is a TypeAliasStat, but `type(x)` (calling a global) is a CallStat", () => {
    const { chunk: aliasChunk } = parse("type Foo = number");
    expect(aliasChunk.body[0].type).toBe("TypeAliasStat");

    const { chunk: callChunk } = parse("local t = type(x)");
    const stat = callChunk.body[0] as LocalStat;
    expect(stat.init[0].type).toBe("CallExpr");
  });

  it("export type alias with generics", () => {
    const { chunk } = parse("export type Alias<T> = T | nil");
    const stat = chunk.body[0] as Extract<Stat, { type: "TypeAliasStat" }>;
    expect(stat.exported).toBe(true);
    expect(stat.name).toBe("Alias");
    expect(stat.generics).toBeDefined();
  });

  it("local attributes <const> and <close>", () => {
    const { chunk } = parse("local x <const> = 1\nlocal y <close> = acquire()");
    const first = chunk.body[0] as LocalStat;
    const second = chunk.body[1] as LocalStat;
    expect(first.names[0].attrib).toBe("const");
    expect(second.names[0].attrib).toBe("close");
  });

  it("compound assignment on a member target", () => {
    const { chunk } = parse("t.field -= 2");
    const stat = chunk.body[0] as Extract<Stat, { type: "CompoundAssignStat" }>;
    expect(stat.operator).toBe("-=");
    expect(stat.target.type).toBe("MemberExpr");
  });

  it("swap idiom is a single multi-target AssignStat", () => {
    const { chunk } = parse("a, b = b, a");
    const stat = chunk.body[0] as Extract<Stat, { type: "AssignStat" }>;
    expect(stat.targets).toHaveLength(2);
    expect(stat.values).toHaveLength(2);
  });

  it("stray semicolons produce no extra statement nodes", () => {
    const { chunk } = parse("local x = 1;; local y = 2;");
    expect(chunk.body.map((s) => s.type)).toEqual(["LocalStat", "LocalStat"]);
  });

  it("shebang and license comment are captured as protected comments, not tokens", () => {
    const { chunk, protectedComments } = parse("#!/usr/bin/env luau\n-- @license MIT\nlocal x = 1");
    expect(protectedComments).toEqual(["#!/usr/bin/env luau", "-- @license MIT"]);
    expect(chunk.body).toHaveLength(1);
  });

  it("throws a ParseError with position info on malformed input", () => {
    expect(() => parse("local x = ")).toThrowError(/line \d+, col \d+/);
  });

  it("call-sugar `f\\`text\\`` only triggers on a fresh interpolated string, not a continuation segment", () => {
    const { chunk } = parse("local r = f`hi {x}`");
    const stat = chunk.body[0] as LocalStat;
    expect(stat.init[0].type).toBe("CallExpr");
  });

  it("a bare simpleexp immediately followed by a label is a genuine grammar ambiguity (`::` greedily continues as a type assertion, per asexp ::= simpleexp ['::' Type]); a semicolon disambiguates", () => {
    // `1` greedily absorbs `:: top` as a type assertion, leaving the
    // label's closing `::` dangling with nothing after it -- this is
    // inherent to the grammar, not a parser bug.
    expect(() => parse("local x = 1\n::top::")).toThrow();
    expect(() => parse("local x = 1;\n::top::")).not.toThrow();
  });
});
