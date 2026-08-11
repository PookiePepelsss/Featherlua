import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { withExecutorHarness } from "../executor-harness";
import { createOfficialLuau, executeWithOfficialLuau, type LuauModule } from "../official/runtime";

// The harness decides how much of a real corpus can be checked by running
// it rather than merely compiling it. Gaps here do not produce wrong
// answers, they produce no answer at all: a script that dies on a missing
// global is one nothing can be proven about. Filling these took the
// corpus from 34 scripts that run to 56.

let module: LuauModule;

beforeAll(async () => {
  const wasm = readFileSync(join(process.cwd(), "public", "wasm", "luau.wasm"));
  module = await createOfficialLuau(new Uint8Array(wasm));
}, 30_000);

function run(source: string) {
  return executeWithOfficialLuau(module, withExecutorHarness(source));
}

describe("the globals a Roblox script expects to exist", () => {
  const PRESENT = [
    ["wait", "wait(0.1) print('ok')"],
    ["warn", "warn('careful') print('ok')"],
    ["typeof", "print(typeof(1), typeof('s'), typeof({}))"],
    ["Enum", "print(tostring(Enum.KeyCode.W))"],
    ["require", "local m = require(game.ReplicatedStorage.Thing) print(tostring(m))"],
    ["tick and time", "local a = tick() local b = time() print(type(a), type(b))"],
    ["spawn and delay", "spawn(function() print('s') end) delay(0, function() print('d') end)"],
    ["Random", "local r = Random.new() print(tostring(r))"],
    ["ColorSequence", "print(tostring(ColorSequence.new(Color3.new(1,0,0)) ~= nil))"],
    ["TweenInfo", "print(tostring(TweenInfo.new(0.5) ~= nil))"],
    ["NumberRange", "print(NumberRange.new(1, 2).Min)"],
    ["unpack", "print(unpack({1, 2}))"],
    ["loadstring result is usable", "local lib = loadstring('x')() print(tostring(lib.Signal.new('a')))"],
  ] as const;

  for (const [name, source] of PRESENT) {
    it(`provides ${name}`, () => {
      const result = run(source);
      expect(result.success, `${name} is missing: ${result.error}`).toBe(true);
    });
  }
});

describe("a proxy hands back the same object for the same path", () => {
  it("lets an Enum value work as a table key", () => {
    // Rebuilding the child each time meant `t[Enum.KeyCode.W]` never found
    // what `t[Enum.KeyCode.W] = x` had stored, and real scripts index
    // tables by Enum constantly.
    const result = run(`local binds = { [Enum.KeyCode.W] = "forward" }
print(binds[Enum.KeyCode.W])`);
    expect(result.success, result.error).toBe(true);
    expect(result.output).toContain("forward");
  });

  it("returns the same service twice", () => {
    const result = run(`local a = game:GetService("Players")
local b = game:GetService("Players")
print(rawequal(a, b))`);
    expect(result.success, result.error).toBe(true);
    expect(result.output).toContain("true");
  });

  it("keeps different paths distinct", () => {
    const result = run(`print(rawequal(game:GetService("Players"), game:GetService("Lighting")))`);
    expect(result.success, result.error).toBe(true);
    expect(result.output).toContain("false");
  });
});

describe("nothing in the harness varies between runs", () => {
  const REPEATABLE = [
    "print(tick(), time())",
    "wait(0.25) print(tick())",
    "local r = Random.new() print(tostring(r))",
    "print(tostring(game:GetService('Players').LocalPlayer))",
  ];

  for (const source of REPEATABLE) {
    it(source.slice(0, 44), () => {
      // Two runs of one script must agree, or every comparison built on
      // the harness is comparing noise.
      expect(run(source).output).toBe(run(source).output);
    });
  }
});

describe("a script that waits forever is stopped rather than hung", () => {
  it("gives up instead of looping without end", () => {
    const result = run("local n = 0 while true do wait() n = n + 1 end print(n)");
    expect(result.success).toBe(false);
    expect(result.error ?? "").toContain("waits forever");
  });

  it("leaves a bounded wait loop alone", () => {
    const result = run("local n = 0 while n < 5 do wait(0.1) n = n + 1 end print(n)");
    expect(result.success, result.error).toBe(true);
    expect(result.output).toContain("5");
  });
});
