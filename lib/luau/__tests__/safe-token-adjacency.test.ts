import { describe, expect, it } from "vitest";
import { compressSafe, verifySafeCompression } from "../compress-safe";

const TOKENS = [
  "a", "x1", "_v", "print", "and", "or", "not", "if", "then", "end", "local",
  "function", "return", "nil", "true", "for", "in", "do", "while",
  "1", "10", "0x1F", "1e5", ".5", "1.5", "0xA", "0b101", "1_000",
  '"s"', "'s'", "[[s]]", "[==[s]==]", "`t{a}`",
  "+", "-", "*", "/", "%", "^", "#", "==", "~=", "<=", ">=", "<", ">",
  "=", "(", ")", "{", "}", "[", "]", ";", ":", ",", ".", "..", "...",
  "::", "->", "//", "?", "&", "|",
  "+=", "-=", "*=", "/=", "%=", "^=", "..=", "//=",
];

describe("Safe mode: adjacent token pairs never re-lex differently", () => {
  it(`all ${TOKENS.length ** 2} pairs round-trip`, () => {
    const failures: string[] = [];
    for (const left of TOKENS) {
      for (const right of TOKENS) {
        const source = `${left} ${right}`;
        const output = compressSafe(source);
        const check = verifySafeCompression(source, output);
        if (!check.success) failures.push(`${JSON.stringify(source)} -> ${JSON.stringify(output)}: ${check.error}`);
      }
    }
    expect(failures).toEqual([]);
  });
});

describe("Safe mode: Luau lexical forms", () => {
  it("compresses without changing tokens", () => {
    const source = "local value = 1 -- note\nreturn value";
    const output = compressSafe(source);
    expect(output).toBe("local value=1 return value");
    expect(verifySafeCompression(source, output)).toEqual({ success: true });
  });

  it("keeps directives, licenses, long strings, and shebangs", () => {
    const source = "#!/usr/bin/env luau\n--!strict\n-- SPDX-License-Identifier: MIT\nlocal x = [=[a -- b]=]\nreturn x";
    const output = compressSafe(source);
    expect(output).toContain("#!/usr/bin/env luau");
    expect(output).toContain("--!strict");
    expect(output).toContain("SPDX-License-Identifier");
    expect(output).toContain("[=[a -- b]=]");
    expect(verifySafeCompression(source, output)).toEqual({ success: true });
  });

  it("keeps Luau numeric literal forms intact", () => {
    const source = "local a = 0b1010\nlocal b = 1_000_000\nlocal c = 0xFF\nlocal d = 1.5e-3\nreturn a, b, c, d";
    const output = compressSafe(source);
    expect(output).toBe("local a=0b1010 local b=1_000_000 local c=0xFF local d=1.5e-3 return a,b,c,d");
    expect(verifySafeCompression(source, output)).toEqual({ success: true });
  });

  it("rejects changed tokens and protected comments", () => {
    expect(verifySafeCompression("local value=1", "local value=2")).toMatchObject({ success: false });
    expect(verifySafeCompression("--!strict\nreturn 1", "return 1")).toMatchObject({ success: false });
  });
});
