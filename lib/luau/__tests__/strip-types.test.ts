import { describe, expect, it } from "vitest";
import { compressAggressive } from "../compress-aggressive";
import { parse } from "../parser";

// removeUnusedLocals is disabled throughout: these tests use minimal
// `local x = ...` snippets with no subsequent read, specifically to test
// type stripping in isolation. See remove-unused-locals.test.ts for that
// pass.
function compressNoUnusedCleanup(source: string) {
  return compressAggressive(source, { removeUnusedLocals: false });
}

describe("Aggressive mode strips type annotations (zero runtime effect in Luau)", () => {
  it("removes param/return type annotations", () => {
    const result = compressNoUnusedCleanup("local function f(a: number, b: string): boolean return true end");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).not.toContain(":number");
    expect(result.output).not.toContain(":string");
    expect(result.output).not.toContain(":boolean");
    // `f` (root scope) -> "a"; its params start from the next free index
    // in the function's own (child) scope -> "b","c".
    expect(result.output).toBe("local function a(b,c)return true end");
  });

  it("removes local variable type annotations", () => {
    const result = compressNoUnusedCleanup("local x: number = 1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("local a=1");
  });

  it("removes generics on functions", () => {
    const result = compressNoUnusedCleanup("local function identity<T>(x: T): T return x end");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).not.toContain("<T>");
    expect(result.output).toBe("local function a(b)return b end");
  });

  it("drops `type` alias declarations entirely", () => {
    const result = compressNoUnusedCleanup("type Point = { x: number, y: number }\nlocal x = 1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).not.toContain("type");
    expect(result.output).toBe("local a=1");
  });

  it("drops `export type` alias declarations entirely", () => {
    const result = compressNoUnusedCleanup("export type Alias<T> = T | nil\nlocal x = 1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("local a=1");
  });

  it("unwraps type-assertion expressions to just their value", () => {
    const result = compressNoUnusedCleanup("local x = 1 :: number");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("local a=1");
  });

  it("unwraps a type assertion before folding the exposed expression", () => {
    const result = compressNoUnusedCleanup("local x = 1 + (2 :: number)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("local a=3");
  });

  it("removes local attributes' type annotation but keeps the attribute itself (canonical <attrib>: Type order)", () => {
    const result = compressNoUnusedCleanup("local x <const>: number = 1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // `>` needs a space before `=` (else it would read as the `>=` operator).
    expect(result.output).toBe("local a<const> =1");
  });

  it("removes typed varargs' type", () => {
    const result = compressNoUnusedCleanup("local function f(...: number) return ... end");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("local function a(...)return...end");
  });

  it("stripped output is still valid Luau and preserves runtime semantics", () => {
    const source = `
      type Point = { x: number, y: number }
      local function distance(a: Point, b: Point): number
        return ((a.x - b.x) :: number) ^ 2
      end
    `;
    const result = compressAggressive(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(() => parse(result.output)).not.toThrow();
  });
});
