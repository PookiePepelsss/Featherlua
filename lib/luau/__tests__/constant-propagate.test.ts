import { describe, expect, it } from "vitest";
import { compressAggressive } from "../compress-aggressive";
import { parse } from "../parser";

function output(source: string): string {
  const result = compressAggressive(source);
  if (!result.ok) throw new Error(`expected ok:true, got error: ${result.error.message}`);
  return result.output;
}

describe("constant propagation: the motivating case", () => {
  it("`local DEBUG = false; if DEBUG then ... end` eliminates the whole branch end to end", () => {
    // This is the exact pattern optimize.ts alone cannot touch (it only
    // recognizes a literal `true`/`false` written directly in the `if`,
    // not a variable that happens to always hold one) -- propagation is
    // what turns `if DEBUG then` into `if false then`, which optimize()
    // then eliminates on the next loop iteration.
    expect(output("local DEBUG = false\nif DEBUG then print(1) end")).toBe("");
  });

  it("a `local DEBUG = true` flag keeps its guarded branch, unconditionally", () => {
    expect(output("local DEBUG = true\nif DEBUG then print(1) end")).toBe("do print(1)end");
  });

  it("propagates through a chain over multiple iterations (a -> b -> use)", () => {
    // local b = a` is not itself a literal init, so it doesn't propagate
    // to `print(b)` in the same pass a's substitution happens in -- the
    // fold-then-propagate loop is what converges this across iterations.
    expect(output("local a = 60 * 60\nlocal b = a * 24\nprint(b)")).toBe("print(86400)");
  });
});

describe("constant propagation: safety boundaries", () => {
  it("does not propagate a local that is ever reassigned", () => {
    const result = compressAggressive("local x = 1\nx = 2\nprint(x)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).not.toContain("print(1)");
    expect(result.output).toContain("print(a)");
  });

  it("does not propagate a local that is ever compound-reassigned", () => {
    const result = compressAggressive("local x = 1\nx += 1\nprint(x)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).not.toMatch(/print\(1\)|print\(2\)/);
  });

  it("does not propagate a table constructor (would break reference identity)", () => {
    const source = "local t = {1, 2, 3}\nlocal function mutate(tbl) tbl[1] = 99 end\nmutate(t)\nprint(t[1])";
    const result = compressAggressive(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // `t` must survive as a real local passed by reference, not be cloned
    // into two separate literal table constructors at each use site.
    const { chunk } = parse(result.output);
    expect(chunk.body[0].type).toBe("LocalStat");
  });

  it("does not propagate a <close> local (would eliminate its scope-exit side effect)", () => {
    const result = compressAggressive("local guard <close> = 5\nprint(1)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("<close>");
  });

  it("propagation alone does not remove a declaration with zero references just because its value is literal", () => {
    // Confirms propagation is scoped to actual substitution, not a general
    // unused-variable-elimination pass -- that's a separate, deliberately
    // distinct pass (see remove-unused-locals.ts and its tests), which
    // this test disables to isolate propagation's own boundary.
    const result = compressAggressive("local unused = 5", { removeUnusedLocals: false });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("local a=5");
  });

  it("a local shadowing an outer one of the same name only propagates within its own scope", () => {
    const source = "local x = 1\ndo\n  local x = 2\n  print(x)\nend\nprint(x)";
    const result = compressAggressive(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // The inner `do...end` wrapper survives (only eliminated if-branches
    // lose theirs); each `x` correctly propagates its own scope's value.
    expect(result.output).toBe("do print(2)end print(1)");
  });
});

describe("propagateConstants: number byte-savings gate", () => {
  it("keeps a repeated long number as a local instead of inlining it everywhere", () => {
    const result = compressAggressive("local GRAVITY = 196.2\nprint(GRAVITY,GRAVITY,GRAVITY,GRAVITY,GRAVITY)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("local a=196.2 print(a,a,a,a,a)");
  });

  it("still inlines a short number even when repeated (already cheaper than any local)", () => {
    const result = compressAggressive("local x = 1\nprint(x,x,x,x,x)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("print(1,1,1,1,1)");
  });

  it("still inlines a single-use number regardless of length (no local overhead to weigh against)", () => {
    const result = compressAggressive("local GRAVITY = 196.2\nprint(GRAVITY)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("print(196.2)");
  });

  it("without renaming, uses the real original name's length instead of assuming it shrinks", () => {
    // "GRAVITY" (7 chars) is longer than "196.2" (5 chars), so even kept
    // as a local it costs more than just repeating the number -- correctly
    // inlines here, unlike the renamed case above where the local becomes
    // a single letter.
    const result = compressAggressive("local GRAVITY = 196.2\nprint(GRAVITY,GRAVITY,GRAVITY,GRAVITY,GRAVITY)", {
      rename: false,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("print(196.2,196.2,196.2,196.2,196.2)");

    // But a short original name IS worth keeping, even without renaming.
    const kept = compressAggressive("local g = 196.2\nprint(g,g,g,g,g)", { rename: false });
    expect(kept.ok).toBe(true);
    if (!kept.ok) return;
    expect(kept.output).toBe("local g=196.2 print(g,g,g,g,g)");
  });

  it("output remains valid, re-parseable Luau", () => {
    const result = compressAggressive("local GRAVITY = 196.2\nprint(GRAVITY,GRAVITY,GRAVITY,GRAVITY,GRAVITY)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(() => parse(result.output)).not.toThrow();
  });
});

describe("propagateConstants: nil/boolean byte-savings gate", () => {
  it("does not affect the single-use DEBUG-flag dead-branch idiom", () => {
    const result = compressAggressive("local DEBUG = false\nif DEBUG then print(1) end\nprint(2)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("print(2)");
  });

  it("still inlines true/false when the literal is shorter than any local would be", () => {
    const result = compressAggressive(
      "local ENABLE_FEATURE_X = true\nprint(ENABLE_FEATURE_X,ENABLE_FEATURE_X,ENABLE_FEATURE_X,ENABLE_FEATURE_X,ENABLE_FEATURE_X)",
      { rename: false },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("print(true,true,true,true,true)");
  });

  it("keeps a repeated nil as a local when renaming makes that cheaper than repeating \"nil\"", () => {
    const result = compressAggressive("local EMPTY = nil\nprint(EMPTY,EMPTY,EMPTY,EMPTY,EMPTY,EMPTY)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Also picks up remove-nil-declaration's own further simplification.
    expect(result.output).toBe("local a print(a,a,a,a,a,a)");
  });

  it("output remains valid, re-parseable Luau", () => {
    const result = compressAggressive("local EMPTY = nil\nprint(EMPTY,EMPTY,EMPTY,EMPTY,EMPTY,EMPTY)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(() => parse(result.output)).not.toThrow();
  });
});
