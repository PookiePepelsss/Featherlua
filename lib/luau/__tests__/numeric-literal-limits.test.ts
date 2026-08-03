import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { compressAggressive } from "../compress-aggressive";
import { createOfficialLuau, executeWithOfficialLuau, type LuauModule } from "../official/runtime";

let module: LuauModule;

beforeAll(async () => {
  const wasm = readFileSync(join(process.cwd(), "public", "wasm", "luau.wasm"));
  module = await createOfficialLuau(new Uint8Array(wasm));
}, 30_000);

// Constant folding has to agree with the runtime on what a literal means.
// Luau reads hex and binary literals through a 64-bit unsigned integer that
// saturates, so anything past 2^64-1 lands on the same value; computing the
// exact mathematical value instead folds to a number Luau never produces.
const LITERALS = [
  "0x1",
  "0x0",
  "0b0",
  "0x0000000000000000FF",
  "0xFFFFFFFFFFFFFFFF",
  "0x10000000000000000",
  "0x1FFFFFFFFFFFFFFFF",
  "0xFFFFFFFFFFFFFFFFF",
  "0xDEADBEEFDEADBEEFDEADBEEF",
  `0b${"1".repeat(64)}`,
  `0b${"1".repeat(65)}`,
  `0b${"1".repeat(70)}`,
  `0b0000${"1".repeat(64)}`,
  "0xDEADBEEFDEADBEEFDEADBEEF + 1",
  "0xFFFFFFFFFFFFFFFFFF * 2",
  "1e309",
  "1e-330",
  "5e-324",
  "1.7976931348623157e308",
  "9007199254740993",
  "123456789012345678901234567890",
  "0.1 + 0.2",
  "1 / 3",
  "-0.0",
  "1e21",
  "1e-7",
  // Exponent notation is shorter than the plain spelling well before the
  // point `String` starts using it on its own.
  "1000000",
  "100000",
  "0.00001",
  "4294967296",
  "65536",
  "123000",
  "1024 * 1024",
  "0.0000000001",
];

describe("numeric literals fold to what the runtime computes", () => {
  for (const literal of LITERALS) {
    it(`${literal} survives folding`, () => {
      const source = `print(${literal})\nprint(tostring(${literal}))`;
      const before = executeWithOfficialLuau(module, source);
      expect(before.success, `baseline failed: ${before.error}`).toBe(true);

      const result = compressAggressive(source);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const after = executeWithOfficialLuau(module, result.output);
      expect(after.success, `compressed output failed: ${after.error}`).toBe(true);
      expect(after.output).toBe(before.output);
    });
  }
});
