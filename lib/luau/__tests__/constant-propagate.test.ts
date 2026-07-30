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
