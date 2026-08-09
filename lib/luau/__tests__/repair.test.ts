import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { suggestRepairs } from "../repair";
import { compileWithOfficialLuau, createOfficialLuau, type LuauModule } from "../official/runtime";

let module: LuauModule;

beforeAll(async () => {
  const wasm = readFileSync(join(process.cwd(), "public", "wasm", "luau.wasm"));
  module = await createOfficialLuau(new Uint8Array(wasm));
}, 30_000);

// A repair is only worth offering if the real compiler accepts the result,
// so every case here is checked against it rather than against the parser
// that proposed the edit.
const FIXABLE: [string, string, string][] = [
  ["a function left open", "local function f(a)\n\treturn a + 1\nprint(f(1))", "added a missing `end`"],
  ["an if left open", "local x = 1\nif x > 0 then\n\tprint(x)\nprint('done')", "added a missing `end`"],
  ["a for left open", "for i = 1, 3 do\n\tprint(i)\nprint('after')", "added a missing `end`"],
  ["a while left open", "local i = 0\nwhile i < 3 do\n\ti = i + 1\nprint(i)", "added a missing `end`"],
  ["two blocks left open", "local function f()\n\tif true then\n\t\tprint(1)\nend", "added a missing `end`"],
  ["a missing then", "local x = 1\nif x > 0\n\tprint(x)\nend", "added a missing `then`"],
  ["a missing do", "for i = 1, 3\n\tprint(i)\nend", "added a missing `do`"],
  ["a repeat left open", "local i = 0\nrepeat\n\ti = i + 1", "closed a `repeat` with `until true`"],
  ["an unclosed paren", "print((1 + 2)\nprint(3)", "closed an unclosed `(`"],
  ["an unclosed brace", "local t = {a = 1, b = 2\nprint(t)", "closed an unclosed `{`"],
  ["one end too many", "local x = 1\nprint(x)\nend", "removed an `end` with no block left to close"],
  ["a missing comma between table entries", "local t = {\n\ta = 1\n\tb = 2,\n}\nreturn t", "added a missing `,`"],
  // The text of a backtick string is not code. Counting an `end` written
  // inside one as a closer made the file look balanced, so nothing was
  // offered at all.
  [
    "a function left open around an interpolated string saying `end`",
    "local function f(n)\n\tprint(`we end at {n}`)\nprint(f(1))",
    "added a missing `end`",
  ],
  [
    "a function left open around an interpolated string with a stray brace",
    "local function f()\n\tprint(`a } b`)\nprint(f())",
    "added a missing `end`",
  ],
  // Decompilers put `local` in front of things that are not declarations.
  ["a stray local in a condition", "local t = {}\nif local t.Parent then\n\tprint(1)\nend", "dropped a stray `local`"],
  [
    "several functions left open at once, as a long file has",
    `local M = {}\n${Array.from(
      { length: 5 },
      (_, i) => `function M.f${i}()\n\tlocal t = {}\n\tfor k in pairs(t) do\n\t\tprint(k)\n\tend`,
    ).join("\n")}\nreturn M`,
    "added 5 missing `end`s",
  ],
];

describe("simple omissions are repaired", () => {
  for (const [name, broken, description] of FIXABLE) {
    it(name, () => {
      const [repair] = suggestRepairs(broken);
      expect(repair, "no repair offered").toBeDefined();
      expect(repair.description).toBe(description);
      const compiled = compileWithOfficialLuau(module, repair.fixed);
      expect(compiled.success, `repaired source rejected: ${compiled.error}`).toBe(true);
    });
  }
});

// Anything needing a guess about intent is left alone. Silently rewriting
// code that is not understood is worse than reporting the error.
const LEFT_ALONE: [string, string][] = [
  ["source that already parses", "local x = 1 print(x)"],
  ["source that already parses and is empty", ""],
  ["gibberish", "local = = = 3 ]]]"],
  ["several unrelated errors at once", "function ( ) ) end end end if if if"],
  // A handful of unclosed blocks is ordinary in a long file and does get
  // repaired. Dozens of them means the file is wrong in some other way, and
  // a wall of `end`s would paper over that rather than fix it.
  ["dozens of blocks left open", `${"if a then\n".repeat(30)}print(1)`],
  ["crossed brackets", "print((1 + 2]\n"],
];

describe("anything ambiguous is left to the author", () => {
  for (const [name, source] of LEFT_ALONE) {
    it(name, () => {
      expect(suggestRepairs(source)).toEqual([]);
    });
  }
});

