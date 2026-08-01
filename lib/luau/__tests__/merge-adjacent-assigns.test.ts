import { describe, expect, it } from "vitest";
import { compressAggressive } from "../compress-aggressive";
import { parse } from "../parser";

const noFold = { rename: false, removeUnusedLocals: false, propagateConstants: false, foldConstants: false } as const;

function out(src: string, opts?: Parameters<typeof compressAggressive>[1]): string {
  const r = compressAggressive(src, opts);
  if (!r.ok) throw new Error(r.error.message);
  return r.output;
}

describe("merge-adjacent-assigns", () => {
  it("merges two saturated single-target global assignments", () => {
    expect(out("a = 1\nb = 2\nprint(a,b)", noFold)).toBe("a,b=1,2 print(a,b)");
  });

  it("merges two saturated single-target local assignments", () => {
    expect(
      out("local a\nlocal b\na = 1\nb = 2\nprint(a,b)", noFold),
    ).toBe("local a,b a,b=1,2 print(a,b)");
  });

  it("does not merge when the second value reads the first target (evaluation-order trap)", () => {
    const o = out("a = 1\nb = a + 1\nprint(a,b)", noFold);
    expect(o).toContain("a=1 b=a+1");
  });

  it("does not merge re-assignment of the same binding", () => {
    const o = out("a = 1\na = 2\nprint(a)", noFold);
    expect(o).toContain("a=1 a=2");
  });

  it("does not merge when either side is a table/member target", () => {
    const o = out("t.x = 1\nt.y = 2\nprint(t)", noFold);
    expect(o).toContain("t.x=1 t.y=2");
  });

  it("does not merge when either value contains a call", () => {
    const o = out("a = f()\nb = 2\nprint(a,b)", noFold);
    expect(o).toContain("a=f()b=2");
  });

  it("does not merge across differing arity (extra discarded values)", () => {
    const o = out("a = f(), g()\nb = 2\nprint(a,b)", noFold);
    expect(o).toContain("a=f(),g()b=2");
  });

  it("output remains valid, re-parseable Luau", () => {
    const result = compressAggressive("a = 1\nb = 2\nprint(a,b)", noFold);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(() => parse(result.output)).not.toThrow();
  });

  it("respects the toggle: off by option leaves statements separate", () => {
    const o = out("a = 1\nb = 2\nprint(a,b)", { ...noFold, mergeAdjacentAssigns: false });
    expect(o).toContain("a=1 b=2");
  });

  it("chains a run of 3+ into a single statement, not just the first pair", () => {
    const o = out("a = 1\nb = 2\nc = 3\nprint(a,b,c)", noFold);
    expect(o).toBe("a,b,c=1,2,3 print(a,b,c)");
  });

  it("stops the chain exactly where a later value references an earlier target, then resumes cleanly", () => {
    const o = out("a=1\nb=2\nc=a+b\nd=4\nprint(a,b,c,d)", noFold);
    expect(o).toBe("a,b=1,2 c,d=a+b,4 print(a,b,c,d)");
  });

  it("stops the chain at a duplicate target across the whole group, not just the immediate pair", () => {
    const o = out("a=1\nb=2\na=3\nprint(a,b)", noFold);
    // a,b would merge, but the third statement reassigns a again -- must
    // not silently become a,b,a=1,2,3 (undefined which store of `a` wins).
    expect(o).toBe("a,b=1,2 a=3 print(a,b)");
  });
});
