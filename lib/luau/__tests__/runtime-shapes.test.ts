import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { createOfficialLuau, executeWithOfficialLuau, type LuauModule } from "../official/runtime";

// Which rewrites would actually speed a script up, settled by measurement
// rather than folk wisdom, since several pieces of standard Lua advice turn
// out to be slower here. Timing comes from os.clock inside Luau, so
// compiling and crossing the wasm boundary are not counted. Only direction
// is asserted, with a wide margin, so a busy machine cannot fail it. This
// is the plain interpreter, not Roblox: the direction transfers, the exact
// numbers do not.

let module: LuauModule;

beforeAll(async () => {
  const wasm = readFileSync(join(process.cwd(), "public", "wasm", "luau.wasm"));
  module = await createOfficialLuau(new Uint8Array(wasm));
}, 30_000);

/** Best wall time of five trials, measured inside the runtime. */
function timeInLuau(body: string, reps: number): number {
  const source = `
local best = math.huge
for _trial = 1, 5 do
  local t0 = os.clock()
${body.replace(/__REPS__/g, String(reps))}
  local dt = os.clock() - t0
  if dt < best then best = dt end
end
print(string.format("%.6f", best))
`;
  const result = executeWithOfficialLuau(module, source);
  expect(result.success, `the runtime refused the benchmark: ${result.error}`).toBe(true);
  return Number(result.output.trim());
}

let warmed = false;

/**
 * How many times faster the rewrite is. Below 1 means slower. Warming up
 * and measuring both orders are not optional: whichever ran first
 * otherwise pays for the runtime's lazily built paths and looks like a
 * win. Localising a global read as 1.5x that way, and is really 1.04x.
 */
function speedup(plain: string, rewritten: string, reps: number): number {
  if (!warmed) {
    for (let i = 0; i < 3; i += 1) {
      timeInLuau("  local acc = 0\n  for i = 1, 200000 do acc = acc + i end", 0);
    }
    warmed = true;
  }
  const plainFirst = timeInLuau(plain, reps);
  const rewrittenFirst = timeInLuau(rewritten, reps);
  const rewrittenSecond = timeInLuau(rewritten, reps);
  const plainSecond = timeInLuau(plain, reps);
  return Math.min(plainFirst, plainSecond) / Math.min(rewrittenFirst, rewrittenSecond);
}

describe("rewrites that would make a script faster", () => {
  it("building a string in a loop is far slower than table.concat", () => {
    const ratio = speedup(
      `  local s = ""
  for i = 1, __REPS__ do s = s .. "x" end`,
      `  local parts = {}
  for i = 1, __REPS__ do parts[i] = "x" end
  local s = table.concat(parts)`,
      20000,
    );
    expect(ratio).toBeGreaterThan(10); // measured around 106x
  });

  it("a nested field chain in a loop is slower than hoisting it", () => {
    const ratio = speedup(
      `  local a = { b = { c = { d = 3 } } }
  local acc = 0
  for i = 1, __REPS__ do acc = acc + a.b.c.d end`,
      `  local a = { b = { c = { d = 3 } } }
  local d = a.b.c.d
  local acc = 0
  for i = 1, __REPS__ do acc = acc + d end`,
      1000000,
    );
    expect(ratio).toBeGreaterThan(2); // measured around 3.4x
  });

  it("a repeated field read in a loop is slower than hoisting it", () => {
    const ratio = speedup(
      `  local cfg = { speed = 2 }
  local acc = 0
  for i = 1, __REPS__ do acc = acc + cfg.speed * cfg.speed + cfg.speed end`,
      `  local cfg = { speed = 2 }
  local speed = cfg.speed
  local acc = 0
  for i = 1, __REPS__ do acc = acc + speed * speed + speed end`,
      2000000,
    );
    expect(ratio).toBeGreaterThan(1.4); // measured around 1.9x
  });
});

describe("rewrites that are standard Lua advice and do not pay here", () => {
  it("localising a library global buys nothing", () => {
    // This is what the aliasGlobals pass does, and it is a size pass only.
    // Luau resolves imports ahead of time, so there is no lookup to save.
    const ratio = speedup(
      `  local acc = 0
  for i = 1, __REPS__ do acc = acc + math.sqrt(i) end`,
      `  local sqrt = math.sqrt
  local acc = 0
  for i = 1, __REPS__ do acc = acc + sqrt(i) end`,
      2000000,
    );
    expect(ratio).toBeLessThan(1.15); // measured around 1.04x
  });

  it("unrolling ipairs into a numeric for does not help", () => {
    // Luau has a dedicated instruction for ipairs.
    const ratio = speedup(
      `  local t = table.create(1000, 1)
  local acc = 0
  for _r = 1, __REPS__ do for _, v in ipairs(t) do acc = acc + v end end`,
      `  local t = table.create(1000, 1)
  local acc = 0
  for _r = 1, __REPS__ do for i = 1, #t do acc = acc + t[i] end end`,
      2000,
    );
    expect(ratio).toBeLessThan(1.05); // measured around 0.81x, ie. slower
  });

  it("turning a dot call into a method call does not help", () => {
    const ratio = speedup(
      `  local o = { n = 0 }
  function o.add(self, v) self.n = self.n + v end
  for i = 1, __REPS__ do o.add(o, 1) end`,
      `  local o = { n = 0 }
  function o:add(v) self.n = self.n + v end
  for i = 1, __REPS__ do o:add(1) end`,
      1000000,
    );
    expect(ratio).toBeLessThan(1.05); // measured around 0.82x, ie. slower
  });
});
