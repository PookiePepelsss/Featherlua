import { describe, expect, it } from "vitest";
import { compressAggressive } from "../compress-aggressive";
import { parse } from "../parser";

function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function pick<T>(next: () => number, arr: T[]): T {
  return arr[Math.floor(next() * arr.length)];
}

function program(seed: number): string {
  const next = random(seed);
  const n = () => Math.floor(next() * 21) - 10;
  const s = () => `"str${Math.floor(next() * 5)}"`;
  const parts: string[] = [];
  parts.push(`local DEBUG${seed}=${next() > 0.5}`);
  parts.push(`local t${seed}={x=${n()},y=${n()},[${s()}]=${n()}}`);
  parts.push(`local function f${seed}(a,b) if a>b then return a else return b end end`);
  parts.push(`local function g${seed}(...) local n=select("#",...) return n end`);
  parts.push(`for i=1,${1 + Math.floor(next() * 5)} do`);
  parts.push(`  t${seed}.x=t${seed}.x+i`);
  parts.push(`  if DEBUG${seed} then print(${s()}) end`);
  parts.push(`  if i%2==0 then continue end`);
  parts.push(`end`);
  parts.push(`local ok,err=pcall(function() return f${seed}(1,2) end)`);
  parts.push(`local closure${seed}=function() return t${seed}.x end`);
  parts.push(`local mt${seed}={__index=function() return 0 end}`);
  parts.push(`setmetatable(t${seed},mt${seed})`);
  parts.push(`print(f${seed}(1,2),g${seed}(1,2,3),closure${seed}(),ok,err)`);
  parts.push(pick(next, [
    `for k,v in pairs(t${seed}) do print(k,v) end`,
    `local i=0 repeat i=i+1 until i>=3`,
    `while t${seed}.x<100 do t${seed}.x=t${seed}.x+1 break end`,
    `local msg=${s()}..${s()}..${s()}`,
    `local x,y,z=1,2,3 x,y=y,x`,
  ]));
  return parts.join("\n");
}

describe("wide-grammar fuzz", () => {
  it("compresses, reparses, and never grows 400 generated programs covering closures, metatables, pcall, varargs, generic-for, repeat-until", { timeout: 120_000 }, () => {
    const failures: string[] = [];
    for (let seed = 1; seed <= 400; seed += 1) {
      const source = program(seed);
      const result = compressAggressive(source);
      if (!result.ok) {
        failures.push(`seed ${seed}: ${result.error.message} (line ${result.error.line}, col ${result.error.col})`);
        continue;
      }
      try {
        parse(result.output);
      } catch (e) {
        failures.push(`seed ${seed}: output failed to reparse: ${(e as Error).message}`);
        continue;
      }
      if (result.output.length > source.length) {
        failures.push(`seed ${seed}: output grew (${source.length} -> ${result.output.length})`);
      }
    }
    expect(failures).toEqual([]);
  });
});
