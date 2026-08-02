import { describe, it } from "vitest";
import { compressSafe } from "../compress-safe";
import { compressAggressive } from "../compress-aggressive";

const inputs = [
  "",
  "   ",
  "local x = ",
  "local x = 'unterminated",
  'local x = "unterminated',
  "local x = [[unterminated",
  "--[[unterminated",
  "((((((((((",
  "))))))))))",
  "local x = 0x",
  "local x = 1e",
  "function",
  "local",
  "1 + ",
  "`unterminated interp {",
  "a".repeat(5000),
  "(".repeat(500) + "1" + ")".repeat(500),
];

describe("malformed input never throws", () => {
  for (const src of inputs) {
    const label = JSON.stringify(src.length > 30 ? `${src.slice(0, 30)}...` : src);
    it(`compressSafe: ${label}`, () => {
      compressSafe(src, "luau");
    });
    it(`compressAggressive: ${label}`, () => {
      compressAggressive(src);
    });
  }
});
