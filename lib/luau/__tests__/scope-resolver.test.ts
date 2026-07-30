import { describe, expect, it } from "vitest";
import { parse } from "../parser";
import { resolveScopes } from "../scope-resolver";
import type { Expr, LocalStat, Stat } from "../ast";

function resolve(source: string) {
  const { chunk } = parse(source);
  return resolveScopes(chunk);
}

describe("scope resolver: grammar wrinkles", () => {
  it("`local x = x`: RHS resolves to the pre-existing binding, not the new local", () => {
    const { chunk } = resolve("local x = 1\nlocal x = x");
    const first = chunk.body[0] as LocalStat;
    const second = chunk.body[1] as LocalStat;
    const rhs = second.init[0] as Extract<Expr, { type: "Identifier" }>;
    expect(rhs.symbolId).toBe(first.names[0].symbolId);
    expect(rhs.symbolId).not.toBe(second.names[0].symbolId);
  });

  it("`local function fib` is self-visible: the recursive call resolves to its own symbolId", () => {
    const { chunk } = resolve("local function fib(n) return fib(n - 1) end");
    const stat = chunk.body[0] as Extract<Stat, { type: "LocalFunctionStat" }>;
    const body0 = stat.func.body[0] as Extract<Stat, { type: "ReturnStat" }>;
    const call = body0.args[0] as Extract<Expr, { type: "CallExpr" }>;
    const callee = call.callee as Extract<Expr, { type: "Identifier" }>;
    expect(callee.symbolId).toBe(stat.symbolId);
  });

  it("`local f = function() return f end`: inner `f` is NOT self-visible (resolves to a global)", () => {
    const { chunk } = resolve("local f = function() return f end");
    const stat = chunk.body[0] as LocalStat;
    const funcExpr = stat.init[0] as Extract<Expr, { type: "FunctionExpr" }>;
    const ret = funcExpr.body[0] as Extract<Stat, { type: "ReturnStat" }>;
    const inner = ret.args[0] as Extract<Expr, { type: "Identifier" }>;
    expect(inner.isGlobal).toBe(true);
    expect(inner.symbolId).toBeUndefined();
  });

  it("nested closures capture outer locals by symbolId, not by name", () => {
    const { chunk } = resolve(`
      local function makeCounter()
        local count = 0
        local function increment()
          count = count + 1
          return count
        end
        return increment
      end
    `);
    const outer = chunk.body[0] as Extract<Stat, { type: "LocalFunctionStat" }>;
    const countDecl = (outer.func.body[0] as LocalStat).names[0];
    const innerFn = outer.func.body[1] as Extract<Stat, { type: "LocalFunctionStat" }>;
    const assign = innerFn.func.body[0] as Extract<Stat, { type: "AssignStat" }>;
    const target = assign.targets[0] as Extract<Expr, { type: "Identifier" }>;
    expect(target.symbolId).toBe(countDecl.symbolId);
    const ret = innerFn.func.body[1] as Extract<Stat, { type: "ReturnStat" }>;
    const retRef = ret.args[0] as Extract<Expr, { type: "Identifier" }>;
    expect(retRef.symbolId).toBe(countDecl.symbolId);
  });

  it("shadowing across nested do-blocks: each `local x` gets a distinct symbolId", () => {
    const { chunk } = resolve(`
      local x = 1
      do
        local x = 2
        do
          local x = 3
        end
      end
    `);
    const outer = (chunk.body[0] as LocalStat).names[0].symbolId;
    const doStat = chunk.body[1] as Extract<Stat, { type: "DoStat" }>;
    const middle = (doStat.body[0] as LocalStat).names[0].symbolId;
    const innerDo = doStat.body[1] as Extract<Stat, { type: "DoStat" }>;
    const inner = (innerDo.body[0] as LocalStat).names[0].symbolId;
    const ids = new Set([outer, middle, inner]);
    expect(ids.size).toBe(3);
  });

  it("repeat/until: the condition resolves to the body's local (scope leak)", () => {
    const { chunk } = resolve("repeat local x = compute() until x > 0");
    const stat = chunk.body[0] as Extract<Stat, { type: "RepeatStat" }>;
    const decl = (stat.body[0] as LocalStat).names[0];
    const cond = stat.cond as Extract<Expr, { type: "BinaryExpr" }>;
    const condRef = cond.left as Extract<Expr, { type: "Identifier" }>;
    expect(condRef.symbolId).toBe(decl.symbolId);
    expect(condRef.isGlobal).toBeUndefined();
  });

  it("numeric for: loop variable is scoped to the body only", () => {
    const { chunk } = resolve("for i = 1, 10 do print(i) end\nprint(i)");
    const forStat = chunk.body[0] as Extract<Stat, { type: "NumericForStat" }>;
    const callStat = forStat.body[0] as Extract<Stat, { type: "CallStat" }>;
    const call = callStat.call as Extract<Expr, { type: "CallExpr" }>;
    const argRef = call.args[0] as Extract<Expr, { type: "Identifier" }>;
    expect(argRef.symbolId).toBe(forStat.symbolId);

    const outerCallStat = chunk.body[1] as Extract<Stat, { type: "CallStat" }>;
    const outerCall = outerCallStat.call as Extract<Expr, { type: "CallExpr" }>;
    const outerRef = outerCall.args[0] as Extract<Expr, { type: "Identifier" }>;
    expect(outerRef.isGlobal).toBe(true);
  });

  it("generic for: all loop variables get distinct symbolIds scoped to the body", () => {
    const { chunk } = resolve("for k, v in pairs(t) do print(k, v) end");
    const forStat = chunk.body[0] as Extract<Stat, { type: "GenericForStat" }>;
    expect(forStat.symbolIds).toHaveLength(2);
    expect(new Set(forStat.symbolIds)).toHaveProperty("size", 2);
    // `t` (the iterated table) is a global, resolved in the OUTER scope.
    const iterCall = forStat.exprs[0] as Extract<Expr, { type: "CallExpr" }>;
    const tRef = iterCall.args[0] as Extract<Expr, { type: "Identifier" }>;
    expect(tRef.isGlobal).toBe(true);
  });

  it("implicit self: `function obj:method` synthesizes a self symbol referenced in the body", () => {
    const { chunk } = resolve("function obj:method() return self.x end");
    const stat = chunk.body[0] as Extract<Stat, { type: "FunctionDeclStat" }>;
    expect(stat.func.implicitSelf).toBe(true);
    expect(stat.func.selfSymbolId).toBeDefined();
    const ret = stat.func.body[0] as Extract<Stat, { type: "ReturnStat" }>;
    const member = ret.args[0] as Extract<Expr, { type: "MemberExpr" }>;
    const selfRef = member.object as Extract<Expr, { type: "Identifier" }>;
    expect(selfRef.symbolId).toBe(stat.func.selfSymbolId);
  });

  it("a callback parameter shadowing an outer local resolves independently", () => {
    const { chunk } = resolve(`
      local x = 1
      local function useX() return x end
      local wrapper = function(x) return x + useX() end
    `);
    const outerX = (chunk.body[0] as LocalStat).names[0].symbolId;
    const useX = chunk.body[1] as Extract<Stat, { type: "LocalFunctionStat" }>;
    const useXRet = useX.func.body[0] as Extract<Stat, { type: "ReturnStat" }>;
    const useXRef = useXRet.args[0] as Extract<Expr, { type: "Identifier" }>;
    expect(useXRef.symbolId).toBe(outerX);

    const wrapperStat = chunk.body[2] as LocalStat;
    const wrapperFunc = wrapperStat.init[0] as Extract<Expr, { type: "FunctionExpr" }>;
    const paramSymbolId = wrapperFunc.params[0].symbolId;
    expect(paramSymbolId).not.toBe(outerX);
    const wrapperRet = wrapperFunc.body[0] as Extract<Stat, { type: "ReturnStat" }>;
    const bin = wrapperRet.args[0] as Extract<Expr, { type: "BinaryExpr" }>;
    const paramRef = bin.left as Extract<Expr, { type: "Identifier" }>;
    expect(paramRef.symbolId).toBe(paramSymbolId);
  });

  it("every declared symbol gets a unique id, and the symbol table records original names/kinds", () => {
    const { symbols } = resolve("local x = 1\nlocal function f(a) return a end\nfor i = 1, 1 do end");
    const kinds = [...symbols.values()].map((s) => s.kind).sort();
    expect(kinds).toEqual(["local", "local", "loopvar", "param"]);
    const ids = [...symbols.keys()];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("assigning to an undeclared name is a global assignment, not an implicit declaration", () => {
    const { chunk } = resolve("x = 1");
    const stat = chunk.body[0] as Extract<Stat, { type: "AssignStat" }>;
    const target = stat.targets[0] as Extract<Expr, { type: "Identifier" }>;
    expect(target.isGlobal).toBe(true);
  });
});
