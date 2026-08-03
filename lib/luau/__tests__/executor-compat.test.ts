import { describe, expect, it } from "vitest";
import { compressAggressive } from "../compress-aggressive";
import { compressSafe, verifySafeCompression } from "../compress-safe";
import { parse } from "../parser";
import { executorScenarios } from "./executor-scenarios";

function containsName(output: string, name: string) {
  return new RegExp(`(^|[^A-Za-z0-9_])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z0-9_]|$)`).test(output);
}

describe("executor compatibility corpus", () => {
  for (const scenario of executorScenarios) {
    it(`${scenario.name}: Safe mode preserves every token`, () => {
      const output = compressSafe(scenario.source);
      expect(verifySafeCompression(scenario.source, output)).toEqual({ success: true });
      expect(new TextEncoder().encode(output).length).toBeLessThanOrEqual(new TextEncoder().encode(scenario.source).length);
    });

    it(`${scenario.name}: Aggressive mode preserves executor names and reparses`, () => {
      const result = compressAggressive(scenario.source);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(() => parse(result.output)).not.toThrow();
      expect(new TextEncoder().encode(result.output).length).toBeLessThanOrEqual(new TextEncoder().encode(scenario.source).length);
      for (const name of scenario.globals) expect(containsName(result.output, name), name).toBe(true);
      for (const member of scenario.members ?? []) expect(result.output, member).toContain(member);

      const repeated = compressAggressive(result.output);
      expect(repeated.ok).toBe(true);
      if (repeated.ok) expect(repeated.output).toBe(result.output);
    });
  }
});
