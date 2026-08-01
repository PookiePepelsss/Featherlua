import { describe, expect, it } from "vitest";
import {
  compressAggressive,
  type AggressiveOptions,
} from "../compress-aggressive";

const noPasses: AggressiveOptions = {
  rename: false,
  foldConstants: false,
  propagateConstants: false,
  removeUnusedLocals: false,
  mergeAdjacentLocals: false,
  mergeAdjacentAssigns: false,
  hoistRepeatedStrings: false,
  stripTypes: false,
  hoistRepeatedAccess: false,
  aliasRepeatedGlobalCalls: false,
  mergeAdjacentAssignsAcrossFields: false,
};

function output(source: string, options: Partial<AggressiveOptions> = {}): string {
  const result = compressAggressive(source, { ...noPasses, ...options });
  if (!result.ok) throw new Error(result.error.message);
  return result.output;
}

describe("trust regressions: string folding", () => {
  it("does not let a decimal escape absorb digits from the next string", () => {
    const result = output('return "\\1" .. "23"', { foldConstants: true });
    expect(result).toContain('"\\1".."23"');
    expect(result).not.toContain('"\\123"');
  });

  it("does not let a trailing z escape absorb whitespace from the next string", () => {
    const result = output('return "\\z" .. "  value"', { foldConstants: true });
    expect(result).toContain('"\\z".."  value"');
  });

  it("still folds ordinary unescaped strings", () => {
    expect(output('return "ab" .. "cd"', { foldConstants: true })).toBe('return"abcd"');
  });
});

describe("trust regressions: evaluation order", () => {
  it("does not move an indexed read ahead of an earlier store", () => {
    const result = output("a=1\nb=t.x\nreturn a,b", { mergeAdjacentAssigns: true });
    expect(result).toContain("a=1 b=t.x");
    expect(result).not.toContain("a,b=1,t.x");
  });

  it("still merges assignments whose later values are inert", () => {
    expect(output("a=1\nb=2\nreturn a,b", { mergeAdjacentAssigns: true })).toBe(
      "a,b=1,2 return a,b",
    );
  });

  it("does not merge a close variable across a later throwing initializer", () => {
    const result = output(
      "local guard <close> = acquire()\nlocal value = risky()\nreturn value",
      { mergeAdjacentLocals: true },
    );
    expect(result.match(/local /g)).toHaveLength(2);
    expect(result).toContain("acquire()local value=risky()");
    expect(result).not.toContain("local guard<close>,value=");
  });

  it("still merges adjacent locals initialized by literals", () => {
    expect(output("local a=1\nlocal b=2\nreturn a,b", { mergeAdjacentLocals: true })).toBe(
      "local a,b=1,2 return a,b",
    );
  });
});

describe("trust regressions: unused initializers", () => {
  it("keeps a table constructor whose nil key throws", () => {
    expect(output("local unused={[nil]=1}\nprint(1)", { removeUnusedLocals: true })).toContain(
      "[nil]=1",
    );
  });

  it("keeps an unresolved global read because the environment can be observable", () => {
    expect(output("local unused=possiblyMissing\nprint(1)", { removeUnusedLocals: true })).toContain(
      "possiblyMissing",
    );
  });

  it("still removes a table made only from safe fields", () => {
    expect(output("local unused={1,name='ok'}\nprint(1)", { removeUnusedLocals: true })).toBe(
      "print(1)",
    );
  });
});

describe("trust regressions: reflection-aware fallback", () => {
  const executorReflectionNames = [
    "getgc",
    "getreg",
    "getregistry",
    "getupvalue",
    "getupvalues",
    "setupvalue",
    "getconstants",
    "getconstant",
    "setconstant",
    "getproto",
    "getprotos",
    "setproto",
    "getstack",
    "setstack",
    "getlocal",
    "setlocal",
    "getscriptclosure",
    "getscriptfunction",
    "getscriptbytecode",
    "dumpstring",
  ];

  for (const name of executorReflectionNames) {
    it(`falls back conservatively when ${name} is referenced`, () => {
      const result = compressAggressive(`local capturedValue=1\n${name}(target)\nreturn capturedValue`);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.warning).toContain("Reflection-sensitive");
      expect(result.output).toContain("local capturedValue=1");
    });
  }

  it("preserves an upvalue that debug.setupvalue addresses by slot", () => {
    const source =
      "local capturedValue=1\n" +
      "local function readValue() return capturedValue end\n" +
      "debug.setupvalue(readValue,1,2)\n" +
      "return readValue()";
    const result = compressAggressive(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warning).toContain("Reflection-sensitive");
    expect(result.output).toContain("local capturedValue=1");
    expect(result.output).toContain("local function readValue()");
  });

  it("recognizes namespaced executor debug APIs", () => {
    const result = compressAggressive("local preservedName=1\ndebug.getconstants(target)\nreturn preservedName");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warning).toContain("Reflection-sensitive");
    expect(result.output).toContain("local preservedName=1");
  });

  it("recognizes method and indexed spellings of reflection APIs", () => {
    for (const call of ["executor:getconstants(target)", "debug['setupvalue'](target,1,2)"]) {
      const result = compressAggressive(`local preservedName=1\n${call}\nreturn preservedName`);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.warning).toContain("Reflection-sensitive");
      expect(result.output).toContain("local preservedName=1");
    }
  });

  it("does not treat ordinary debug profiling as layout reflection", () => {
    const result = compressAggressive("debug.profilebegin('x')\nprint(1)\ndebug.profileend()");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warning).toBeUndefined();
  });
});
