import { describe, expect, it } from "vitest";
import { compressAggressive } from "../compress-aggressive";

// Global aliasing is the largest saving left, and it is off by default
// because an alias keeps whatever the global held when the chunk started.
// Reporting what it would save is what makes that an informed choice rather
// than an option nobody finds.
describe("the saving from global aliasing is reported when it applies", () => {
  const REPEATED = Array.from({ length: 10 }, (_, i) => `someGlobalHelper(${i})`).join("\n");

  it("reports a real saving", () => {
    const result = compressAggressive(REPEATED);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.aliasGlobalsSaving).toBeGreaterThan(0);

    const aliased = compressAggressive(REPEATED, { aliasGlobals: true });
    expect(aliased.ok).toBe(true);
    if (!aliased.ok) return;
    expect(result.output.length - aliased.output.length).toBe(result.aliasGlobalsSaving);
  });

  it("says nothing when aliasing is already on", () => {
    const result = compressAggressive(REPEATED, { aliasGlobals: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.aliasGlobalsSaving).toBeUndefined();
  });

  it("says nothing when the pass declines the script", () => {
    // The environment APIs make aliasing unsafe, so the pass no-ops and
    // there is no saving to report.
    const result = compressAggressive(`${REPEATED}\nprint(getfenv(1))`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.aliasGlobalsSaving).toBeUndefined();
  });

  it("says nothing when there is nothing to gain", () => {
    const result = compressAggressive("local x = 1 return x");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.aliasGlobalsSaving).toBeUndefined();
  });
});
