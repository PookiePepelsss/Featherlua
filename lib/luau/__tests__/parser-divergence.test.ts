import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { parse } from "../parser";
import { compileWithOfficialLuau, createOfficialLuau, type LuauModule } from "../official/runtime";

// Where this parser is looser than Luau's is where output bugs hide: the
// printer feels free to emit the form, the self-check re-parses it with
// this same parser and approves, and only the real compiler objects. Two
// bugs found that way, `f\`s\`` and the shebang, are why this exists.
//
// The list is not a wish list. Each entry records what both parsers do
// today, so a change in either shows up as a failure rather than as a
// surprise months later.

let module: LuauModule;

beforeAll(async () => {
  const wasm = readFileSync(join(process.cwd(), "public", "wasm", "luau.wasm"));
  module = await createOfficialLuau(new Uint8Array(wasm));
}, 30_000);

function ours(source: string) {
  try {
    parse(source);
    return true;
  } catch {
    return false;
  }
}

const theirs = (source: string) => compileWithOfficialLuau(module, source).success;

// Accepted by both. The ordinary case, and the one that matters most.
const BOTH_ACCEPT = [
  'f"s"', "f[[s]]", "f{1}", "o:m'x'", "o:m{1}",
  "local a = [==[x]==]", "local a = .5", "local a = 5.",
  "local function f(...) return ... end", "return", "do return end",
  "a += 1", "a.b.c ..= 'x'", "a, b = b, a",
  "for i = 1, 2 do break end", "while true do continue end",
  "repeat until true", "if a then elseif b then else end",
  "for k, v in pairs(t) do end",
  "local a: number = 1", "type T = number", "export type T = number",
  "local a = b :: number", "local function f<T>(x: T): T return x end",
  "type F = (number) -> string", "local a: number? = nil",
  "function a.b.c:d() end", "local t = {1, 2,}", "local t = {1; 2}",
  "local s = `a{1}b`", "local a = -2^2", "local a = not not x",
  "local a = if x then 1 else 2", "local a = 1 // 2",
  "print(1)(2)", "(f)()", "local a = (...)",
  "--!strict\nreturn 1",
];

// Rejected by both. Nothing to do, but a change here is worth knowing.
const BOTH_REJECT = ["local = = = 3", "a = 1 = 2", "local t = {,}", "function f(a,) end"];

// Accepted here, rejected by Luau. Each is safe only because no pass
// produces it; if one ever does, the output will not compile.
// A single backslash, kept out of the literals below so nothing in this
// file depends on how a tool re-escapes it.
const BS = String.fromCharCode(92);

const ONLY_OURS = [
  "local a = 0x",
  `local a = '${BS}u{}'`,
  `local a = '${BS}x'`,
  `local a = '${BS}400'`,
  "local a <const> = 1",
  "local a <close> = nil",
  "local a <bogus> = 1",
  "continue",
  "break",
  "::a:: goto a",
  "goto nowhere",
  "local s = `{{}}`",
  ";;;",
  "local a = 1;;",
  "local a = f\n(g)()",
];

describe("forms both parsers accept", () => {
  for (const source of BOTH_ACCEPT) {
    it(JSON.stringify(source), () => {
      expect(theirs(source), "Luau rejects this now").toBe(true);
      expect(ours(source), "we reject valid Luau").toBe(true);
    });
  }
});

describe("forms both parsers reject", () => {
  for (const source of BOTH_REJECT) {
    it(JSON.stringify(source), () => {
      expect(theirs(source)).toBe(false);
      expect(ours(source)).toBe(false);
    });
  }
});

// The dangerous direction, recorded so it cannot grow unnoticed. A new
// entry here means a new way for the printer to emit uncompilable output.
describe("forms only this parser accepts", () => {
  for (const source of ONLY_OURS) {
    it(JSON.stringify(source), () => {
      expect(ours(source), "we now reject this; remove it from the list").toBe(true);
      expect(theirs(source), "Luau now accepts this; remove it from the list").toBe(false);
    });
  }

  it("has not grown", () => {
    expect(ONLY_OURS).toHaveLength(15);
  });
});
