import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { compressAggressive, MEDIUM_AGGRESSIVE_OPTIONS } from "../compress-aggressive";
import { withExecutorHarness } from "../executor-harness";
import { createOfficialLuau, executeWithOfficialLuau, type LuauModule } from "../official/runtime";

let module: LuauModule;

beforeAll(async () => {
  const wasm = readFileSync(join(process.cwd(), "public", "wasm", "luau.wasm"));
  module = await createOfficialLuau(new Uint8Array(wasm));
}, 30_000);

// The behaviour check the page offers is exactly this comparison, so what
// is asserted here is what a user is told. The worker adds the timeout and
// the wording; the judgement is the same.
function run(source: string) {
  return executeWithOfficialLuau(module, withExecutorHarness(source));
}

const EXECUTOR_SCRIPTS = [
  `local plr = game:GetService("Players").LocalPlayer
local speed = 16 * 2
plr.Character.Humanoid.WalkSpeed = speed
print("set", speed)`,
  `local old
old = hookmetamethod(game, "__namecall", function(self, ...)
  if getnamecallmethod() == "FireServer" then return nil end
  return old(self, ...)
end)`,
  `for i = 1, 3 do
  task.wait(0.1)
  print("tick " .. i, i % 2)
end`,
  `local cfg = { enabled = true, name = "aimbot", fov = 60 * 2 }
if cfg.enabled then
  print(cfg.name, cfg.fov)
end`,
];

describe("the behaviour check agrees the compression held", () => {
  for (const source of EXECUTOR_SCRIPTS) {
    it(source.split("\n")[0].slice(0, 50), () => {
      const before = run(source);
      expect(before.success, `harness could not run the original: ${before.error}`).toBe(true);

      for (const [mode, options] of [["Aggressive", undefined], ["Medium", MEDIUM_AGGRESSIVE_OPTIONS]] as const) {
        const compressed = compressAggressive(source, options);
        expect(compressed.ok, compressed.ok ? "" : compressed.error.message).toBe(true);
        if (!compressed.ok) continue;
        const after = run(compressed.output);
        expect(after.success, `${mode} output failed to run: ${after.error}`).toBe(true);
        expect(after.output, `${mode} changed what the script printed`).toBe(before.output);
      }
    });
  }
});

describe("the behaviour check would catch a real difference", () => {
  it("sees a changed constant", () => {
    const before = run('print("a", 1)');
    const after = run('print("a", 2)');
    expect(before.success && after.success).toBe(true);
    expect(after.output).not.toBe(before.output);
  });

  it("sees a call that stopped happening", () => {
    const before = run('local x = readfile("f") print(x)');
    const after = run('print("payload")');
    expect(before.success && after.success).toBe(true);
    // The harness records the readfile call, so dropping it shows up even
    // though both scripts print the same value.
    expect(after.output).not.toBe(before.output);
  });
});
