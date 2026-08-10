import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  compressAggressive,
  DEFAULT_AGGRESSIVE_OPTIONS,
  MEDIUM_AGGRESSIVE_OPTIONS,
} from "../compress-aggressive";
import { compressSafe } from "../compress-safe";
import { createOfficialLuau, executeWithOfficialLuau, type LuauModule } from "../official/runtime";

// Waits, tween durations and loop steps are what a user notices the moment
// they shift, and several passes touch numeric literals. Everything below
// prints at %.17g, enough digits to name a double exactly, so one bit of
// difference shows as a text mismatch.

let module: LuauModule;

beforeAll(async () => {
  const wasm = readFileSync(join(process.cwd(), "public", "wasm", "luau.wasm"));
  module = await createOfficialLuau(new Uint8Array(wasm));
}, 30_000);

// A recording stand-in for the scheduler, so both the fact of a wait and
// the exact duration asked for are part of what gets compared.
const SCHEDULER = `
local __log = {}
local function __say(...)
  local parts = {}
  for i = 1, select("#", ...) do
    local v = select(i, ...)
    parts[i] = type(v) == "number" and string.format("%.17g", v) or tostring(v)
  end
  __log[#__log + 1] = table.concat(parts, " ")
end
local function wait(t) __say("wait", t) return t or 0 end
local task = {
  wait = function(t) __say("task.wait", t) return t or 0 end,
  delay = function(t, fn) __say("task.delay", t) if fn then fn() end end,
  spawn = function(fn, ...) __say("task.spawn") fn(...) end,
}
local TweenInfo = { new = function(...) __say("TweenInfo.new", ...) return { __t = true } end }
local function report(...) __say(...) end
local function done() for _, line in ipairs(__log) do print(line) end end
`;

function run(body: string) {
  return executeWithOfficialLuau(module, `${SCHEDULER}\ndo\n${body}\nend\ndone()`);
}

const TIMING_SCRIPTS: [string, string][] = [
  [
    "plain waits and tween durations",
    `wait(0.5)
wait(0.1)
task.wait(1 / 60)
task.wait(0.016666666666666666)
TweenInfo.new(0.25, "Quad", "Out", 0, false, 0)
TweenInfo.new(1 / 3, "Linear")`,
  ],
  [
    "a duration computed from constants",
    `local FRAMES = 60
local DURATION = 2
local perFrame = DURATION / FRAMES
task.wait(perFrame)
report("perFrame", perFrame)
report("total", perFrame * FRAMES)`,
  ],
  [
    "fractional loop steps",
    `for alpha = 0, 1, 0.05 do report("alpha", alpha) end
for i = 1, 5, 1 do report("i", i) end
for i = 10, 1, -1 do report("down", i) end
for t = 0, 0.5, 0.125 do report("t", t) end`,
  ],
  [
    "an easing curve evaluated across the loop",
    `local duration = 0.75
local steps = 12
for step = 0, steps do
  local alpha = step / steps
  local eased = alpha * alpha * (3 - 2 * alpha)
  report("eased", eased, alpha * duration)
end`,
  ],
  [
    "accumulating delta time",
    `local elapsed = 0
local dt = 1 / 60
for _frame = 1, 30 do
  elapsed = elapsed + dt
  report("elapsed", elapsed)
end
report("final", elapsed)`,
  ],
  [
    "arithmetic that does not land on a round number",
    `report("tenths", 0.1 + 0.2)
report("third", 1 / 3)
report("sixty", 1 / 60)
report("mod", 7 % 3)
report("pow", 2 ^ 10)
report("idiv", 7 // 2)
report("big", 1e300 % 7)`,
  ],
  [
    "a wait inside a loop that also breaks",
    `local n = 0
while true do
  task.wait(0.03)
  n = n + 1
  if n >= 4 then break end
end
report("iterations", n)`,
  ],
  [
    "a wait used as the loop condition, as `while wait(1) do` does",
    `local n = 0
while wait(0.1) do
  n = n + 1
  if n >= 3 then break end
end
report("n", n)`,
  ],
  [
    "a wait in a branch that cannot run, and one after a break",
    `if false then wait(99) end
for i = 1, 2 do
  report("i", i)
  if i == 2 then break end
  wait(0.05)
end
report("done")`,
  ],
  [
    "a repeat that waits until a count is reached",
    `local n = 0
repeat
  wait(0.2)
  n = n + 1
until n >= 3
report("n", n)`,
  ],
];

describe("timing values survive compression untouched", () => {
  for (const [name, body] of TIMING_SCRIPTS) {
    it(name, () => {
      const before = run(body);
      expect(before.success, `baseline failed: ${before.error}`).toBe(true);

      for (const [mode, options] of [
        ["Safe", "safe"],
        ["Medium", MEDIUM_AGGRESSIVE_OPTIONS],
        ["Aggressive", DEFAULT_AGGRESSIVE_OPTIONS],
      ] as const) {
        // The scheduler is part of the script, so it is compressed with it.
        const whole = `${SCHEDULER}\ndo\n${body}\nend\ndone()`;
        let compressed: string;
        if (options === "safe") compressed = compressSafe(whole);
        else {
          const result = compressAggressive(whole, options);
          expect(result.ok, result.ok ? "" : `${mode}: ${result.error.message}`).toBe(true);
          if (!result.ok) continue;
          compressed = result.output;
        }
        const after = executeWithOfficialLuau(module, compressed);
        expect(after.success, `${mode} output failed to run: ${after.error}`).toBe(true);
        expect(after.output, `${mode} changed a timing value`).toBe(before.output);
      }
    });
  }
});

// The dangerous shape: nothing reads the result, so an unused-local pass
// could take the declaration, and with it the wait. The pause is the whole
// point of the statement.
describe("a wait is never removed for having an unread result", () => {
  const DISCARDED = [
    "local _unused = wait(0.5)\nreport('after')",
    "local _unused = task.wait(0.25)\nreport('after')",
    "local a, b = wait(0.1), wait(0.2)\nreport('after')",
    "for i = 1, 3 do local _skip = task.wait(0.05) end\nreport('after')",
    "local held = wait(0.4)\nreport('after')",
  ];

  for (const body of DISCARDED) {
    it(body.split("\n")[0], () => {
      const before = run(body);
      expect(before.success, `baseline failed: ${before.error}`).toBe(true);
      expect(before.output, "the harness did not record the wait").toContain("wait");

      const whole = `${SCHEDULER}\ndo\n${body}\nend\ndone()`;
      const result = compressAggressive(whole);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const after = executeWithOfficialLuau(module, result.output);
      expect(after.success, `output failed to run: ${after.error}`).toBe(true);
      expect(after.output, "a wait was dropped or its duration changed").toBe(before.output);
    });
  }
});
