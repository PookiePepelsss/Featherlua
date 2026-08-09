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

// The harness renders every argument a stub receives, and that rendering
// is what the verdict is built on. Anything in it that varies between two
// runs of the same program is a false alarm; anything it flattens away is
// a difference nobody will be told about.
describe("the harness renders arguments without lying either way", () => {
  it("does not report a difference for an address that simply moved", () => {
    // Two programs that behave identically but allocate differently. The
    // closures land at different addresses, and that must not show.
    const lean = 'setreadonly({ __index = function() end, __namecall = function() end }, false)';
    const padded = `local pad = { 1, 2, 3, 4, 5, 6, 7, 8 }\nlocal _ = #pad\n${lean}`;
    const a = run(lean);
    const b = run(padded);
    expect(a.success && b.success, "harness could not run the pair").toBe(true);
    expect(a.output).toBe(b.output);
    expect(a.output).not.toMatch(/0x[0-9a-f]+/i);
  });

  it("sees the contents of an array argument", () => {
    // Keys used to be stringified before being read back, so `rawget(t, "1")`
    // returned nil and every array looked the same as every other.
    const a = run("setclipboard({ 10, 20 })");
    const b = run("setclipboard({ 30, 40 })");
    expect(a.success && b.success).toBe(true);
    expect(a.output).not.toBe(b.output);
    expect(a.output).toContain("10");
  });

  it("sees a nested table rather than flattening it to an address", () => {
    const a = run("setclipboard({ cfg = { fov = 60 } })");
    const b = run("setclipboard({ cfg = { fov = 90 } })");
    expect(a.success && b.success).toBe(true);
    expect(a.output).not.toBe(b.output);
  });

  it("survives a table that contains itself", () => {
    const cyclic = "local t = {} t.self = t setclipboard(t)";
    const result = run(cyclic);
    expect(result.success, `cyclic table broke the harness: ${result.error}`).toBe(true);
  });
});
