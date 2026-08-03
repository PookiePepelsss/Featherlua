import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { compressAggressive } from "../compress-aggressive";
import { compressSafe } from "../compress-safe";
import { createOfficialLuau, executeWithOfficialLuau, type LuauModule } from "../official/runtime";

let mod: LuauModule;
beforeAll(async () => {
  const wasm = readFileSync(join(process.cwd(), "public", "wasm", "luau.wasm"));
  mod = await createOfficialLuau(new Uint8Array(wasm));
}, 30_000);

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}
// Table and function identities print as raw pointers, and runtime error
// messages carry a line number that minification legitimately changes.
// Neither says anything about whether compression preserved behavior.
function norm(o: string) {
  return o.replace(/0x[0-9a-f]+/g, "ADDR").replace(/main:\d+:/g, "main:L:");
}
const pick = <T>(n: () => number, a: T[]): T => a[Math.floor(n() * a.length)];

function gen(seed: number): string {
  const n = rng(seed);
  const num = () => String(Math.floor(n() * 21) - 10);
  const str = () => `"s${Math.floor(n() * 4)}"`;
  const atom = (): string => pick(n, [num(), str(), "true", "false", "nil", "a", "b", "c"]);

  function expr(d: number): string {
    if (d <= 0) return atom();
    return pick(n, [
      `(${expr(d - 1)})`,
      `${expr(d - 1)} ${pick(n, ["+", "-", "*", "%"])} ${num()}`,
      `${expr(d - 1)} ${pick(n, ["==", "~=", "<", "<=", ">", ">="])} ${expr(d - 1)}`,
      `${expr(d - 1)} ${pick(n, ["and", "or"])} ${expr(d - 1)}`,
      `not ${expr(d - 1)}`,
      `-(${num()})`,
      `#${str()}`,
      `tostring(${expr(d - 1)})..${str()}`,
      `{${expr(d - 1)}, k=${expr(d - 1)}, [${str()}]=${expr(d - 1)}}`,
      `(function(x) return x end)(${expr(d - 1)})`,
      `if ${expr(d - 1)} then ${expr(d - 1)} else ${expr(d - 1)}`,
      `select("#", ${expr(d - 1)}, ${expr(d - 1)})`,
      `type(${expr(d - 1)})`,
      `${expr(d - 1)} == nil and 0 or 1`,
    ]);
  }

  function stat(d: number): string {
    if (d <= 0) return `p(${expr(1)})`;
    return pick(n, [
      `p(${expr(2)})`,
      `local v${d} = ${expr(2)} p(v${d})`,
      `a = ${expr(1)} p(a)`,
      `a, b = b, a p(a, b)`,
      `if ${expr(1)} then ${stat(d - 1)} else ${stat(d - 1)} end`,
      `for i = 1, 3 do ${stat(d - 1)} end`,
      `for i = 3, 1, -1 do ${stat(d - 1)} end`,
      `do ${stat(d - 1)} end`,
      `local i = 0 repeat i = i + 1 ${stat(d - 1)} until i >= 2`,
      `while c < 3 do c = c + 1 ${stat(d - 1)} end c = 0`,
      `local f = function(x, ...) return x, select("#", ...) end p(f(${expr(1)}, 1, 2))`,
      `local t = {${expr(1)}, ${expr(1)}} for k, v in ipairs(t) do p(k, v) end`,
      `local ok, e = pcall(function() ${stat(d - 1)} end) p(ok, e)`,
      `local t = setmetatable({}, {__index = function(_, k) return k end}) p(t.zz)`,
      `local s = "" for i = 1, 3 do s ..= tostring(i) end p(s)`,
      `local x = ${expr(1)} x = x p(x)`,
      `local function g() return 1, 2 end p(g()) p((g()))`,
      `local up = 0 local function inc() up = up + 1 return up end inc() inc() p(up)`,
      `local x = 5 do local x = x + 1 p(x) end p(x)`,
      `local o = {n = 0} function o:add(k) self.n = self.n + k return self end p(o:add(2):add(3).n)`,
      `local unused = ${str()} local kept = ${str()} p(kept)`,
      `local s1, s2, s3 = "rep", "rep", "rep" p(s1 .. s2 .. s3)`,
      `local function fact(k) if k <= 1 then return 1 end return k * fact(k - 1) end p(fact(4))`,
      `local t = {} t[1], t[2] = 1, 2 p(t[1], t[2], #t)`,
      `local q = 1 local w = 2 local e = 3 p(q + w + e)`,
      `local side = (function() c = c + 1 return c end)() p(side, c) c = 0`,
      `for i = 1, 2, 0.5 do p(i) end`,
      `local a1 = "dup" local b1 = "dup" local c1 = "dup" local d1 = "dup" p(a1, b1, c1, d1)`,
      `local n1 = 2 local n2 = n1 * 3 local n3 = n2 + n1 p(n1, n2, n3)`,
      `local cl = {} for i = 1, 3 do cl[i] = function() return i end end p(cl[1](), cl[2](), cl[3]())`,
      `local ta = {1,2,3} p(table.concat(ta, ","), #ta, table.unpack(ta))`,
      `local str1 = string.format("%d-%s", 7, "x") p(str1)`,
      `local va = function(...) return ... end p(va(1, 2, 3)) p((va(1, 2, 3)))`,
      `local m = 0 while true do m = m + 1 if m > 2 then break end end p(m)`,
      `local x: number = 1 p(x)`,
      `local t: {[string]: number} = {k = 1} p(t.k)`,
      `type Alias = {n: number} local v: Alias = {n = 3} p(v.n)`,
      `export type Pub = string local s: Pub = "z" p(s)`,
      `local function tf<T>(v: T): T return v end p(tf(${expr(1)}))`,
      `local o = {n = 1} function o:get(): number return self.n end p(o:get())`,
      `local o = {} function o.st(k) return k end p(o.st(${expr(1)}))`,
      `p(("abc"):upper())`,
      `p(string.rep("ab", 2))`,
      "local s = `v={" + expr(1) + "} w={a}` p(s)",
      "local s = `nest={`in={a}`}` p(s)",
      `p(tostring(${expr(1)}) :: string)`,
      `local function mr(): (number, string) return 1, "t" end p(mr())`,
      `local function vt(...: number) return select("#", ...) end p(vt(1, 2, 3))`,
      `local t = {1, 2, 3,} p(#t, t[1])`,
      `local t = {[1] = "x"; [2] = "y";} p(t[1], t[2])`,
      `p(type(${expr(1)}), typeof(${expr(1)}))`,
      `local mc = setmetatable({}, {__call = function(_, k) return k end}) p(mc(${expr(1)}))`,
      `local u = {v = {w = {x = 5}}} p(u.v.w.x)`,
      `p(("%s-%d"):format("k", 9))`,
      `local d = {} d["dup-string-value-here"] = 1 p(d["dup-string-value-here"], d["dup-string-value-here"])`,
      `p(0xDEADBEEFDEADBEEFDEADBEEF, 0b${"1".repeat(70)}, 0xFFFFFFFFFFFFFFFF)`,
    ]);
  }

  const body: string[] = [];
  for (let i = 0; i < 4; i += 1) body.push(stat(2));
  return [
    "local __o = {}",
    "local function p(...) local n = select('#', ...) local r = {} for i = 1, n do r[i] = tostring((select(i, ...))) end __o[#__o+1] = table.concat(r, '|') end",
    "local a, b, c = 1, 2, 0",
    ...body,
    "print(table.concat(__o, ';'))",
  ].join("\n");
}

