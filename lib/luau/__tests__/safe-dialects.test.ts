import { describe, expect, it } from "vitest";
import { compressSafe, verifySafeCompression } from "../compress-safe";

describe("safe dialect compression", () => {
  it.each(["luau", "lua51", "lua52", "lua53", "lua54"] as const)("compresses %s without changing tokens", (dialect) => {
    const source = "local value = 1 -- note\nreturn value";
    const output = compressSafe(source, dialect);
    expect(output).toBe("local value=1 return value");
    expect(verifySafeCompression(source, output, dialect)).toEqual({ success: true });
  });

  it("keeps LuaJIT FFI integer suffixes attached", () => {
    const source = "local a = 42LL\nlocal b = 0xffffULL\nreturn a, b";
    const output = compressSafe(source, "luajit");
    expect(output).toBe("local a=42LL local b=0xffffULL return a,b");
    expect(verifySafeCompression(source, output, "luajit")).toEqual({ success: true });
  });

  it("keeps directives, licenses, long strings, and shebangs", () => {
    const source = "#!/usr/bin/env luau\n--!strict\n-- SPDX-License-Identifier: MIT\nlocal x = [=[a -- b]=]\nreturn x";
    const output = compressSafe(source, "luau");
    expect(output).toContain("#!/usr/bin/env luau");
    expect(output).toContain("--!strict");
    expect(output).toContain("SPDX-License-Identifier");
    expect(output).toContain("[=[a -- b]=]");
    expect(verifySafeCompression(source, output, "luau")).toEqual({ success: true });
  });

  it("rejects changed tokens and protected comments", () => {
    expect(verifySafeCompression("local value=1", "local value=2", "lua54")).toMatchObject({ success: false });
    expect(verifySafeCompression("--!strict\nreturn 1", "return 1", "luau")).toMatchObject({ success: false });
  });
});
