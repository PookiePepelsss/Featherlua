import { describe, expect, it } from "vitest";
import { compressSafe } from "../compress-safe";

describe("safe dialect compression", () => {
  it.each(["luau", "lua51", "lua52", "lua53", "lua54"] as const)("compresses %s without changing tokens", (dialect) => {
    expect(compressSafe("local value = 1 -- note\nreturn value", dialect)).toBe("local value=1 return value");
  });

  it("keeps LuaJIT FFI integer suffixes attached", () => {
    expect(compressSafe("local a = 42LL\nlocal b = 0xffffULL\nreturn a, b", "luajit"))
      .toBe("local a=42LL local b=0xffffULL return a,b");
  });

  it("keeps directives, licenses, long strings, and shebangs", () => {
    const source = "#!/usr/bin/env luau\n--!strict\n-- SPDX-License-Identifier: MIT\nlocal x = [=[a -- b]=]\nreturn x";
    const output = compressSafe(source, "luau");
    expect(output).toContain("#!/usr/bin/env luau");
    expect(output).toContain("--!strict");
    expect(output).toContain("SPDX-License-Identifier");
    expect(output).toContain("[=[a -- b]=]");
  });
});
