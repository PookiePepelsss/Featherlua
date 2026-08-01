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
    // Regression: re-parsing already-hoisted output turned `local x =
    // "..."` back into an ordinary-looking candidate for
    // propagateConstants (the "synthetic" marker doesn't survive being
    // printed as text), which inlined it right back out -- while the
    // *other* repeated string, now freshly duplicated 3x in the text,
    // became eligible for hoisting instead. Every re-compress just swapped
    // which string was hoisted, so output oscillated between two
    // different sizes forever instead of settling. Fixed by making
    // propagateConstants respect the same byte-savings threshold
    // hoist-repeated-strings.ts uses, so it can never undo a hoist that
    // pass would make again on the next pass.
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
