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

// The string hoister synthesizes `__strN` locals. If the script already
// binds or reads that exact name, the user's declaration shadows the
// synthesized one and every rewritten site silently picks up the wrong
// value -- output that still parses, still re-parses equivalently, and is
// simply wrong at runtime.
const COLLIDING = [
  {
    name: "user local declared before the rewritten sites",
    source: `
local __str1 = "USER-VALUE"
print("aaaaaaaaaaaaaaaaaaaaaaaa")
print("aaaaaaaaaaaaaaaaaaaaaaaa")
print("aaaaaaaaaaaaaaaaaaaaaaaa")
print(__str1)
`,
  },
  {
    name: "user local declared after the rewritten sites",
    source: `
print("bbbbbbbbbbbbbbbbbbbbbbbb")
print("bbbbbbbbbbbbbbbbbbbbbbbb")
print("bbbbbbbbbbbbbbbbbbbbbbbb")
local __str1 = "USER-VALUE"
print(__str1)
`,
  },
  {
    name: "user name bound as a function parameter",
    source: `
local function show(__str1)
  print(__str1)
  print("cccccccccccccccccccccccc")
  print("cccccccccccccccccccccccc")
  print("cccccccccccccccccccccccc")
end
show("PARAM")
`,
  },
  {
    name: "user name bound as a loop variable",
    source: `
for __str1 = 1, 2 do
  print(__str1)
  print("dddddddddddddddddddddddd")
  print("dddddddddddddddddddddddd")
  print("dddddddddddddddddddddddd")
end
`,
  },
  {
    name: "several taken names in a row",
    source: `
local __str1, __str2 = "A", "B"
print("eeeeeeeeeeeeeeeeeeeeeeee")
print("eeeeeeeeeeeeeeeeeeeeeeee")
print("eeeeeeeeeeeeeeeeeeeeeeee")
print("ffffffffffffffffffffffff")
print("ffffffffffffffffffffffff")
print("ffffffffffffffffffffffff")
print(__str1, __str2)
`,
  },
];

describe("hoisted string locals never collide with existing names", () => {
  for (const scenario of COLLIDING) {
    for (const rename of [true, false]) {
      it(`${scenario.name} (rename ${rename ? "on" : "off"})`, () => {
        const before = executeWithOfficialLuau(module, scenario.source);
        expect(before.success, `baseline failed: ${before.error}`).toBe(true);

        const result = compressAggressive(scenario.source, { rename });
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        const after = executeWithOfficialLuau(module, result.output);
        expect(after.success, `compressed output failed: ${after.error}`).toBe(true);
        expect(after.output).toBe(before.output);
      });
    }
  }
});
