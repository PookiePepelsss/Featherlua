import { describe, expect, it } from "vitest";
import { compressAggressive } from "../compress-aggressive";

const bothExperimental = { hoistRepeatedAccess: true, aliasRepeatedGlobalCalls: true, rename: false } as const;

describe("exotic-environment-guard: warns but does not disable either pass", () => {
  const signals = [
    "_G", "_ENV", "getfenv", "setfenv", "getrawmetatable", "setrawmetatable",
    "hookmetamethod", "hookfunction", "getgenv", "getrenv", "newcclosure",
    "checkcaller", "iscclosure", "islclosure", "clonefunction",
  ];

  for (const signal of signals) {
    it(`warns, but still hoists, when \`${signal}\` appears anywhere (hoist-repeated-access)`, () => {
      const src =
        `local x = ${signal}\n` +
        "repeat\n" +
        "  local a = workspace.Terrain.Size.X + workspace.Terrain.Size.X\n" +
        "until true";
      const r = compressAggressive(src, bothExperimental);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.warning).toBeDefined();
      expect(r.output).toContain("__hoist");
    });

    it(`warns, but still aliases, when \`${signal}\` appears anywhere (alias-repeated-global-calls)`, () => {
      const src = `local x = ${signal}\nsetmetatable(a,b)setmetatable(a,b)setmetatable(a,b)setmetatable(a,b)setmetatable(a,b)setmetatable(a,b)`;
      const r = compressAggressive(src, bothExperimental);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.warning).toBeDefined();
      expect(r.output).toContain("__fn");
    });
  }

  it("still warns when the signal is far from the affected code (whole-program scan)", () => {
    const src =
      "local function unrelated()\n" +
      "  return getfenv()\n" +
      "end\n" +
      "repeat\n" +
      "  local a = workspace.Terrain.Size.X + workspace.Terrain.Size.X\n" +
      "until true";
    const r = compressAggressive(src, bothExperimental);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.warning).toBeDefined();
  });

  it("does not warn when neither experimental option is enabled, even with a signal present", () => {
    const r = compressAggressive("local x = getfenv()\nprint(1)");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.warning).toBeUndefined();
  });
});

describe("exotic-environment-guard: does not false-positive on ordinary code", () => {
  it("normal setmetatable OOP usage does not warn", () => {
    const src =
      "local Class = {}\nClass.__index = Class\nsetmetatable(Class, {})\n" +
      "repeat\n" +
      "  local a = workspace.Terrain.Size.X + workspace.Terrain.Size.X\n" +
      "until true";
    const r = compressAggressive(src, bothExperimental);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.warning).toBeUndefined();
    expect(r.output).toContain("__hoist");
  });

  it("debug.traceback / debug.profilebegin do not warn", () => {
    const src =
      "debug.profilebegin('x')\n" +
      "repeat\n" +
      "  local a = workspace.Terrain.Size.X + workspace.Terrain.Size.X\n" +
      "until true\n" +
      "debug.profileend()";
    const r = compressAggressive(src, bothExperimental);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.warning).toBeUndefined();
  });

  it("aliasing fires normally on a clean script, no warning", () => {
    const src = "setmetatable(a,b)setmetatable(a,b)setmetatable(a,b)setmetatable(a,b)setmetatable(a,b)setmetatable(a,b)";
    const r = compressAggressive(src, bothExperimental);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.warning).toBeUndefined();
    expect(r.output).toContain("__fn");
  });
});