describe("a repair never changes what the script does", () => {
  it("closes a block where its indentation says it ended, not at the end of the file", () => {
    // Appending would leave the call inside the function, where it never
    // runs. It compiles either way, which is exactly why placement is
    // decided by the author's indentation rather than by where the parser
    // happened to run out of input.
    const [repair] = suggestRepairs('local function greet(name)\n\tprint(name)\ngreet("Pookie")\n');
    expect(repair.fixed).toBe('local function greet(name)\n\tprint(name)\nend\ngreet("Pookie")\n');
  });

  it("removes the surplus `end` the parser named, not the last one in the file", () => {
    // Taking the last `end` would delete the closer that `b` still needs,
    // which is how a stray `end` thousands of lines up goes unrepaired.
    const broken = [
      "local function a()",
      "\tprint(1)",
      "end",
      "end",
      "local function b()",
      "\tprint(2)",
      "end",
      "a() b()",
    ].join("\n");
    const [repair] = suggestRepairs(broken);
    expect(repair, "no repair offered").toBeDefined();
    expect(repair.line).toBe(4);
    expect(repair.fixed).toBe(
      "local function a()\n\tprint(1)\nend\nlocal function b()\n\tprint(2)\nend\na() b()",
    );
  });

  it("still appends when nothing follows the block", () => {
    const [repair] = suggestRepairs("local function f()\n\tprint(1)");
    expect(repair.fixed).toBe("local function f()\n\tprint(1)\nend\n");
  });

  it("closes a bracket on its own line rather than at the end of the file", () => {
    // Appending at the end would swallow every statement in between into
    // the call.
    const [repair] = suggestRepairs("print((1 + 2)\nprint(3)");
    expect(repair.fixed).toBe("print((1 + 2))\nprint(3)");
  });
});

// A file with one omission is the easy case. A file with the same omission
// several times over is the common one, and fixing only the first leaves
// something that still does not parse.
describe("several instances of one omission", () => {
  it("commas missing from a table", () => {
    const [repair] = suggestRepairs("local t = {\n\ta = 1\n\tb = 2\n\tc = 3,\n}\nreturn t");
    expect(repair, "no repair offered").toBeDefined();
    expect(repair.description).toContain("2 small fixes");
    expect(repair.fixed).toBe("local t = {\n\ta = 1,\n\tb = 2,\n\tc = 3,\n}\nreturn t");
  });

  it("several blocks left open", () => {
    const source = `local M = {}\n${Array.from(
      { length: 4 },
      (_, i) => `function M.f${i}()\n\tprint(${i})`,
    ).join("\n")}\nreturn M`;
    const [repair] = suggestRepairs(source);
    expect(repair, "no repair offered").toBeDefined();
    expect(repair.fixed.match(/\bend\b/g) ?? []).toHaveLength(4);
  });
});

// Decompilers emit `local t.field = v` regularly. It is not Lua: `local`
// declares a name, and a field belongs to a table that already exists.
describe("a local declaring a field", () => {
  it("drops the local", () => {
    const [repair] = suggestRepairs("local t = {}\nlocal t.Parent = game\nreturn t");
    expect(repair, "no repair offered").toBeDefined();
    expect(repair.description).toContain("dropped a `local`");
    expect(repair.fixed).toBe("local t = {}\nt.Parent = game\nreturn t");
  });

  it("drops several", () => {
    const [repair] = suggestRepairs("local a = {}\nlocal a.x = 1\nlocal a.y = 2\nreturn a");
    expect(repair, "no repair offered").toBeDefined();
    expect(repair.fixed).toBe("local a = {}\na.x = 1\na.y = 2\nreturn a");
  });

  it("leaves a real local declaration alone", () => {
    expect(suggestRepairs("local t = {}\nlocal x = t.Parent\nreturn x")).toEqual([]);
  });
});

// One `end` too many rarely has a single answer. The parser names the first
// that closes nothing, but removing an earlier one often parses just as
// well and nests the code differently. Both compile, so picking the wrong
// one is silent, and that belongs to the author rather than to a guess.
describe("a surplus end that could be either", () => {
  it("declines when removing a different end nests the code differently", () => {
    const source = [
      "local function outer()",
      "\tif cond then",
      "\t\tprint(1)",
      "\tend",
      "\tend",
      "\tprint(2)",
      "end",
      "return outer",
    ].join("\n");
    expect(suggestRepairs(source)).toEqual([]);
  });

  it("still repairs when only one removal is possible", () => {
    const [repair] = suggestRepairs("local x = 1\nprint(x)\nend");
    expect(repair, "no repair offered").toBeDefined();
    expect(repair.description).toContain("removed an `end`");
  });
});
