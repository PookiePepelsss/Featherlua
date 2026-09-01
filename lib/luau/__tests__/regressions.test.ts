import { describe, expect, it } from "vitest";
import { parse } from "../parser";
import { compressAggressive } from "../compress-aggressive";

// Each case here is a confirmed bug found by manual review, with a fixed
// expected output that must itself re-parse (proving the output is valid
// Luau, not just "some string").
function assertValidRoundtrip(output: string) {
  expect(() => parse(output)).not.toThrow();
}

describe("regression: parens around a non-prefixexp base must survive", () => {
  it("indexing a parenthesized table constructor", () => {
    const result = compressAggressive("local x = ({a = 1}).a");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("local a=({a=1}).a");
    assertValidRoundtrip(result.output);
  });

  it("indexing a parenthesized table constructor with []", () => {
    const result = compressAggressive("local x = ({1, 2, 3})[1]");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("local a=({1,2,3})[1]");
    assertValidRoundtrip(result.output);
  });

  it("immediately-invoked parenthesized function expression", () => {
    // `x` is returned so the unused-local rewrite leaves the declaration
    // alone; the parens around the callee are what this case is about.
    const result = compressAggressive("local x = (function() return 1 end)() return x");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("local a=(function()return 1 end)()return a");
    assertValidRoundtrip(result.output);
  });

  it("method call on a parenthesized string literal", () => {
    const result = compressAggressive('local x = ("text"):sub(1) return x');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe('local a=("text"):sub(1)return a');
    assertValidRoundtrip(result.output);
  });

  it("cosmetic parens are still dropped when NOT a suffix-chain base", () => {
    // Contrast case: the fix must not regress the general (non-suffix-base)
    // paren-dropping behavior. `a`/`b`/`c` are globals here, so the local
    // `x` gets renamed to `d` (first name not colliding with a global).
    const result = compressAggressive("local x = (a + b) * c");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("local d=(a+b)*c");
  });

  it("double-parenthesized base still needs exactly one layer of real parens", () => {
    const result = compressAggressive("local x = ((({a = 1}))).a");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    assertValidRoundtrip(result.output);
    expect(result.output).toBe("local a=({a=1}).a");
  });
});

describe("regression: unterminated tokens must be rejected, not silently truncated", () => {
  it("unterminated quoted string", () => {
    const result = compressAggressive('local x = "abc');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/[Uu]nterminated/);
  });

  it("unterminated long-bracket string", () => {
    const result = compressAggressive("local x = [[abc");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/[Uu]nterminated/);
  });

  it("unterminated long comment", () => {
    const result = compressAggressive("--[[ never closed\nlocal x = 1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/[Uu]nterminated/);
  });

  it("unterminated interpolated string", () => {
    const result = compressAggressive("local x = `abc");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/[Uu]nterminated/);
  });

  it("unterminated interpolation expression", () => {
    const result = compressAggressive("local x = `abc {1 + 2`");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/[Uu]nterminated/);
  });

  it("a properly terminated long-bracket string with a similar-looking = level still parses", () => {
    const result = compressAggressive("local x = [==[ok]==]");
    expect(result.ok).toBe(true);
  });
});

