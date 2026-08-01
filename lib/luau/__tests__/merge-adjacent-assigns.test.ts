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

describe("merge-adjacent-assigns: mergeAdjacentAssignsAcrossFields (EXPERIMENTAL, off by default)", () => {
  const withFields = { ...noFold, mergeAdjacentAssignsAcrossFields: true } as const;

  it("off by default: field targets stay separate even with mergeAdjacentAssigns on", () => {
    const o = out("t.x = 1\nt.y = 2\nprint(t)", noFold);
    expect(o).toContain("t.x=1 t.y=2");
  });

  it("chains a run of 3+ field targets into a single statement", () => {
    const o = out("t.x = 1\nt.y = 2\nt.z = 3\nprint(t)", withFields);
    expect(o).toBe("t.x,t.y,t.z=1,2,3 print(t)");
  });

  it("merges plain t.x/t.y field targets when enabled", () => {
    const o = out("t.x = 1\nt.y = 2\nprint(t)", withFields);
    expect(o).toBe("t.x,t.y=1,2 print(t)");
  });

  it("merges a mix of identifier and field targets", () => {
    const o = out("a = 1\nt.y = 2\nprint(a,t)", withFields);
    expect(o).toBe("a,t.y=1,2 print(a,t)");
  });

  it("does not merge t[k]= (computed index, not a plain field)", () => {
    const o = out("t[k] = 1\nt.y = 2\nprint(t)", withFields);
    expect(o).toContain("t[k]=1 t.y=2");
  });

  it("does not merge a nested chain (only depth-1 base.field allowed)", () => {
    const o = out("a.b.x = 1\na.b.y = 2\nprint(a)", withFields);
    expect(o).toContain("a.b.x=1 a.b.y=2");
  });

  it("does not merge f().x= (call as the base, not a plain identifier)", () => {
    const o = out("f().x = 1\nf().y = 2", withFields);
    expect(o).toContain("f().x=1 f().y=2");
  });

  it("does not merge the same field twice (t.x=1 t.x=2 duplicate-slot trap)", () => {
    const o = out("t.x = 1\nt.x = 2\nprint(t)", withFields);
    expect(o).toContain("t.x=1 t.x=2");
  });

  it("does not merge when the second value reads the first target's field (evaluation-order trap)", () => {
    const o = out("t.x = 1\nt.y = t.x + 1\nprint(t)", withFields);
    expect(o).toContain("t.x=1 t.y=t.x+1");
  });

  it("still refuses when either value contains a call", () => {
    const o = out("t.x = f()\nt.y = 2\nprint(t)", withFields);
    expect(o).toContain("t.x=f()t.y=2");
  });

  it("never alters what value ends up in a field (remote-args-style safety)", () => {
    const merged = out('t.x = "payload"\nt.y = 2\nprint(t)', withFields);
    expect(merged).toContain('"payload"');
    const parsed = parse(merged);
    expect(parsed.chunk).toBeDefined();
  });

  it("output remains valid, re-parseable Luau", () => {
    const result = compressAggressive("t.x = 1\nt.y = 2\nprint(t)", withFields);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(() => parse(result.output)).not.toThrow();
  });
});
