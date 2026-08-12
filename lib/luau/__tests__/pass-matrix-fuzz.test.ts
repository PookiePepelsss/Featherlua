import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { compressAggressive, DEFAULT_AGGRESSIVE_OPTIONS } from "../compress-aggressive";
import { createOfficialLuau, executeWithOfficialLuau, type LuauModule } from "../official/runtime";
let module: LuauModule;
beforeAll(async () => { module = await createOfficialLuau(new Uint8Array(readFileSync(join(process.cwd(), "public", "wasm", "luau.wasm")))); }, 30_000);
// Constant propagation and unused-local removal are the two largest
// passes and the two that reason hardest about what a local is worth. The
// shapes below are the ones that catch them out: a local reassigned after
// it is read, one captured by a closure and then mutated, one whose only
// use is in a branch that cannot run, one whose initializer runs code.
//
// Every generated program is run before and after, under every combination
// of passes worth trying, and must print exactly the same thing. Nothing
// prints a table or a function directly, because their addresses differ
// between runs and would read as a difference that is not one.
let seed = 90210;
function rnd(n: number) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; }
const pick = <T,>(xs: T[]): T => xs[rnd(xs.length)];

function program(): string {
  const L: string[] = [
    "local log = {}",
    "local function show(x) if type(x) == 'table' then return 'table' end if type(x) == 'function' then return 'fn' end return tostring(x) end",
    "local function say(...) local p = {} for i = 1, select('#', ...) do p[i] = show((select(i, ...))) end log[#log+1] = table.concat(p, ',') end",
  ];
  const names: string[] = [];
  const n = 4 + rnd(8);
  for (let i = 0; i < n; i += 1) {
    const v = `v${i}`;
    names.push(v);
    switch (rnd(11)) {
      case 0: L.push(`local ${v} = ${rnd(50)}`); break;
      case 1: L.push(`local ${v} = "s${rnd(20)}"`); break;
      case 2: L.push(`local ${v} = ${rnd(50)} local _${i} = ${v} ${v} = ${rnd(50)}`); break;
      case 3: L.push(`local ${v} = {} ${v}.f = ${rnd(9)}`); break;
      case 4: L.push(`local ${v} = (function() return ${rnd(9)} end)()`); break;
      case 5: L.push(`local ${v} = ${rnd(9)}\nlocal function bump${i}() ${v} = ${v} + 1 return ${v} end\nsay("b", bump${i}(), bump${i}())`); break;
      case 6: L.push(`local ${v} = ${rnd(9)}\ndo local ${v} = ${rnd(9)} + 100 say("shadow", ${v}) end`); break;
      case 7: L.push(`local ${v} say("nil", ${v}) ${v} = ${rnd(9)}`); break;
      case 8: L.push(`local ${v} = ${rnd(2) === 0 ? "nil" : "false"}`); break;
      case 9: L.push(`local ${v}, w${i} = ${rnd(9)}, ${rnd(9)} say("multi", ${v}, w${i})`); break;
      default: L.push(`local ${v} = ${rnd(9)} if ${v} > 4 then ${v} = ${v} * 2 else ${v} = ${v} + 1 end`); break;
    }
    if (rnd(3) === 0 && names.length) L.push(`say("read", ${pick(names)})`);
    if (rnd(4) === 0) L.push(`if false then say("dead", ${pick(names)}) end`);
    if (rnd(5) === 0) L.push(`for k = 1, 2 do say("loop", k, ${pick(names)}) end`);
    if (rnd(6) === 0) L.push(`while false do say("never", ${pick(names)}) end`);
  }
  for (const v of names) L.push(`say("final", "${v}", ${v})`);
  L.push(`print(table.concat(log, "|"))`);
  return L.join("\n");
}

const MATRIX = [
  {}, { propagateConstants: false }, { removeUnusedLocals: false },
  { propagateConstants: false, removeUnusedLocals: false },
  { rename: false }, { mergeAdjacentLocals: false, mergeAdjacentAssigns: false },
  { hoistRepeatedStrings: false }, { aliasGlobals: true }, { foldConstants: false },
];

describe("propagation and unused-local removal survive the option matrix", () => {
  it("keeps 150 generated programs behaving identically", { timeout: 300_000 }, () => {
    let programs = 0, compressions = 0;
    const problems: string[] = [];
    for (let i = 0; i < 150 && problems.length < 3; i += 1) {
      const source = program();
      const before = executeWithOfficialLuau(module, source);
      if (!before.success) continue;
      programs += 1;
      for (const overrides of MATRIX) {
        const r = compressAggressive(source, { ...DEFAULT_AGGRESSIVE_OPTIONS, ...overrides });
        if (!r.ok) { problems.push(`refused ${JSON.stringify(overrides)}: ${r.error.message}`); continue; }
        const after = executeWithOfficialLuau(module, r.output);
        compressions += 1;
        if (!after.success || after.output !== before.output) {
          problems.push(`${JSON.stringify(overrides)}\nexpected ${before.output.slice(0, 180)}\ngot      ${(after.success ? after.output : after.error ?? "").slice(0, 180)}`);
        }
      }
    }
    expect(problems, `${problems.length} of ${compressions} compressions changed behaviour`).toEqual([]);
    expect(programs, "too few programs ran to mean anything").toBeGreaterThan(120);
    expect(compressions).toBeGreaterThan(1000);
  });
});
