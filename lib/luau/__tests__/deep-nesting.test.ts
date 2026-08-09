import { describe, expect, it } from "vitest";
import { compressAggressive } from "../compress-aggressive";
import { compressSafe, verifySafeCompression } from "../compress-safe";

// Every stage past the lexer walks the tree by recursion, so a script
// nested thousands of levels down exhausts the JS stack. An obfuscator
// produces exactly that shape. What matters is that it comes back as a
// sentence rather than as the engine's own wording, and that it points at
// the mode which can still do the job.
const TOO_DEEP = [
  ["parentheses", `return ${"(".repeat(20000)}1${")".repeat(20000)}`],
  ["table constructors", `return ${"{".repeat(20000)}${"}".repeat(20000)}`],
  ["a concatenation chain", `return ${Array.from({ length: 20000 }, (_, i) => `a${i}`).join("..")}`],
  ["nested ifs", `${"if a then ".repeat(8000)}print(1)${" end".repeat(8000)}`],
] as const;

describe("a script nested past the stack", () => {
  for (const [name, source] of TOO_DEEP) {
    it(`reports ${name} plainly instead of crashing`, () => {
      const result = compressAggressive(source);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.message).toContain("nests too deeply");
      expect(result.error.message).toContain("Safe mode");
      expect(result.error.message).not.toMatch(/call stack|recursion/i);
    });

    it(`still compresses ${name} in Safe mode`, () => {
      const output = compressSafe(source);
      expect(output.length).toBeGreaterThan(0);
      // A chain already written without spaces has nothing to give up, so
      // the bar is that Safe never grows it.
      expect(output.length).toBeLessThanOrEqual(source.length);
      expect(verifySafeCompression(source, output)).toEqual({ success: true });
    });
  }

  it("leaves ordinary nesting well alone", () => {
    const source = `return ${"(".repeat(200)}1${")".repeat(200)}`;
    const result = compressAggressive(source);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output).toBe("return 1");
  });
});
