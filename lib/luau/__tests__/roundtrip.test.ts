import { describe, expect, it } from "vitest";
import { parse } from "../parser";
import { resolveScopes } from "../scope-resolver";
import { structurallyEqual } from "../alpha-equivalence";
import { compressAggressive, transformForAggressive } from "../compress-aggressive";
import { computeRenameMap } from "../renamer";
import { loadFixtures } from "./fixtures";
import type { LocalStat } from "../ast";

describe("round-trip: alpha-equivalence after renaming", () => {
  for (const fixture of loadFixtures()) {
    it(fixture.name, () => {
      // The baseline runs through the same transforms the real pipeline
      // does, since what is being tested is equivalence after intentional
      // simplification, not an identical tree. Reusing
      // transformForAggressive rather than relisting the passes here keeps
      // it from drifting when one is added or reordered.
      const result = compressAggressive(fixture.source);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const original = transformForAggressive(parse(fixture.source).chunk, result.appliedOptions);
      const reparsed = resolveScopes(parse(result.output).chunk);
      const cmp = structurallyEqual(original.chunk, reparsed.chunk);
      expect(cmp.equal, cmp.reason).toBe(true);
    });
  }

  it("shrinks or preserves size relative to the original (never grows meaningfully)", () => {
    for (const fixture of loadFixtures()) {
      const result = compressAggressive(fixture.source);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      // Not a strict invariant (short single-token fixtures can be equal
      // length), but output should never be dramatically larger.
      expect(result.output.length).toBeLessThanOrEqual(fixture.source.length + 5);
    }
  });
});

describe("round-trip: renaming actually happens (alpha-equivalence alone can't prove this)", () => {
  it("a distinctive original local name does not survive as a whole word in the output", () => {
    const source = "local myVeryLongVariableName = 1\nprint(myVeryLongVariableName)";
    const result = compressAggressive(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).not.toMatch(/\bmyVeryLongVariableName\b/);
  });

  it("computeRenameMap assigns at least one entry when the source declares a local", () => {
    const { chunk } = parse("local x = 1");
    const resolved = resolveScopes(chunk);
    expect(computeRenameMap(resolved).size).toBeGreaterThan(0);
  });

  it("gives shorter names to frequently referenced locals", () => {
    const declarations = Array.from({ length: 27 }, (_, index) => `local value${index}=${index}`).join("\n");
    const { chunk } = parse(`${declarations}\nreturn ${Array(12).fill("value26").join(",")}`);
    const resolved = resolveScopes(chunk);
    const last = resolved.rootScope.declaredOrder[26];
    expect(computeRenameMap(resolved).get(last)).toBe("a");
  });

  it("uses all one-letter identifiers before two-letter names", () => {
    const declarations = Array.from({ length: 53 }, (_, index) => `local value${index}=${index}`).join("\n");
    const resolved = resolveScopes(parse(declarations).chunk);
    const names = [...computeRenameMap(resolved).values()];
    expect(names.slice(0, 52).every((name) => name.length === 1)).toBe(true);
    expect(names[52]).toBe("aa");
  });

  it("globals, member names, method names, and string contents are never renamed", () => {
    const source = 'local greeting = "myVeryLongVariableName"\nprint(greeting)\nmyVeryLongVariableName.field = 1\nobj:myVeryLongVariableName()';
    const result = compressAggressive(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // The global call target, the member/method names, and the string
    // literal's contents must all survive verbatim.
    expect(result.output).toContain('"myVeryLongVariableName"');
    expect(result.output).toContain(".field");
    expect(result.output).toContain(":myVeryLongVariableName(");
    expect((result.output.match(/myVeryLongVariableName/g) ?? []).length).toBe(3);
  });

  it("a generated local name never shadows a global the program relies on", () => {
    // Force the very first generated name ("a") to collide with a global
    // reference; the renamer must skip past it for the local.
    const source = "local x = a\nlocal y = x + 1";
    const result = compressAggressive(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const reparsed = resolveScopes(parse(result.output).chunk);
    // `a` (the global) must still resolve as a global reference somewhere,
    // and no local should have been renamed to the literal text "a".
    const xDecl = (reparsed.chunk.body[0] as LocalStat).names[0];
    expect(xDecl.name).not.toBe("a");
  });
});

describe("round-trip: license/shebang preservation matches Safe mode's contract", () => {
  it("preserves shebang and @license comments verbatim, prepended to output", () => {
    const result = compressAggressive("#!/usr/bin/env luau\n-- @license MIT\nlocal x = 1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output.startsWith("#!/usr/bin/env luau\n-- @license MIT\n")).toBe(true);
  });

  it("drops ordinary comments", () => {
    const result = compressAggressive("-- just a note\nlocal x = 1 -- trailing");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).not.toMatch(/note|trailing/);
  });
});

describe("compressAggressive error handling", () => {
  it("returns ok:false with a message and position on malformed input", () => {
    const result = compressAggressive("local x = ");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.line).toBeGreaterThan(0);
    expect(result.error.message.length).toBeGreaterThan(0);
  });
});
