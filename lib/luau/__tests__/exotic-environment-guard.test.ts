import { describe, expect, it } from "vitest";
import { compressAggressive } from "../compress-aggressive";

const bothExperimental = { hoistRepeatedAccess: true, aliasRepeatedGlobalCalls: true, rename: false } as const;

function out(src: string): string {
  const r = compressAggressive(src, bothExperimental);
  if (!r.ok) throw new Error(r.error.message);
  return r.output;
}

describe("exotic-environment-guard: disqualifies both experimental passes", () => {
  const signals = [
    "_G", "_ENV", "getfenv", "setfenv", "getrawmetatable", "setrawmetatable",
    "hookmetamethod", "hookfunction", "getgenv", "getrenv", "newcclosure",
    "checkcaller", "iscclosure", "islclosure", "clonefunction",
  ];

  for (const signal of signals) {
    it(`bails out on hoist-repeated-access when \`${signal}\` appears anywhere`, () => {
      const src =
        `local x = ${signal}\n` +
        "repeat\n" +
        "  local a = workspace.Terrain.Size.X + workspace.Terrain.Size.X\n" +
        "until true";
      expect(out(src)).not.toContain("__hoist");
    });

    it(`bails out on alias-repeated-global-calls when \`${signal}\` appears anywhere`, () => {
      const src = `local x = ${signal}\nsetmetatable(a,b)setmetatable(a,b)setmetatable(a,b)setmetatable(a,b)`;
      expect(out(src)).not.toContain("__fn");
    });
  }

  it("still bails out when the signal is far from the affected code (whole-program scan)", () => {
    const src =
      "local function unrelated()\n" +
      "  return getfenv()\n" +
      "end\n" +
      "repeat\n" +
      "  local a = workspace.Terrain.Size.X + workspace.Terrain.Size.X\n" +
      "until true";
    expect(out(src)).not.toContain("__hoist");
  });
});

describe("exotic-environment-guard: does not false-positive on ordinary code", () => {
  it("normal setmetatable OOP usage does not disqualify either pass", () => {
    const src =
      "local Class = {}\nClass.__index = Class\nsetmetatable(Class, {})\n" +
      "repeat\n" +
      "  local a = workspace.Terrain.Size.X + workspace.Terrain.Size.X\n" +
      "until true";
    expect(out(src)).toContain("__hoist");
  });

  it("debug.traceback / debug.profilebegin do not disqualify either pass", () => {
    const src =
      "debug.profilebegin('x')\n" +
      "repeat\n" +
      "  local a = workspace.Terrain.Size.X + workspace.Terrain.Size.X\n" +
      "until true\n" +
      "debug.profileend()";
    expect(out(src)).toContain("__hoist");
  });

  it("aliasing still fires normally on a clean script", () => {
    const src = "setmetatable(a,b)setmetatable(a,b)setmetatable(a,b)setmetatable(a,b)";
    expect(out(src)).toContain("__fn");
  });
});
