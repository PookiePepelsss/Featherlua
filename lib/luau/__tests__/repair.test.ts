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
  ["far too many blocks left open", "if a then\nif b then\nif c then\nif d then\nprint(1)"],
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
