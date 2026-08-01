import { describe, expect, it } from "vitest";
import { compressAggressive } from "../compress-aggressive";
import { parse } from "../parser";
import { corpusScenarios } from "./corpus-scenarios";
import { loadFixtures } from "./fixtures";

describe("representative script corpus", () => {
  for (const scenario of corpusScenarios) {
    it(scenario.name, () => {
      const result = compressAggressive(scenario.source);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(() => parse(result.output)).not.toThrow();
      expect(new TextEncoder().encode(result.output).length)
        .toBeLessThanOrEqual(new TextEncoder().encode(scenario.source).length);
    });
  }

  it("covers at least forty parser and application-style programs", () => {
    expect(loadFixtures().length + corpusScenarios.length).toBeGreaterThanOrEqual(40);
  });
});
