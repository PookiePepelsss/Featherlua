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
