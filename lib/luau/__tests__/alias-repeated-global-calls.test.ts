import { describe, expect, it } from "vitest";
import { compressAggressive } from "../compress-aggressive";
import { parse } from "../parser";

const isolated = { removeUnusedLocals: false, propagateConstants: false, foldConstants: false } as const;

function out(src: string, opts?: Parameters<typeof compressAggressive>[1]): string {
  const r = compressAggressive(src, { ...isolated, aliasRepeatedGlobalCalls: true, ...opts });
  if (!r.ok) throw new Error(r.error.message);
  return r.output;
}

describe("alias-repeated-global-calls: off by default", () => {
  it("does nothing unless explicitly enabled", () => {
    const result = compressAggressive('setmetatable(a,b)setmetatable(a,b)setmetatable(a,b)');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).not.toContain("__fn");
  });
});

describe("alias-repeated-global-calls: the motivating case", () => {
  it("aliases a bare global function called enough times, given a long enough name to be worth it", () => {
    const o = out('setmetatable(t,m)setmetatable(t,m)setmetatable(t,m)setmetatable(t,m)', { rename: false });
    expect(o).toMatch(
      /^local __fn\d+=setmetatable __fn\d+\(t,m\)__fn\d+\(t,m\)__fn\d+\(t,m\)__fn\d+\(t,m\)$/,
    );
  });

  it("with renaming on (default), a shorter name needs more call sites to be worth it", () => {
    // "warn" (4 chars) doesn't clear the gate at 3 calls even optimistically
    // assuming the alias renames down to 1 char, but does at 5+.
    const o3 = out('warn(1)warn(1)warn(1)', { rename: true });
    expect(o3).not.toContain("__fn");
    const o5 = out('warn(1)warn(1)warn(1)warn(1)warn(1)', { rename: true });
    expect(o5).toMatch(/^local \w+=warn /);
  });

  it("does not alias when called only twice", () => {
    const o = out('setmetatable(a,b)setmetatable(a,b)', { rename: false });
    expect(o).not.toContain("__fn");
  });

  it("does not alias a name already as short as any alias could be", () => {
    const o = out("f()f()f()f()f()f()", { rename: false });
    expect(o).toBe("f()f()f()f()f()f()");
  });
});

describe("alias-repeated-global-calls: safety boundaries", () => {
  it("does not alias a name ever declared as a local anywhere in the program", () => {
    const o = out(
      "local function g() local setmetatable = function() end return setmetatable end\n" +
        "setmetatable(a,b)setmetatable(a,b)setmetatable(a,b)",
      { rename: false },
    );
    expect(o).not.toContain("__fn");
  });

  it("does not alias a name ever used as an assignment target anywhere in the program", () => {
    const o = out(
      "setmetatable = nil\nsetmetatable(a,b)setmetatable(a,b)setmetatable(a,b)",
      { rename: false },
    );
    expect(o).not.toContain("__fn");
  });

  it("never touches a method call or member-access call (not a bare global identifier)", () => {
    const o = out('game.SetThing(a,b)game.SetThing(a,b)game.SetThing(a,b)', { rename: false });
    expect(o).not.toContain("__fn");
    const o2 = out('game:SetThing(a,b)game:SetThing(a,b)game:SetThing(a,b)', { rename: false });
    expect(o2).not.toContain("__fn");
  });

  it("never alters call arguments (remote-args safety)", () => {
    const source = 'setmetatable("payload", 1)setmetatable("payload", 2)setmetatable("payload", 3)';
    const withAlias = compressAggressive(source, { ...isolated, aliasRepeatedGlobalCalls: true, rename: false });
    const without = compressAggressive(source, { ...isolated, aliasRepeatedGlobalCalls: false, rename: false });
    expect(withAlias.ok && without.ok).toBe(true);
    if (!withAlias.ok || !without.ok) return;
    expect(withAlias.output).toContain('"payload"');
    expect(withAlias.output).toMatch(/\(("payload"|__fn\d+),1\)/);
  });

  it("keeps separate aliases per function scope", () => {
    const o = out(
      'local function f() setmetatable(a,b)setmetatable(a,b)setmetatable(a,b)setmetatable(a,b) end\n' +
        'setmetatable(a,b)setmetatable(a,b)setmetatable(a,b)setmetatable(a,b)',
      { rename: false },
    );
    expect((o.match(/__fn\d+=setmetatable/g) ?? []).length).toBe(2);
  });

  it("output remains valid, re-parseable Luau", () => {
    const result = compressAggressive('setmetatable(a,b)setmetatable(a,b)setmetatable(a,b)', {
      aliasRepeatedGlobalCalls: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(() => parse(result.output)).not.toThrow();
  });

  it("is idempotent across re-compression", () => {
    const src = 'setmetatable(a,b)setmetatable(a,b)setmetatable(a,b)';
    const result1 = compressAggressive(src, { aliasRepeatedGlobalCalls: true });
    expect(result1.ok).toBe(true);
    if (!result1.ok) return;
    const result2 = compressAggressive(result1.output, { aliasRepeatedGlobalCalls: true });
    expect(result2.ok).toBe(true);
    if (!result2.ok) return;
    expect(result2.output).toBe(result1.output);
  });
});