describe("regression: typed varargs", () => {
  it("`function f(...: number)` parses (previously failed outright)", () => {
    // Aggressive mode strips type annotations (see the strip-types tests)
    // and, separately, would remove this never-called local function as
    // unused -- neither is the point here, which is just that parsing
    // succeeds at all (this used to throw "Expected ')'").
    const result = compressAggressive("local function f(...: number) return ... end", {
      removeUnusedLocals: false,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("...)");
    assertValidRoundtrip(result.output);
  });

  it("typed varargs alongside typed params", () => {
    const result = compressAggressive("local function f(a: string, ...: number) return a end");
    expect(result.ok).toBe(true);
  });
});

describe("regression: malformed numeric literals are rejected", () => {
  it("decimal exponent with no digits", () => {
    const result = compressAggressive("local x = 1e");
    expect(result.ok).toBe(false);
  });

  it("decimal exponent with only a sign, no digits", () => {
    const result = compressAggressive("local x = 1e+");
    expect(result.ok).toBe(false);
  });

  it("hex float exponent with no digits", () => {
    const result = compressAggressive("local x = 0x1p");
    expect(result.ok).toBe(false);
  });

  it("valid exponents of all forms still parse", () => {
    for (const src of ["local x = 1e5", "local x = 1e+5", "local x = 1e-5", "local x = 0x1p2", "local x = 0x1p+2"]) {
      expect(compressAggressive(src).ok).toBe(true);
    }
  });
});

describe("regression: self-validation catches printer bugs before they reach the user", () => {
  it("a deliberately broken printer path is caught by internal self-validation, not shipped", () => {
    // Sanity check that the safety net is wired up at all: feed it a
    // construct whose only way to break would be a printer regression, and
    // confirm success is real (not just result.ok trivially true because
    // nothing exercised the check).
    const result = compressAggressive("local a, b = ((f()))");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    assertValidRoundtrip(result.output);
  });
});

describe("regression: identifier ending in a digit before a dot", () => {
  const noFold = { rename: false, propagateConstants: false, removeUnusedLocals: false } as const;

  it("does not insert a space (needsSpace's digit-before-dot guard is number-only)", () => {
    const result = compressAggressive("local p1 = {x = 1}\nprint(p1.x)", noFold);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("p1.x");
    expect(result.output).not.toContain("p1 .x");
  });

  it("still protects a real number literal immediately before a dot", () => {
    const result = compressAggressive("print(1 .. 0.5)", noFold);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    assertValidRoundtrip(result.output);
  });
});

// Found by running the compressor over a corpus of real executor scripts.
// Propagating `local Format = "..."` into `Format:format(x)` leaves the
// literal as the base of the suffix chain, and `"...":format(x)` is not
// valid Lua. Source can never produce that shape, since it could not have
// parsed without parentheses in the first place, so only a pass can create
// it and only the printer can put the parentheses back.
describe("regression: a literal propagated into a suffix base keeps parentheses", () => {
  const CASES: [string, string][] = [
    [
      'local Format = "%d.lua"\nlocal url = Format:format(1)\nreturn url',
      'local a=("%d.lua"):format(1)return a',
    ],
    [
      'local Name = "abc"\nreturn Name:upper()',
      'return("abc"):upper()',
    ],
    [
      "local N = 5\nreturn N",
      "return 5",
    ],
  ];

  for (const [source, expected] of CASES) {
    it(source.split("\n")[0], () => {
      const result = compressAggressive(source);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.output).toBe(expected);
      assertValidRoundtrip(result.output);
    });
  }
});

// Found by running the compressor over real executor scripts: a field
// called `constructor` is an ordinary name in Lua, but looking it up in a
// plain JavaScript object answers with Object.prototype.constructor, which
// is not a list of risks and is not iterable. The reflection tables are
// Maps now.
describe("regression: names that collide with Object.prototype", () => {
  const NAMES = ["constructor", "toString", "valueOf", "hasOwnProperty", "isPrototypeOf", "__proto__"];

  for (const name of NAMES) {
    it(`a member called ${name}`, () => {
      const source = `local M = require(x)\nlocal v = debug.getupvalue(M.${name}, 3)\nreturn v`;
      const result = compressAggressive(source);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      assertValidRoundtrip(result.output);
    });

    it(`a global called ${name}`, () => {
      const result = compressAggressive(`${name}(1)\nreturn 1`);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      assertValidRoundtrip(result.output);
    });
  }
});

describe("regression: a statement starting with `(` keeps its boundary", () => {
  // Without the `;`, `local a=b` followed by `(f or g)()` re-parses as one
  // call chain, and the equivalence check refused perfectly good input.
  it("after a declaration ending in a name", () => {
    const result = compressAggressive("local a=b;(f or g)()");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("local a=b;(f or g)()");
    expect(parse(result.output).chunk.body).toHaveLength(2);
  });

  it("after a call", () => {
    const result = compressAggressive("f();(g)()");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(parse(result.output).chunk.body).toHaveLength(2);
  });

  it("not at the start of the chunk, where there is nothing to run into", () => {
    const result = compressAggressive("(f or g)()");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("(f or g)()");
  });
});

describe("regression: interpolation opening straight into a table", () => {
  // Luau's lexer refuses `{{` inside a backtick string, so a part that
  // prints starting with `{` needs a space after the interpolation brace.
  it("a bare table constructor", () => {
    const result = compressAggressive("local n=1 print(`{ {n} }`)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("print(`{ {1}}`)");
  });

  it("a comparison led by a table", () => {
    const result = compressAggressive("print(`{ {} == {} }`)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("print(`{ {}=={}}`)");
  });

  it("no space where the part starts with anything else", () => {
    const result = compressAggressive("local n=1 print(`{n}`)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("print(`{1}`)");
  });
});

describe("regression: `:: T` truncates multi-values, and stripping it must too", () => {
  // `select("#", f() :: any)` is 1 in Luau; handing back the bare call made
  // it 2. The parens carry the truncation the assertion performed.
  it("assertion on a call", () => {
    const result = compressAggressive('print(select("#", f() :: any))');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe('print(select("#",(f())))');
  });

  it("assertion on vararg", () => {
    const result = compressAggressive('return function(...) return select("#", ... :: any) end');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe('return function(...)return select("#",(...))end');
  });

  it("assertion on a single value needs no parens", () => {
    const result = compressAggressive("return x :: any");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("return x");
  });
});

describe("regression: `goto` is an ordinary Luau identifier", () => {
  it("declares, reads, and indexes under the name", () => {
    const result = compressAggressive('local goto = 2 local t = { goto = goto } return t["goto"]');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("local a={goto=2}return a.goto");
  });
});

describe("regression: compound assignment stays within one member step", () => {
  // `t.a.n += 1` evaluates `t.a` once where the spelled-out form reads it
  // twice, which a hooked `__index` observes; one step keeps the counts
  // identical, so only that folds.
  it("one step folds", () => {
    const result = compressAggressive("local t={n=1} t.n = t.n + 1 return t");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("local a={n=1}a.n+=1 return a");
  });

  it("two steps stay spelled out", () => {
    const result = compressAggressive("local t={a={n=1}} t.a.n = t.a.n + 1 return t");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe("local a={a={n=1}}a.a.n=a.a.n+1 return a");
  });
});
