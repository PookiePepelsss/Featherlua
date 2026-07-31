import { describe, expect, it } from "vitest";
import { compressAggressive } from "../compress-aggressive";

function out(src: string, opts?: Parameters<typeof compressAggressive>[1]) {
  const r = compressAggressive(src, opts);
  if (!r.ok) throw new Error(r.error.message);
  return r.output;
}

const noFold = { rename: false, removeUnusedLocals: false, propagateConstants: false, foldConstants: false } as const;

describe("scratch: merge-adjacent-locals", () => {
  it("merges two saturated single-name locals", () => {
    expect(out("local a = 1\nlocal b = 2\nprint(a,b)", noFold))
      .toBe("local a=1 local b=2 print(a,b)".replace("local a=1 local b=2", "local a,b=1,2"));
  });
  it("does NOT merge when second init reads first's just-declared name", () => {
    const o = out("local a = 1\nlocal b = a + 1\nprint(a,b)", noFold);
    expect(o).toContain("local a=1 local b=a+1");
  });
  it("merges two bare declarations", () => {
    expect(out("local a\nlocal b\nprint(a,b)", noFold)).toBe("local a,b print(a,b)");
  });
  it("does not merge when shadowing an outer global would change meaning", () => {
    const o = out("a = 5\nlocal a = 1\nlocal b = a\nprint(a,b)", noFold);
    expect(o).toContain("local a=1 local b=a");
  });
});

describe("scratch: dead code after terminator", () => {
  it("drops code after break", () => {
    const o = out('for i=1,3 do\n  break\n  print("dead")\nend');
    expect(o).not.toContain("dead");
  });
  it("drops code after continue", () => {
    const o = out('for i=1,3 do\n  continue\n  print("dead")\nend');
    expect(o).not.toContain("dead");
  });
  it("drops code after goto when no top-level label follows", () => {
    const o = out('do\n  goto done\n  print("dead")\nend\n::done::');
    expect(o).not.toContain("dead");
  });
  it("keeps code after goto when a top-level label follows", () => {
    const o = out('do\n  goto done\n  print("dead")\n  ::done::\nend');
    expect(o).toContain("dead");
  });
});
