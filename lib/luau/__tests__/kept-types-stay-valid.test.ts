import { describe, expect, it } from "vitest";
import { compressAggressive } from "../compress-aggressive";

// Type spans are captured as opaque token runs and reprinted verbatim, so
// a name inside one is invisible to the renamer and to the passes that
// delete unused locals. With `stripTypes` off, that left annotations
// pointing at locals that had been renamed or removed: still valid Luau at
// runtime, since types are erased, but broken for anything that reads the
// types (strict mode, Studio analysis, tooling). Those names are now
// pinned.
const CASES = [
  {
    name: "typeof in a type alias",
    source: 'local myLocalName = 5\ntype T = typeof(myLocalName)\nlocal v: T = 7\nprint(v)',
    mentions: ["myLocalName"],
  },
  {
    name: "typeof in a parameter annotation",
    source: 'local base = "s"\nlocal function f(x: typeof(base)) return x end\nprint(f("q"))',
    mentions: ["base"],
  },
  {
    name: "typeof in a return annotation",
    source: 'local seed = 1\nlocal function g(): typeof(seed) return 2 end\nprint(g())',
    mentions: ["seed"],
  },
  {
    name: "typeof inside a generic argument",
    source: 'local cap = {}\ntype Box<T> = {v: T}\nlocal b: Box<typeof(cap)> = {v = cap}\nprint(type(b.v))',
    mentions: ["cap"],
  },
  {
    name: "typeof in a type assertion",
    source: 'local anchor = 1\nlocal function h(x) return (x :: typeof(anchor)) end\nprint(h(4))',
    mentions: ["anchor"],
  },
];

describe("annotations kept by the user still name real locals", () => {
  for (const scenario of CASES) {
    it(`${scenario.name}: declaration survives under its own name`, () => {
      const result = compressAggressive(scenario.source, { stripTypes: false });
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      for (const mention of scenario.mentions) {
        expect(result.output, `annotation mentions ${mention}`).toContain(mention);
        const declared = new RegExp(`\\b(local|function)[^\\n]*\\b${mention}\\b`);
        expect(declared.test(result.output), `${mention} is still declared in: ${result.output}`).toBe(true);
      }
    });

    it(`${scenario.name}: stripping types instead drops the names entirely`, () => {
      const result = compressAggressive(scenario.source);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      for (const mention of scenario.mentions) {
        expect(result.output).not.toContain(mention);
      }
    });
  }
});
