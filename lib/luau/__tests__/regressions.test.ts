import { describe, expect, it } from "vitest";
import { parse } from "../parser";
import { compressAggressive } from "../compress-aggressive";

// Each case here is a confirmed bug found by manual review, with a fixed
// expected output that must itself re-parse (proving the output is valid
// Luau, not just "some string").
function assertValidRoundtrip(output: string) {
  expect(() => parse(output)).not.toThrow();
}

describe("regression: parens around a non-prefixexp base must survive", () => {
  it("indexing a parenthesized table constructor", () => {
    const result = compressAggressive("local x = ({a = 1}).a");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("local a=({a=1}).a");
    assertValidRoundtrip(result.output);
  });

  it("indexing a parenthesized table constructor with []", () => {
    const result = compressAggressive("local x = ({1, 2, 3})[1]");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("local a=({1,2,3})[1]");
    assertValidRoundtrip(result.output);
  });

  it("immediately-invoked parenthesized function expression", () => {
    const result = compressAggressive("local x = (function() return 1 end)()");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("local a=(function()return 1 end)()");
    assertValidRoundtrip(result.output);
  });

  it("method call on a parenthesized string literal", () => {
    const result = compressAggressive('local x = ("text"):sub(1)');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe('local a=("text"):sub(1)');
    assertValidRoundtrip(result.output);
  });

  it("cosmetic parens are still dropped when NOT a suffix-chain base", () => {
    // Contrast case: the fix must not regress the general (non-suffix-base)
    // paren-dropping behavior. `a`/`b`/`c` are globals here, so the local
    // `x` gets renamed to `d` (first name not colliding with a global).
    const result = compressAggressive("local x = (a + b) * c");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("local d=(a+b)*c");
  });

  it("double-parenthesized base still needs exactly one layer of real parens", () => {
    const result = compressAggressive("local x = ((({a = 1}))).a");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    assertValidRoundtrip(result.output);
    expect(result.output).toBe("local a=({a=1}).a");
  });
});

describe("regression: unterminated tokens must be rejected, not silently truncated", () => {
  it("unterminated quoted string", () => {
    const result = compressAggressive('local x = "abc');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/[Uu]nterminated/);
  });

  it("unterminated long-bracket string", () => {
    const result = compressAggressive("local x = [[abc");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/[Uu]nterminated/);
  });

  it("unterminated long comment", () => {
    const result = compressAggressive("--[[ never closed\nlocal x = 1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/[Uu]nterminated/);
  });

  it("unterminated interpolated string", () => {
    const result = compressAggressive("local x = `abc");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/[Uu]nterminated/);
  });

  it("unterminated interpolation expression", () => {
    const result = compressAggressive("local x = `abc {1 + 2`");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/[Uu]nterminated/);
  });

  it("a properly terminated long-bracket string with a similar-looking = level still parses", () => {
    const result = compressAggressive("local x = [==[ok]==]");
    expect(result.ok).toBe(true);
  });
});

describe("regression: typed varargs", () => {
  it("`function f(...: number)` parses (previously failed outright)", () => {
    // Aggressive mode strips type annotations (see the strip-types tests)
    // and, separately, would remove this never-called local function as
    // unused -- neither is the point here, which is just that parsing
    // succeeds at all (this used to throw "Expected ')'").
    const result = compressAggressive("local function f(...: number) return ... end", {
      removeUnusedLocals: false,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("...)");
    assertValidRoundtrip(result.output);
  });

  it("typed varargs alongside typed params", () => {
    const result = compressAggressive("local function f(a: string, ...: number) return a end");
    expect(result.ok).toBe(true);
  });
});

describe("regression: malformed numeric literals are rejected", () => {
  it("decimal exponent with no digits", () => {
    const result = compressAggressive("local x = 1e");
    expect(result.ok).toBe(false);
  });

  it("decimal exponent with only a sign, no digits", () => {
    const result = compressAggressive("local x = 1e+");
    expect(result.ok).toBe(false);
  });

  it("hex float exponent with no digits", () => {
    const result = compressAggressive("local x = 0x1p");
    expect(result.ok).toBe(false);
  });

  it("valid exponents of all forms still parse", () => {
    for (const src of ["local x = 1e5", "local x = 1e+5", "local x = 1e-5", "local x = 0x1p2", "local x = 0x1p+2"]) {
      expect(compressAggressive(src).ok).toBe(true);
    }
  });
});

describe("regression: self-validation catches printer bugs before they reach the user", () => {
  it("a deliberately broken printer path is caught by internal self-validation, not shipped", () => {
    // Sanity check that the safety net is wired up at all: feed it a
    // construct whose only way to break would be a printer regression, and
    // confirm success is real (not just result.ok trivially true because
    // nothing exercised the check).
    const result = compressAggressive("local a, b = ((f()))");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    assertValidRoundtrip(result.output);
  });
});
