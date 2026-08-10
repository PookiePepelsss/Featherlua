import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  compressAggressive,
  MEDIUM_AGGRESSIVE_OPTIONS,
} from "../compress-aggressive";
import { compressSafe } from "../compress-safe";
import { withExecutorHarness } from "../executor-harness";
import {
  compileWithOfficialLuau,
  createOfficialLuau,
  executeWithOfficialLuau,
  withoutShebang,
  type LuauModule,
} from "../official/runtime";

// Luau's compiler has no notion of a `#!` line and reports a parse error on
// one, so a script carrying it used to be turned away at the door: the
// README promised shebangs survive, and in practice nothing with one could
// be compressed at all. The line is stripped for compiling and running,
// which are the only places it cannot go, and kept everywhere else.

let module: LuauModule;

beforeAll(async () => {
  const wasm = readFileSync(join(process.cwd(), "public", "wasm", "luau.wasm"));
  module = await createOfficialLuau(new Uint8Array(wasm));
}, 30_000);

const SCRIPTS = [
  "#!/usr/bin/env luau\nlocal speed = 8 * 2\nprint(speed)",
  "#!/usr/bin/env luau\n--!strict\nprint(1)",
  "#!/usr/bin/luau\n-- SPDX-License-Identifier: MIT\nlocal t = {1, 2}\nprint(#t)",
];

describe("a script that opens with a shebang", () => {
  for (const source of SCRIPTS) {
    const label = source.split("\n")[0];

    it(`is accepted by the compiler: ${label}`, () => {
      expect(compileWithOfficialLuau(module, source).success).toBe(true);
    });

    it(`compresses and still compiles: ${label}`, () => {
      for (const [mode, options] of [
        ["Safe", "safe"],
        ["Medium", MEDIUM_AGGRESSIVE_OPTIONS],
        ["Aggressive", undefined],
      ] as const) {
        let output: string;
        if (options === "safe") output = compressSafe(source);
        else {
          const result = compressAggressive(source, options);
          expect(result.ok, result.ok ? "" : `${mode}: ${result.error.message}`).toBe(true);
          if (!result.ok) continue;
          output = result.output;
        }
        expect(output.startsWith("#!"), `${mode} dropped the shebang`).toBe(true);
        const compiled = compileWithOfficialLuau(module, output);
        expect(compiled.success, `${mode} output rejected: ${compiled.error}`).toBe(true);
      }
    });

    it(`runs the same before and after: ${label}`, () => {
      const before = executeWithOfficialLuau(module, source);
      expect(before.success, `baseline failed: ${before.error}`).toBe(true);
      const result = compressAggressive(source);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const after = executeWithOfficialLuau(module, result.output);
      expect(after.success, `output failed: ${after.error}`).toBe(true);
      expect(after.output).toBe(before.output);
    });

    it(`runs under the executor harness: ${label}`, () => {
      // The harness wraps the script below its prelude, which would leave
      // the shebang halfway down a file where it is a syntax error.
      const result = executeWithOfficialLuau(module, withExecutorHarness(source));
      expect(result.success, `harness rejected it: ${result.error}`).toBe(true);
    });
  }

  it("only strips a shebang, and only the first line", () => {
    expect(withoutShebang("#!/x\nreturn 1")).toBe("\nreturn 1");
    expect(withoutShebang("return 1")).toBe("return 1");
    expect(withoutShebang("-- #!/x\nreturn 1")).toBe("-- #!/x\nreturn 1");
    expect(withoutShebang("#!/x")).toBe("");
    // The newline stays, so every later line keeps the number it had.
    expect(withoutShebang("#!/x\na\nb").split("\n")).toHaveLength(3);
  });
});
