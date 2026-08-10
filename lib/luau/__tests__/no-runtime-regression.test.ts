import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { compressAggressive, MEDIUM_AGGRESSIVE_OPTIONS } from "../compress-aggressive";
import { createOfficialLuau, executeWithOfficialLuau, type LuauModule } from "../official/runtime";

// Nothing else here checks that the output still runs at the same speed.
// Every pass is chosen for bytes, and a rewrite that saves a few of them
// while costing a hot loop real time would be a bad trade nobody would
// notice: the size figure would improve and the tests would stay green.
//
// Measured, compression is neutral, between 0.97x and 1.05x on the shapes
// below, so the bar here is only that it never becomes markedly slower.
// The margin is wide on purpose. This is a guard against a future pass
// pessimising something, not a benchmark.

let module: LuauModule;

beforeAll(async () => {
  const wasm = readFileSync(join(process.cwd(), "public", "wasm", "luau.wasm"));
  module = await createOfficialLuau(new Uint8Array(wasm));
}, 30_000);

/** Best of three trials, timed inside the runtime, with its result. */
function timeScript(source: string): { seconds: number; printed: string } {
  const wrapped = `
local best = math.huge
for _trial = 1, 3 do
  local t0 = os.clock()
  do
${source}
  end
  local dt = os.clock() - t0
  if dt < best then best = dt end
end
print(string.format("__T%.6f", best))
`;
  const result = executeWithOfficialLuau(module, wrapped);
  expect(result.success, `the runtime refused the script: ${result.error}`).toBe(true);
  const lines = result.output.trim().split("\n");
  const timing = lines.find((line) => line.startsWith("__T")) ?? "__T0";
  return { seconds: Number(timing.slice(3)), printed: lines.filter((l) => !l.startsWith("__T")).join("|") };
}

const HOT_SCRIPTS: [string, string][] = [
  [
    "a nearest-target scan",
    `local function dist(a, b)
  local dx, dy = a.x - b.x, a.y - b.y
  return math.sqrt(dx * dx + dy * dy)
end
local origin = { x = 0, y = 0 }
local targets = {}
for i = 1, 200 do targets[i] = { x = i % 37, y = i % 11 } end
local total = 0
for _pass = 1, 600 do
  local bestD = math.huge
  for i = 1, #targets do
    local d = dist(origin, targets[i])
    if d < bestD then bestD = d end
  end
  total = total + bestD
end
print(string.format("%.4f", total))`,
  ],
  [
    "per-frame table churn",
    `local cache = {}
local acc = 0
for frame = 1, 300000 do
  local entry = cache[frame % 64]
  if not entry then
    entry = { visible = false, n = 0 }
    cache[frame % 64] = entry
  end
  entry.visible = frame % 3 == 0
  entry.n = entry.n + 1
  if entry.visible then acc = acc + entry.n end
end
print(acc)`,
  ],
  [
    "a config read in a tight loop",
    `local config = { speed = 16, jump = 50, fov = 120, smoothing = 0.4 }
local acc = 0
for i = 1, 400000 do
  acc = acc + config.speed * config.smoothing + config.fov / config.jump
end
print(string.format("%.4f", acc))`,
  ],
];

describe("compression does not make a script slower", () => {
  let warmed = false;

  for (const [name, source] of HOT_SCRIPTS) {
    for (const [mode, options] of [["Medium", MEDIUM_AGGRESSIVE_OPTIONS], ["Aggressive", undefined]] as const) {
      it(`${mode} keeps ${name} at speed`, () => {
        if (!warmed) {
          for (let i = 0; i < 3; i += 1) timeScript("local a = 0 for i = 1, 200000 do a = a + i end print(a)");
          warmed = true;
        }
        const compressed = compressAggressive(source, options);
        expect(compressed.ok, compressed.ok ? "" : compressed.error.message).toBe(true);
        if (!compressed.ok) return;

        // Both sides measured twice, because whichever runs first pays for
        // paths the runtime builds lazily and would look slower for it.
        const beforeA = timeScript(source);
        const afterA = timeScript(compressed.output);
        const afterB = timeScript(compressed.output);
        const beforeB = timeScript(source);

        expect(afterA.printed, `${mode} changed what the script computed`).toBe(beforeA.printed);

        const before = Math.min(beforeA.seconds, beforeB.seconds);
        const after = Math.min(afterA.seconds, afterB.seconds);
        expect(
          before / after,
          `${mode} made this ${(after / before).toFixed(2)}x slower to run`,
        ).toBeGreaterThan(0.85);
      });
    }
  }
});
