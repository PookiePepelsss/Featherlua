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

describe("trust regressions: reflection warnings do not change selected options", () => {
  const layoutReflectionNames = [
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
  ];

  for (const name of layoutReflectionNames) {
    it(`warns without disabling compression when ${name} is referenced`, () => {
      const result = compressAggressive(`local capturedValue=1\n${name}(target)\nreturn capturedValue`);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.warning).toContain("reflection/executor APIs");
      expect(result.warning).toContain("options remain enabled");
      expect(result.output).not.toContain("capturedValue");
    });
  }

  it("warns separately for bytecode inspection", () => {
    for (const name of ["getscriptbytecode", "dumpstring"]) {
      const result = compressAggressive(`${name}(target)`);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.warning).toContain("compiled bytecode");
    }
  });

  it("does not flag executor APIs that do not inspect compiler layout", () => {
    for (const name of ["getscriptclosure", "getscriptfunction"]) {
      const result = compressAggressive(`${name}(target)`);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.warning).toBeUndefined();
    }
  });

  it("warns only about options relevant to constant inspection", () => {
    const result = compressAggressive("debug.getconstants(target)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warning).toContain("Fold constants");
    expect(result.warning).not.toContain("Rename locals");
    expect(result.warning).not.toContain("Merge adjacent assigns");
  });

  it("includes local renaming for upvalue inspection", () => {
    const result = compressAggressive("debug.getupvalues(target)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warning).toContain("Rename locals");
  });

  it("warns about debug metadata even when transforms are disabled", () => {
    const result = compressAggressive("debug.info(target, 'n')", noPasses);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warning).toContain("line information");
  });

  it("warns but does not preserve layout automatically for debug.setupvalue", () => {
    const source =
      "local capturedValue=1\n" +
      "local function readValue() return capturedValue end\n" +
      "debug.setupvalue(readValue,1,2)\n" +
      "return readValue()";
    const result = compressAggressive(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warning).toContain("reflection/executor APIs");
    expect(result.output).not.toContain("capturedValue");
    expect(result.output).not.toContain("readValue");
  });

  it("recognizes namespaced executor debug APIs", () => {
    const result = compressAggressive("local preservedName=1\ndebug.getconstants(target)\nreturn preservedName");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warning).toContain("reflection/executor APIs");
    expect(result.output).not.toContain("preservedName");
  });

  it("recognizes method and indexed spellings of reflection APIs", () => {
    for (const call of ["executor:getconstants(target)", "debug['setupvalue'](target,1,2)"]) {
      const result = compressAggressive(`local preservedName=1\n${call}\nreturn preservedName`);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.warning).toContain("reflection/executor APIs");
      expect(result.output).not.toContain("preservedName");
    }
  });

  it("does not warn when no reflection-sensitive option is selected", () => {
    const result = compressAggressive("getgc(target)", noPasses);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warning).toBeUndefined();
  });

  it("does not treat ordinary debug profiling as layout reflection", () => {
    const result = compressAggressive("debug.profilebegin('x')\nprint(1)\ndebug.profileend()");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warning).toBeUndefined();
  });
});

describe("renamer: eliminated locals do not reserve short names", () => {
  it("nested scopes still get single-character names after many locals are removed", () => {
    const dead = Array.from({ length: 45 }, (_, index) => `local dead${index} = ${index}`).join("\n");
    const live = Array.from({ length: 10 }, (_, index) => `local live${index} = tostring(${index})`).join("\n");
    const uses = Array.from({ length: 10 }, (_, index) => `live${index}`).join(",");
    const source =
      `${dead}\n${live}\n` +
      "local function nested(p1,p2,p3,p4,p5)\n local n1,n2,n3 = p1,p2,p3\n return n1..n2..n3..p4..p5\nend\n" +
      `print(${uses},nested("a","b","c","d","e"))`;

    const result = compressAggressive(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const params = /function \w+\(([^)]*)\)/.exec(result.output);
    expect(params).not.toBeNull();
    for (const name of params![1].split(",")) expect(name.length).toBe(1);
  });

  it("reaches a fixed point in a single pass", () => {
    const source =
      "local unusedA = 1\nlocal unusedB = 2\nlocal kept = tostring(3)\n" +
      "local function inner(a, b) local c = a .. b return c end\n" +
      "print(kept, inner('x', 'y'))";
    const first = compressAggressive(source);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = compressAggressive(first.output);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.output).toBe(first.output);
  });
});
