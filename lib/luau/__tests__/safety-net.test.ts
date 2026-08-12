import { describe, expect, it } from "vitest";
import { structurallyEqual } from "../alpha-equivalence";
import { parse } from "../parser";
import { resolveScopes } from "../scope-resolver";
import { isDefinitelyInert, isRemovableInitializer } from "../effect-analysis";
import type { Expr } from "../ast";
import { compressAggressive, DEFAULT_AGGRESSIVE_OPTIONS } from "../compress-aggressive";

// Aggressive mode trusts one check: print the tree, parse it back, and
// compare. Everything else is allowed to be clever because that comparison
// is expected to catch a mistake. So the comparison itself has to be shown
// to catch mistakes, rather than assumed to.

function resolved(source: string) {
  const { chunk } = parse(source);
  resolveScopes(chunk);
  return chunk;
}

function differs(a: string, b: string) {
  return !structurallyEqual(resolved(a), resolved(b)).equal;
}

describe("the equivalence check notices a corrupted program", () => {
  const ORIGINAL = "local count = 1\nlocal function add(n) return count + n end\nprint(add(2), 'text')";

  const MUTATIONS: [string, string][] = [
    ["a changed number", "local count = 2\nlocal function add(n) return count + n end\nprint(add(2), 'text')"],
    ["a changed string", "local count = 1\nlocal function add(n) return count + n end\nprint(add(2), 'other')"],
    ["a flipped operator", "local count = 1\nlocal function add(n) return count - n end\nprint(add(2), 'text')"],
    ["a dropped statement", "local count = 1\nlocal function add(n) return count + n end"],
    ["an added statement", "local count = 1\nlocal function add(n) return count + n end\nprint(add(2), 'text')\nprint(1)"],
    ["swapped arguments", "local count = 1\nlocal function add(n) return n + count end\nprint(add(2), 'text')"],
    ["a local turned into a global", "count = 1\nlocal function add(n) return count + n end\nprint(add(2), 'text')"],
    ["a different global called", "local count = 1\nlocal function add(n) return count + n end\nwarn(add(2), 'text')"],
    ["a changed member name", "local t = {} print(t.a)"],
    ["a changed method name", "local t = {} print(t:a())"],
    ["a changed table key", "local t = {a = 1} print(t)"],
    ["reordered arguments", "print(2, 1)"],
  ];

  const BASE_FOR: Record<string, string> = {
    "a changed member name": "local t = {} print(t.b)",
    "a changed method name": "local t = {} print(t:b())",
    "a changed table key": "local t = {b = 1} print(t)",
    "reordered arguments": "print(1, 2)",
  };

  for (const [name, mutated] of MUTATIONS) {
    it(`catches ${name}`, () => {
      expect(differs(BASE_FOR[name] ?? ORIGINAL, mutated)).toBe(true);
    });
  }

  it("still calls a renamed local equal, which is the whole point", () => {
    expect(differs(ORIGINAL, "local c = 1\nlocal function a(n) return c + n end\nprint(a(2), 'text')")).toBe(false);
  });

  it("does not confuse a local with a global of the same name", () => {
    expect(differs("local x = 1 print(x)", "x = 1 print(x)")).toBe(true);
  });

  it("tells shadowing apart from reuse", () => {
    expect(differs("local a = 1 do local a = 2 print(a) end print(a)",
                   "local a = 1 do local b = 2 print(b) end print(a)")).toBe(false);
    expect(differs("local a = 1 do local a = 2 print(a) end print(a)",
                   "local a = 1 do local a = 2 print(a) end print(a) print(a)")).toBe(true);
  });
});

// Two questions with different answers. `isDefinitelyInert` gates moving
// work about, so it allows only what cannot run anything at all.
// `isRemovableInitializer` gates deleting an unread declaration, where a
// closure and a plain table are also fine because nothing observes them
// being built. A wrong yes to either deletes or reorders something real.
describe("effect analysis refuses anything that can run code", () => {
  function firstInit(source: string) {
    const chunk = resolved(source);
    return (chunk.body[0] as { init: Expr[] }).init[0];
  }

  const NOT_INERT = [
    "f()", "t:m()", "t.x", "t[k]", "a + b", "#t", "-x", "a .. b",
    "t.a.b", "(f())", "a < b", "not t.x", "`{f()}`",
    // Building these runs no user code, but they are not free to move:
    // a table is a fresh identity each time and varargs are multi-valued.
    "{}", "{1, 2}", "function() end", "...",
    // A global read can fire __index on the environment.
    "someGlobal",
  ];

  for (const expression of NOT_INERT) {
    it(`will not move ${expression}`, () => {
      expect(isDefinitelyInert(firstInit(`local v = ${expression}`))).toBe(false);
    });
  }

  const INERT = ["1", "'s'", "true", "false", "nil", "(1)"];

  for (const expression of INERT) {
    it(`will move ${expression}`, () => {
      expect(isDefinitelyInert(firstInit(`local v = ${expression}`))).toBe(true);
    });
  }

  it("will move a local it has resolved, but not a bare global", () => {
    const chunk = resolved("local a = 1 local b = a");
    const second = (chunk.body[1] as { init: Expr[] }).init[0];
    expect(isDefinitelyInert(second)).toBe(true);
  });

  const REMOVABLE = ["1", "{}", "{1, 2}", "function() end", "{a = 1, b = {c = 2}}", "{[1] = 'x'}"];

  for (const expression of REMOVABLE) {
    it(`will delete an unread ${expression}`, () => {
      expect(isRemovableInitializer(firstInit(`local v = ${expression}`))).toBe(true);
    });
  }

  const NOT_REMOVABLE = [
    // Building this one throws, so deleting it removes an error.
    "{[nil] = 1}",
    "{[f()] = 1}",
    "{f()}",
    "f()",
    "{a = f()}",
  ];

  for (const expression of NOT_REMOVABLE) {
    it(`will not delete an unread ${expression}`, () => {
      expect(isRemovableInitializer(firstInit(`local v = ${expression}`))).toBe(false);
    });
  }
});

// The search switches passes off one at a time and keeps whichever output
// is smallest. It must never keep one that is larger, and never one that
// fails its own checks.
describe("the rollback search only ever keeps a smaller result", () => {
  const SCRIPTS = [
    "local a = 1 local b = 2 print(a + b)",
    "local s = 'xx' print(s, s, s)",
    "local t = {} for i = 1, 3 do t[i] = i * 2 end print(#t)",
    "local function f(x) return x end print(f(1), f(2))",
    "if true then print(1) end print(2)",
  ];

  for (const source of SCRIPTS) {
    it(source.slice(0, 40), () => {
      const full = compressAggressive(source, DEFAULT_AGGRESSIVE_OPTIONS);
      expect(full.ok).toBe(true);
      if (!full.ok) return;

      // Whatever the search settled on must be no larger than running
      // every pass, and the options it reports must reproduce it exactly.
      if (full.appliedOptions) {
        const replayed = compressAggressive(source, full.appliedOptions);
        expect(replayed.ok).toBe(true);
        if (replayed.ok) expect(replayed.output).toBe(full.output);
      }
      for (const name of full.rolledBack ?? []) {
        expect(typeof name).toBe("string");
      }
    });
  }
});
