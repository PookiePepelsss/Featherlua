import { describe, expect, it } from "vitest";
import { compressAggressive } from "../compress-aggressive";
import { parse } from "../parser";

// removeUnusedLocals is disabled here: these tests are specifically about
// folding/dead-branch elimination in isolation, using minimal `local x =
// ...` snippets with no subsequent read of `x` -- with unused-local removal
// also on, the whole declaration (folded value and all) would vanish,
// testing nothing. See remove-unused-locals.test.ts for that pass.
function output(source: string): string {
  const result = compressAggressive(source, { removeUnusedLocals: false });
  if (!result.ok) throw new Error(`expected ok:true, got error: ${result.error.message}`);
  return result.output;
}

describe("optimize: constant folding of literal arithmetic", () => {
  it("folds +, -, *, / between number literals", () => {
    expect(output("local x = 1 + 2")).toBe("local a=3");
    expect(output("local x = 5 - 2")).toBe("local a=3");
    expect(output("local x = 3 * 4")).toBe("local a=12");
    expect(output("local x = 10 / 4")).toBe("local a=2.5");
  });

  it("folds nested arithmetic bottom-up", () => {
    expect(output("local x = (1 + 2) * 3")).toBe("local a=9");
    expect(output("local x = 60 * 60 * 24")).toBe("local a=86400");
  });

  it("folds unary minus on a literal", () => {
    expect(output("local x = -5")).toBe("local a=-5");
  });

  it("negative fold results print as a valid, self-consistent unary minus (not a malformed literal)", () => {
    const result = compressAggressive("local x = 1 - 5", { removeUnusedLocals: false });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("local a=-4");
    // Must actually re-parse as UnaryExpr{-, 4}, not a corrupt token.
    const { chunk } = parse(result.output);
    const stat = chunk.body[0] as { init: { type: string; operator?: string }[] };
    expect(stat.init[0].type).toBe("UnaryExpr");
  });

  it("folds %, // and ^ the way Luau computes them", () => {
    expect(output("local x = 7 % 3")).toBe("local a=1");
    expect(output("local x = 7 // 2")).toBe("local a=3");
    expect(output("local x = 2 ^ 10")).toBe("local a=1024");
  });

  it("takes Luau's `%` and not C's fmod", () => {
    // Luau defines `a % b` as `a - floor(a/b)*b`. Once the division rounds
    // the two part company: fmod says 1 here and the runtime says 0.
    expect(output("local x = 1e300 % 7")).toBe("local a=0");
  });

  it("leaves `%` and `//` by zero alone (no literal for inf or nan)", () => {
    expect(output("local x = 7 % 0")).toBe("local a=7%0");
    expect(output("local x = 7 // 0")).toBe("local a=7//0");
  });

  it("only folds `^` where the result is an exact integer", () => {
    // pow is not required to round correctly, so anything outside the range
    // where the true value is exactly representable is left to the runtime.
    expect(output("local x = 2 ^ 0.5")).toBe("local a=2^.5");
    expect(output("local x = 2 ^ 1000")).toBe("local a=2^1e3");
  });

  it("does not fold when an operand is not a literal", () => {
    // `a` is a global here, so the renamer skips it for the local `x`.
    expect(output("local x = a + 1")).toBe("local b=a+1");
  });

  it("does not fold division by zero (no literal syntax for inf/nan)", () => {
    const result = compressAggressive("local x = 1 / 0", { removeUnusedLocals: false });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("local a=1/0");
  });

  it("does not fold to -0 (would lose the sign of zero)", () => {
    const result = compressAggressive("local x = 0 * -1", { removeUnusedLocals: false });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(() => parse(result.output)).not.toThrow();
  });

  it("hex, binary, and underscore-separated literals fold correctly", () => {
    expect(output("local x = 0xFF + 1")).toBe("local a=256");
    expect(output("local x = 0b1010 + 0b0101")).toBe("local a=15");
    expect(output("local x = 1_000 + 1")).toBe("local a=1001");
  });

  it("hex float literals with a base-2 'p' exponent fold correctly (0x1p4 = 1 * 2^4 = 16)", () => {
    expect(output("local x = 0x1p4 + 0")).toBe("local a=16");
  });

  it("a folded expression inside a loop body is computed once, not left as a live subexpression", () => {
    // The point: without folding, `60*60*24` would be re-evaluated every
    // iteration at runtime; folded, it's a single literal load.
    const result = compressAggressive("for i = 1, 10 do local x = 60 * 60 * 24 end", { removeUnusedLocals: false });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("86400");
    expect(result.output).not.toContain("60*60");
  });
});

describe("optimize: literal-condition branch elimination", () => {
  it("`if true then A end` becomes `do A end` (drops the runtime check)", () => {
    const result = compressAggressive("if true then print(1) end");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("print(1)");
  });

  it("`if false then A end` (no else) is removed entirely", () => {
    const result = compressAggressive("if false then print(1) end\nprint(2)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("print(2)");
  });

  it("`if false then A else B end` becomes `do B end`", () => {
    const result = compressAggressive("if false then print(1) else print(2) end");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("print(2)");
  });

  it("collapses an elseif chain once a condition is decided", () => {
    // The first clause always runs, so no later one can be reached.
    const result = compressAggressive("if true then print(1) elseif false then print(2) end");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("print(1)");
  });

  it("drops only the clauses that cannot run", () => {
    const source = ["local c = f()", "if false then print(1) elseif c then print(2) else print(3) end"];
    const result = compressAggressive(source.join("\n"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("local a=f()if a then print(2)else print(3)end");
  });

  it("eliminating the surviving branch does not leak its locals into the enclosing scope", () => {
    // A local from the surviving branch must stay inside a `do...end`. Let
    // loose in the parent block, the later `print(x)` would resolve to it
    // instead of staying a global. ok:true is the proof: self-validation
    // would reject that as a structural mismatch.
    const result = compressAggressive("if true then local x = 5 end\nprint(x)", { removeUnusedLocals: false });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { chunk } = parse(result.output);
    expect(chunk.body[0].type).toBe("DoStat");
  });

  it("does not eliminate a branch containing a label (possible goto target from outside)", () => {
    const result = compressAggressive("if false then ::skip:: end\ngoto skip");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("::skip::");
  });
});