// Grammar fuzzing only proves the output still parses. This runs every
// generated program under the official Luau runtime before and after
// compression and compares what it printed, which is the only check that
// can catch a pass that produces valid Luau meaning something else.
describe("execution differential fuzz", () => {
  it("800 generated programs behave identically under Safe and Aggressive", () => {
    const failures: string[] = [];
    for (let seed = 1; seed <= 800; seed += 1) {
      const src = gen(seed);
      const base = executeWithOfficialLuau(mod, src);
      if (!base.success) continue;

      const safe = compressSafe(src);
      const sr = executeWithOfficialLuau(mod, safe);
      if (!sr.success || norm(sr.output) !== norm(base.output)) {
        failures.push(`seed ${seed} SAFE: ${sr.error ?? "diff"}\n--- src\n${src}\n--- out\n${safe}\n--- want ${base.output}\n--- got ${sr.output}`);
        continue;
      }

      const agg = compressAggressive(src);
      if (!agg.ok) {
        failures.push(`seed ${seed} AGG parse: ${agg.error.message}\n${src}`);
        continue;
      }
      const ar = executeWithOfficialLuau(mod, agg.output);
      if (!ar.success || norm(ar.output) !== norm(base.output)) {
        failures.push(`seed ${seed} AGG: ${ar.error ?? "diff"}\n--- src\n${src}\n--- out\n${agg.output}\n--- want ${base.output}\n--- got ${ar.output}`);
      }
    }
    expect(failures.slice(0, 3)).toEqual([]);
  }, 300_000);
});
