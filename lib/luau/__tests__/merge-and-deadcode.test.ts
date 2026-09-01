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

  it("chains a run of 3+ into a single statement, not just the first pair", () => {
    const o = out("local a = 1\nlocal b = 2\nlocal c = 3\nprint(a,b,c)", noFold);
    expect(o).toBe("local a,b,c=1,2,3 print(a,b,c)");
  });

  it("chains bare declarations of any length", () => {
    const o = out("local a\nlocal b\nlocal c\nlocal d\nprint(a,b,c,d)", noFold);
    expect(o).toBe("local a,b,c,d print(a,b,c,d)");
  });

  it("stops the chain exactly where a later init references an earlier name, then resumes cleanly", () => {
    const o = out("local a=1\nlocal b=2\nlocal c=a+b\nlocal d=4\nprint(a,b,c,d)", noFold);
    // a,b merge; c can't join (reads a and b); c,d then merge on their own.
    expect(o).toBe("local a,b=1,2 local c,d=a+b,4 print(a,b,c,d)");
  });
});

describe("scratch: dead code after terminator", () => {
  // `break` and `continue` have to end their block, so unreachable code
  // after one only ever appears once branch folding has produced it.
  it("drops code after break", () => {
    const o = out('for i=1,3 do if true then break end print("dead") end');
    expect(o).not.toContain("dead");
  });
  it("drops code after continue", () => {
    const o = out('for i=1,3 do if true then continue end print("dead") end');
    expect(o).not.toContain("dead");
  });
});

// A merged declaration evaluates every value before assigning any of them,
// so it needs a temporary register per name at once. Luau draws locals and
// temporaries from one pool of 200. Counting only the block's own locals
// missed the ones an enclosing block of the same function already held, and
// a real script in the corpus stopped compiling because of it.
describe("merging respects the register pool of the whole function", () => {
  it("stops merging inside a block nested in an already crowded function", () => {
    const outer = Array.from({ length: 170 }, (_, i) => `local v${i}=${i}`).join("\n");
    const inner = Array.from({ length: 20 }, (_, i) => `\tlocal w${i}=${i}`).join("\n");
    const source = `local function f()\n${outer}\ndo\n${inner}\nend\nend\nreturn f`;
    const merged = out(source, noFold);
    // The `w` run sits under a function already holding 170 locals, so it
    // has to stay in short declarations rather than becoming one long one.
    const longest = Math.max(...[...merged.matchAll(/local ([\w,]+)=/g)].map((m) => m[1].split(",").length));
    expect(longest).toBeLessThan(20);
  });

  it("still merges freely in a function with room to spare", () => {
    const source = Array.from({ length: 6 }, (_, i) => `local v${i}=${i}`).join("\n") + "\nprint(v0)";
    expect(out(source, noFold)).toContain("local v0,v1,v2,v3,v4,v5=0,1,2,3,4,5");
  });
});
