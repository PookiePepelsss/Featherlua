import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  compressAggressive,
  DEFAULT_AGGRESSIVE_OPTIONS,
  MEDIUM_AGGRESSIVE_OPTIONS,
} from "../compress-aggressive";
import { compressSafe } from "../compress-safe";
import { collectNames } from "../ast-search";
import { parse } from "../parser";
import { createOfficialLuau, executeWithOfficialLuau, type LuauModule } from "../official/runtime";

let module: LuauModule;

beforeAll(async () => {
  const wasm = readFileSync(join(process.cwd(), "public", "wasm", "luau.wasm"));
  module = await createOfficialLuau(new Uint8Array(wasm));
}, 30_000);

function medium(source: string) {
  const result = compressAggressive(source, MEDIUM_AGGRESSIVE_OPTIONS);
  expect(result.ok, result.ok ? "" : result.error.message).toBe(true);
  return result.ok ? result.output : "";
}

// Medium's whole promise is that the set of locals comes out of it
// untouched: none renamed, none invented, none dropped. Everything it does
// change is invisible to a running script.
const SCRIPTS = [
  "local playerName = 'Pookie'\nlocal greeting = 'hi ' .. playerName\nprint(greeting)",
  "local unusedButKept = 42\nprint(1)",
  "local total: number = 60 * 60 * 24\nprint(total)",
  "local flag = true\nif flag then print('on') else print('off') end",
  "local a = 1\nlocal b = 2\nprint(a + b)",
  "local s = 'repeated'\nprint(s, 'repeated', 'repeated', 'repeated')",
  "local function helper(n)\n\treturn n % 3\nend\nprint(helper(7))",
];

describe("Medium keeps every local exactly as written", () => {
  for (const source of SCRIPTS) {
    it(source.split("\n")[0], () => {
      const before = collectNames(parse(source).chunk.body);
      const output = medium(source);
      const after = collectNames(parse(output).chunk.body);
      for (const name of before) {
        expect(after.has(name), `Medium lost or renamed \`${name}\``).toBe(true);
      }
      for (const name of after) {
        expect(before.has(name), `Medium invented \`${name}\``).toBe(true);
      }
    });
  }

  it("renames under Aggressive, which is the difference between them", () => {
    const source = "local deliberatelyLongName = 1\nprint(deliberatelyLongName)";
    expect(medium(source)).toContain("deliberatelyLongName");
    const aggressive = compressAggressive(source, DEFAULT_AGGRESSIVE_OPTIONS);
    expect(aggressive.ok).toBe(true);
    if (aggressive.ok) expect(aggressive.output).not.toContain("deliberatelyLongName");
  });
});

describe("Medium sits between the other two", () => {
  const source = SCRIPTS.join("\n");

  it("is smaller than Safe and no smaller than Aggressive", () => {
    const aggressive = compressAggressive(source, DEFAULT_AGGRESSIVE_OPTIONS);
    expect(aggressive.ok).toBe(true);
    if (!aggressive.ok) return;
    expect(medium(source).length).toBeLessThan(compressSafe(source).length);
    expect(medium(source).length).toBeGreaterThanOrEqual(aggressive.output.length);
  });

  it("runs identically to the original", () => {
    for (const script of SCRIPTS) {
      const before = executeWithOfficialLuau(module, script);
      expect(before.success, `baseline failed: ${before.error}`).toBe(true);
      const after = executeWithOfficialLuau(module, medium(script));
      expect(after.success, `Medium output failed: ${after.error}`).toBe(true);
      expect(after.output).toBe(before.output);
    }
  });
});
