import { describe, expect, it } from "vitest";
import { parse } from "../parser";
import { forEachStat } from "../ast-search";

// forEachStat once reached statements inside nested function expressions
// through two paths, so anything counting per visit overcounted, and
// alias-globals bought aliases the inflated counts appeared to justify.
describe("forEachStat visits each statement exactly once", () => {
  const CASES: [string, string, number][] = [
    ["flat statements", "print(1) print(2)", 2],
    ["a function expression in a local", "local f = function() print(1) end", 2],
    ["two functions in one call", "f(function() print(1) end, function() print(2) end)", 3],
    [
      "functions nested two deep",
      "local f = function() local g = function() print(1) end end",
      3,
    ],
    [
      "a function inside a table inside a call argument",
      "f({ run = function() print(1) end })",
      2,
    ],
    ["a declared function holding another", "local function f() local g = function() print(1) end end", 3],
  ];

  for (const [name, source, expected] of CASES) {
    it(name, () => {
      const { chunk } = parse(source);
      let visits = 0;
      forEachStat(chunk.body, () => {
        visits += 1;
      });
      expect(visits).toBe(expected);
    });
  }
});
