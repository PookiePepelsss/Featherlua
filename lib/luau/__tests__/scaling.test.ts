import { describe, expect, it } from "vitest";
import { compressAggressive } from "../compress-aggressive";

// optimizeBlock used to slice the remaining statements and scan them once
// per statement, which is quadratic in a block's length. A hundred thousand
// declarations in one block took about thirty seconds; it takes under a
// second now. The bounds below are deliberately loose, because the point is
// to catch a return to quadratic, not to police milliseconds on a busy
// machine.

function flatBlock(n: number) {
  return `${Array.from({ length: n }, (_, i) => `local v${i} = ${i}`).join("\n")}\nprint(v0)`;
}

function timeCompress(source: string) {
  const started = Date.now();
  const result = compressAggressive(source);
  expect(result.ok, result.ok ? "" : result.error.message).toBe(true);
  return Date.now() - started;
}

describe("compression stays roughly linear in the size of a block", () => {
  it("handles a hundred thousand declarations in one block", () => {
    expect(timeCompress(flatBlock(100000))).toBeLessThan(15000);
  }, 60_000);

  it("does not blow up between twenty and eighty thousand", () => {
    // Quadratic would be a factor of sixteen for four times the input.
    // Linear is about four. Six leaves room for noise without letting
    // quadratic through.
    const small = Math.max(timeCompress(flatBlock(20000)), 20);
    const large = timeCompress(flatBlock(80000));
    expect(large / small, `${small}ms then ${large}ms looks superlinear`).toBeLessThan(6);
  }, 120_000);

  it("handles many small functions, the shape real code has", () => {
    const source = `${Array.from({ length: 16000 }, (_, i) => `local function f${i}(a) return a + ${i} end`).join("\n")}\nprint(f0(1))`;
    expect(timeCompress(source)).toBeLessThan(10000);
  }, 60_000);
});
