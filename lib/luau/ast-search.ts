import type { Expr, Stat } from "./ast";

// Shared "does any node in this subtree match?" search, used by every pass
// that needs to answer a yes/no safety question (contains a call? reads
// this symbol?) without mutating anything. Recurses into nested function
// bodies -- callers that need to stop at a function boundary don't use
// this.

export function someExpr(expr: Expr, predicate: (e: Expr) => boolean): boolean {
  if (predicate(expr)) return true;
  const visit = (e: Expr) => someExpr(e, predicate);
  switch (expr.type) {
    case "NilExpr":
    case "TrueExpr":
    case "FalseExpr":
    case "VarargExpr":
    case "NumberExpr":
    case "StringExpr":
    case "Identifier":
      return false;
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
      return someBlock(expr.body, predicate);
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

export function someStat(stat: Stat, predicate: (e: Expr) => boolean): boolean {
  const visit = (e: Expr) => someExpr(e, predicate);
  switch (stat.type) {
    case "LocalStat":
      return stat.init.some(visit);
    case "LocalFunctionStat":
      return someBlock(stat.func.body, predicate);
    case "FunctionDeclStat":
      return visit(stat.target.base) || someBlock(stat.func.body, predicate);
    case "AssignStat":
      return stat.targets.some(visit) || stat.values.some(visit);
    case "CompoundAssignStat":
      return visit(stat.target) || visit(stat.value);
    case "CallStat":
      return visit(stat.call);
    case "DoStat":
      return someBlock(stat.body, predicate);
    case "WhileStat":
      return visit(stat.cond) || someBlock(stat.body, predicate);
    case "RepeatStat":
      return someBlock(stat.body, predicate) || visit(stat.cond);
    case "IfStat":
      return (
        stat.clauses.some((c) => visit(c.cond) || someBlock(c.body, predicate)) ||
        (stat.elseBody !== undefined && someBlock(stat.elseBody, predicate))
      );
    case "NumericForStat":
      return (
        visit(stat.start) ||
        visit(stat.stop) ||
        (stat.step !== undefined && visit(stat.step)) ||
        someBlock(stat.body, predicate)
      );
    case "GenericForStat":
      return stat.exprs.some(visit) || someBlock(stat.body, predicate);
    case "ReturnStat":
      return stat.args.some(visit);
    default:
      return false;
  }
}

export function someBlock(stats: Stat[], predicate: (e: Expr) => boolean): boolean {
  return stats.some((stat) => someStat(stat, predicate));
}

export const isCallExpr = (e: Expr): boolean => e.type === "CallExpr" || e.type === "MethodCallExpr";

// Visits every statement in the subtree, including those in function
// bodies hanging off expressions.
export function forEachStat(stats: Stat[], fn: (stat: Stat) => void) {
  for (const stat of stats) {
    fn(stat);
    someStat(stat, (e) => {
      if (e.type === "FunctionExpr") forEachStat(e.body, fn);
      return false;
    });
    switch (stat.type) {
      case "LocalFunctionStat":
      case "FunctionDeclStat":
        forEachStat(stat.func.body, fn);
        break;
      case "DoStat":
      case "WhileStat":
      case "RepeatStat":
      case "NumericForStat":
      case "GenericForStat":
        forEachStat(stat.body, fn);
        break;
      case "IfStat":
        for (const clause of stat.clauses) forEachStat(clause.body, fn);
        if (stat.elseBody) forEachStat(stat.elseBody, fn);
        break;
      default:
        break;
    }
  }
}

// Every name the program binds or reads, so a pass synthesizing a local can
// pick one that shadows nothing. Member names and table keys are left out:
// they are a separate namespace and a local can never capture them.
export function collectNames(stats: Stat[], into = new Set<string>()): Set<string> {
  // someStat/someExpr already reach every expression in the subtree,
  // including nested function bodies, so one sweep covers all references
  // and every parameter name.
  const record = (e: Expr) => {
    if (e.type === "Identifier") into.add(e.name);
    else if (e.type === "FunctionExpr") {
      for (const param of e.params) into.add(param.name);
      for (const nested of e.body) collectDeclaredNames(nested, into);
    }
    return false;
  };
  for (const stat of stats) {
    someStat(stat, record);
    collectDeclaredNames(stat, into);
  }
  return into;
}

// Declaration names are the one thing someStat cannot see, since they are
// plain strings on the statement rather than Identifier expressions.
function collectDeclaredNames(stat: Stat, into: Set<string>) {
  const blocks: Stat[][] = [];
  switch (stat.type) {
    case "LocalStat":
      for (const name of stat.names) into.add(name.name);
      break;
    case "LocalFunctionStat":
      into.add(stat.name);
      for (const param of stat.func.params) into.add(param.name);
      blocks.push(stat.func.body);
      break;
    case "FunctionDeclStat":
      for (const param of stat.func.params) into.add(param.name);
      blocks.push(stat.func.body);
      break;
    case "NumericForStat":
      into.add(stat.varName);
      blocks.push(stat.body);
      break;
    case "GenericForStat":
      for (const name of stat.names) into.add(name);
      blocks.push(stat.body);
      break;
    case "DoStat":
    case "WhileStat":
    case "RepeatStat":
      blocks.push(stat.body);
      break;
    case "IfStat":
      for (const clause of stat.clauses) blocks.push(clause.body);
      if (stat.elseBody) blocks.push(stat.elseBody);
      break;
    default:
      break;
  }
  for (const block of blocks) {
    for (const nested of block) collectDeclaredNames(nested, into);
  }
}
