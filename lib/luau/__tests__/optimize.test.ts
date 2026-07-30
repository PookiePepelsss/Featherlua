import { describe, expect, it } from "vitest";
import { compressAggressive } from "../compress-aggressive";
import { parse } from "../parser";

function output(source: string): string {
  const result = compressAggressive(source);
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
    const result = compressAggressive("local x = 1 - 5");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("local a=-4");
    // Must actually re-parse as UnaryExpr{-, 4}, not a corrupt token.
    const { chunk } = parse(result.output);
    const stat = chunk.body[0] as { init: { type: string; operator?: string }[] };
    expect(stat.init[0].type).toBe("UnaryExpr");
  });

  it("does NOT fold %, //, or ^ (semantic-matching risk between JS and Lua)", () => {
    expect(output("local x = 7 % 3")).toBe("local a=7%3");
    expect(output("local x = 7 // 2")).toBe("local a=7//2");
    expect(output("local x = 2 ^ 10")).toBe("local a=2^10");
  });

  it("does not fold when an operand is not a literal", () => {
    // `a` is a global here, so the renamer skips it for the local `x`.
    expect(output("local x = a + 1")).toBe("local b=a+1");
  });

  it("does not fold division by zero (no literal syntax for inf/nan)", () => {
    const result = compressAggressive("local x = 1 / 0");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("local a=1/0");
  });

  it("does not fold to -0 (would lose the sign of zero)", () => {
    const result = compressAggressive("local x = 0 * -1");
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
    const result = compressAggressive("for i = 1, 10 do local x = 60 * 60 * 24 end");
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
    expect(result.output).toBe("do print(1)end");
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
    expect(result.output).toBe("do print(2)end");
  });

  it("does not eliminate a multi-clause if (elseif present)", () => {
    const result = compressAggressive("if true then print(1) elseif false then print(2) end");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("if");
  });

  it("eliminating the surviving branch does not leak its locals into the enclosing scope", () => {
    // The critical correctness case: a local declared inside the surviving
    // branch must stay confined to it (via the `do...end` wrapper), not get
    // spliced directly into the parent block -- otherwise a later reference
    // to the same name would wrongly resolve to it instead of staying a
    // global reference, silently changing behavior. compressAggressive
    // returning ok:true here is itself the proof: self-validation compares
    // the output's resolved references against the original's, so a leak
    // (print(x) resolving to a local instead of staying global) would have
    // been caught as a structural mismatch and rejected.
    const result = compressAggressive("if true then local x = 5 end\nprint(x)");
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
