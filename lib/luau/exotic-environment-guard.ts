import type { Chunk, Expr, Stat } from "./ast";

// hoist-repeated-access.ts and alias-repeated-global-calls.ts both rest on
// one assumption: reading a global has no side effect. That assumption
// gets shaky specifically when a script has the means to give the global
// environment a custom `__index` -- normal Roblox Lua doesn't expose
// `_G`/`_ENV`/`getfenv`/`setfenv` at all, so referencing any of them, or a
// known exploit-executor global-manipulation API, is itself a signal this
// script's environment can't be trusted to behave like a plain table.
//
// This doesn't change what either pass does -- the user's toggle is still
// the only thing that decides that. compress-aggressive.ts uses it to
// surface a warning alongside the output instead, so the decision to
// enable these options on a script like that stays informed but stays the
// user's.
//
// Deliberately narrow: ordinary `setmetatable` usage (the overwhelming
// majority of real Luau OOP code) is NOT on this list -- it almost always
// targets a local table, not the environment.
const EXOTIC_ENVIRONMENT_SIGNALS = new Set([
  "_G",
  "_ENV",
  "getfenv",
  "setfenv",
  "getrawmetatable",
  "setrawmetatable",
  "hookmetamethod",
  "hookfunction",
  "getgenv",
  "getrenv",
  "newcclosure",
  "checkcaller",
  "iscclosure",
  "islclosure",
  "clonefunction",
]);

export function hasExoticEnvironmentSignal(chunk: Chunk): boolean {
  return blockHasSignal(chunk.body);
}

function blockHasSignal(stats: Stat[]): boolean {
  return stats.some(statHasSignal);
}

function statHasSignal(stat: Stat): boolean {
  const visit = (e: Expr) => exprHasSignal(e);
  switch (stat.type) {
    case "LocalStat":
      return stat.init.some(visit);
    case "LocalFunctionStat":
      return blockHasSignal(stat.func.body);
    case "FunctionDeclStat":
      return visit(stat.target.base) || blockHasSignal(stat.func.body);
    case "AssignStat":
      return stat.targets.some(visit) || stat.values.some(visit);
    case "CompoundAssignStat":
      return visit(stat.target) || visit(stat.value);
    case "CallStat":
      return visit(stat.call);
    case "DoStat":
      return blockHasSignal(stat.body);
    case "WhileStat":
      return visit(stat.cond) || blockHasSignal(stat.body);
    case "RepeatStat":
      return blockHasSignal(stat.body) || visit(stat.cond);
    case "IfStat":
      return (
        stat.clauses.some((c) => visit(c.cond) || blockHasSignal(c.body)) ||
        (stat.elseBody !== undefined && blockHasSignal(stat.elseBody))
      );
    case "NumericForStat":
      return (
        visit(stat.start) ||
        visit(stat.stop) ||
        (stat.step !== undefined && visit(stat.step)) ||
        blockHasSignal(stat.body)
      );
    case "GenericForStat":
      return stat.exprs.some(visit) || blockHasSignal(stat.body);
    case "ReturnStat":
      return stat.args.some(visit);
    default:
      return false;
  }
}

function exprHasSignal(expr: Expr): boolean {
  const visit = (e: Expr) => exprHasSignal(e);
  switch (expr.type) {
    case "NilExpr":
    case "TrueExpr":
    case "FalseExpr":
    case "VarargExpr":
    case "NumberExpr":
    case "StringExpr":
      return false;
    case "Identifier":
      return EXOTIC_ENVIRONMENT_SIGNALS.has(expr.name);
    case "InterpolatedStringExpr":
      return expr.parts.some((part) => typeof part !== "string" && visit(part));
    case "IndexExpr":
      return visit(expr.object) || visit(expr.index);
    case "MemberExpr":
      return visit(expr.object);
    case "CallExpr":
      return visit(expr.callee) || expr.args.some(visit);
    case "MethodCallExpr":
      return visit(expr.object) || expr.args.some(visit);
    case "FunctionExpr":
      return blockHasSignal(expr.body);
    case "TableExpr":
      return expr.fields.some((f) => (f.kind === "computed" && visit(f.key)) || visit(f.value));
    case "BinaryExpr":
      return visit(expr.left) || visit(expr.right);
    case "UnaryExpr":
      return visit(expr.operand);
    case "TypeAssertionExpr":
      return visit(expr.expr);
    case "IfExpr":
      return (
        visit(expr.cond) ||
        visit(expr.thenExpr) ||
        expr.elseifs.some((c) => visit(c.cond) || visit(c.expr)) ||
        visit(expr.elseExpr)
      );
    case "ParenExpr":
      return visit(expr.expr);
  }
}
