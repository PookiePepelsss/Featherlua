import { describe, expect, it } from "vitest";
import { compressAggressive } from "../compress-aggressive";
import { parse } from "../parser";

const bare = { rename: false, removeUnusedLocals: false, propagateConstants: false, foldConstants: false } as const;

function out(src: string, opts?: Parameters<typeof compressAggressive>[1]): string {
  const r = compressAggressive(src, opts);
  if (!r.ok) throw new Error(r.error.message);
  return r.output;
}

describe("hoist-repeated-strings", () => {
  it("hoists a string literal repeated 3+ times", () => {
    const s = '"this is a fairly long repeated payload"';
    const o = out(`print(${s})\nprint(${s})\nprint(${s})`, bare);
    expect(o).toMatch(new RegExp(`^local __str\\d+=${s}print\\(__str\\d+\\)print\\(__str\\d+\\)print\\(__str\\d+\\)$`));
  });

  it("does not hoist when it would not save bytes (short string, few uses)", () => {
    const o = out('print("a")\nprint("a")\nprint("a")', bare);
    expect(o).toBe('print"a"print"a"print"a"');
  });

  it("does not hoist a string used only twice", () => {
    const o = out('print("hello world")\nprint("hello world")', bare);
    expect(o).not.toContain("__str");
  });

  it("hoists into a call argument (RemoteEvent-style) without altering the value", () => {
    const o = out(
      'remote:FireServer("payload text here", 1)\nremote:FireServer("payload text here", 2)\nremote:FireServer("payload text here", 3)',
      bare,
    );
    expect(o).toContain('="payload text here"');
    expect(o).toMatch(/FireServer\(__str\d+,1\)/);
    expect(o).toMatch(/FireServer\(__str\d+,2\)/);
    expect(o).toMatch(/FireServer\(__str\d+,3\)/);
  });

  it("hoists even a conditionally-reached occurrence (strings are side-effect-free to evaluate early)", () => {
    const s = '"this is a fairly long repeated payload"';
    const o = out(`if cond then\n  print(${s})\nend\nprint(${s})\nprint(${s})`, bare);
    expect(o).toContain("__str");
  });

  it("keeps separate hoists per function scope", () => {
    const s = '"this is a fairly long repeated payload"';
    const o = out(
      `local function f()\n  print(${s})\n  print(${s})\n  print(${s})\nend\n` +
        `print(${s})\nprint(${s})\nprint(${s})`,
      bare,
    );
    // two independent hoists, one per scope
    expect((o.match(/__str\d+=/g) ?? []).length).toBe(2);
  });

  it("survives propagateConstants (default options) instead of being immediately inlined back", () => {
    // Regression: propagateConstants treats any never-reassigned local
    // holding a literal as fair game to inline at every use site, which
    // would silently undo this exact hoist if the synthesized local
    // weren't marked to opt out of that pass.
    const s = '"this is a fairly long repeated payload"';
    const o = out(`print(${s})\nprint(${s})\nprint(${s})`); // default options: propagateConstants on
    expect(o).toContain("local ");
    expect((o.match(new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length).toBe(1);
  });

  it("is idempotent across re-compression, even with two competing hoist candidates", () => {
    // Regression: compressing the output again used to inline the hoisted
    // string and hoist the other one instead, swapping the two forever
    // rather than settling. Fixed by giving propagateConstants the same
    // savings threshold, so it cannot undo a hoist this pass would redo.
    const src =
      'local function greet()\n' +
      '  print("this is a fairly long repeated payload one")\n' +
      '  print("this is a fairly long repeated payload one")\n' +
      '  print("this is a fairly long repeated payload one")\n' +
      'end\n' +
      'local function warn2()\n' +
      '  print("this is a fairly long repeated payload two")\n' +
      '  print("this is a fairly long repeated payload two")\n' +
      '  print("this is a fairly long repeated payload two")\n' +
      'end\n' +
      'greet()\n' +
      'warn2()';
    const first = out(src);
    const second = out(first);
    expect(second).toBe(first);
    // Both strings hoisted (appear once each), not just whichever one
    // "won" this round -- each shows up 1x as a declaration's literal,
    // never inline at any of its 3 use sites.
    expect((first.match(/payload one/g) ?? []).length).toBe(1);
    expect((first.match(/payload two/g) ?? []).length).toBe(1);
  });

  it("output remains valid, re-parseable Luau", () => {
    const s = '"this is a fairly long repeated payload"';
    const result = compressAggressive(`print(${s})\nprint(${s})\nprint(${s})`, bare);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("__str");
    expect(() => parse(result.output)).not.toThrow();
  });

  it("respects the toggle: off leaves strings inline", () => {
    const s = '"this is a fairly long repeated payload"';
    const o = out(`print(${s})\nprint(${s})\nprint(${s})`, { ...bare, hoistRepeatedStrings: false });
    expect(o).not.toContain("__str");
  });
});

// The pass used to refuse anything seen fewer than three times, which its
// own cost model disagreed with: with renaming on, a two-character name
// pays for the declaration once the literal is long enough.
describe("a string seen twice", () => {
  it("hoists when the literal is long enough to pay for the declaration", () => {
    const s = '"a payload long enough that two uses already pay for the local"';
    const o = out(`print(${s})\nprint(${s})`);
    // Hoisted, so the literal itself is written once and both uses read it.
    expect(o.indexOf("a payload")).toBe(o.lastIndexOf("a payload"));
    expect(o).toMatch(/^local \w+="a payload[^"]*"print\(\w+\)print\(\w+\)$/);
  });

  it("leaves a short one alone, where the declaration costs more than it saves", () => {
    const s = '"short"';
    const o = out(`print(${s})\nprint(${s})`);
    expect(o).toBe('print"short"print"short"');
  });
});
