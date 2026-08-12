import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { runSelfTest, SELF_TEST_COMMAND } from "../self-test";
import { createOfficialLuau, type LuauModule } from "../official/runtime";

// The command a user can type into the input box. It checks the build in
// front of them, so it has to be right about its own result: a green
// report from a broken build would be worse than no report at all.

let module: LuauModule;

beforeAll(async () => {
  const wasm = readFileSync(join(process.cwd(), "public", "wasm", "luau.wasm"));
  module = await createOfficialLuau(new Uint8Array(wasm));
}, 30_000);

describe("the run tests command", () => {
  it("is recognised however it is typed", () => {
    for (const text of ["run tests", "Run Tests", "  run   tests  ", "RUN TESTS\n"]) {
      expect(SELF_TEST_COMMAND.test(text), `not recognised: ${JSON.stringify(text)}`).toBe(true);
    }
  });

  it("is not confused with a script", () => {
    for (const text of [
      "run(tests)",
      "local run = tests",
      "print('run tests')",
      "run tests()",
      "-- run tests",
      "",
    ]) {
      expect(SELF_TEST_COMMAND.test(text), `wrongly treated as the command: ${JSON.stringify(text)}`).toBe(false);
    }
  });

  it("passes every check on a healthy build", () => {
    const report = runSelfTest(module);
    expect(report.failed, report.text).toBe(0);
    expect(report.passed).toBeGreaterThanOrEqual(12);
    expect(report.text).toContain("All ");
    expect(report.text).toContain("passed");
  });

  it("reports each case by name", () => {
    const report = runSelfTest(module);
    for (const name of ["arithmetic and numbers", "strings and escapes", "closures in a loop", "interpolation"]) {
      expect(report.text).toContain(name);
    }
  });

  it("finishes quickly enough to be worth pressing", () => {
    const started = Date.now();
    runSelfTest(module);
    expect(Date.now() - started).toBeLessThan(15000);
  });
});
