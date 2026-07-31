import type { Expr, LocalStat, Stat } from "./ast";
import type { ResolvedProgram } from "./scope-resolver";
import { someExpr } from "./ast-search";

// `local a=1 local b=2` -> `local a,b=1,2`. Requires both sides fully
// saturated (one init per name) or both bare -- a partial/overflowing init
// list (`local a=f(),g()`) would shift which value lands on which name
// once concatenated. Also refuses to merge when `b`'s init reads `a`'s
// symbol: in `local a,b=1,a+1`, the right-hand `a` would resolve to
// whatever was in scope BEFORE this statement (real Lua semantics), not
// the `a=1` just declared -- exactly the trap that made this unsafe in the
// unmerged code's original meaning. Any miscategorization here still fails
// closed: compress-aggressive.ts re-validates output against the source
// tree before shipping it.
export function mergeAdjacentLocals(resolved: ResolvedProgram): boolean {
  let changed = false;
  resolved.chunk.body = mergeBlock(resolved.chunk.body, () => {
    changed = true;
  });
  return changed;
}

function canMerge(a: LocalStat, b: LocalStat): boolean {
  if (a.names.length !== 1 || b.names.length !== 1) return false;
  if (a.init.length === 0 && b.init.length === 0) return true;
  if (a.init.length !== 1 || b.init.length !== 1) return false;
  const id = a.names[0].symbolId;
  if (id === undefined) return false;
  return !someExpr(b.init[0], (e) => e.type === "Identifier" && e.symbolId === id);
}

function mergeBlock(stats: Stat[], onChange: () => void): Stat[] {
  const processed = stats.map((s) => mergeInStat(s, onChange));
  const out: Stat[] = [];
  for (const stat of processed) {
    const prev = out[out.length - 1];
    if (prev && prev.type === "LocalStat" && stat.type === "LocalStat" && canMerge(prev, stat)) {
      prev.names = prev.names.concat(stat.names);
      prev.init = prev.init.concat(stat.init);
      onChange();
      continue;
    }
    out.push(stat);
  }
  return out;
}

function mergeInStat(stat: Stat, onChange: () => void): Stat {
  const visit = (e: Expr) => mergeInExpr(e, onChange);
  switch (stat.type) {
    case "LocalStat":
      stat.init.forEach(visit);
      return stat;
    case "LocalFunctionStat":
      stat.func.body = mergeBlock(stat.func.body, onChange);
      return stat;
    case "FunctionDeclStat":
      visit(stat.target.base);
      stat.func.body = mergeBlock(stat.func.body, onChange);
      return stat;
    case "AssignStat":
      stat.targets.forEach(visit);
      stat.values.forEach(visit);
      return stat;
    case "CompoundAssignStat":
      visit(stat.target);
      visit(stat.value);
      return stat;
    case "CallStat":
      visit(stat.call);
      return stat;
    case "DoStat":
      stat.body = mergeBlock(stat.body, onChange);
      return stat;
    case "WhileStat":
      visit(stat.cond);
      stat.body = mergeBlock(stat.body, onChange);
      return stat;
    case "RepeatStat":
      stat.body = mergeBlock(stat.body, onChange);
      visit(stat.cond);
      return stat;
    case "IfStat":
      for (const clause of stat.clauses) {
        visit(clause.cond);
        clause.body = mergeBlock(clause.body, onChange);
      }
      if (stat.elseBody) stat.elseBody = mergeBlock(stat.elseBody, onChange);
      return stat;
    case "NumericForStat":
      visit(stat.start);
      visit(stat.stop);
      if (stat.step) visit(stat.step);
      stat.body = mergeBlock(stat.body, onChange);
      return stat;
    case "GenericForStat":
      stat.exprs.forEach(visit);
      stat.body = mergeBlock(stat.body, onChange);
      return stat;
    case "ReturnStat":
      stat.args.forEach(visit);
      return stat;
    default:
      return stat;
  }
}

function mergeInExpr(expr: Expr, onChange: () => void): void {
  const visit = (e: Expr) => mergeInExpr(e, onChange);
  switch (expr.type) {
    case "InterpolatedStringExpr":
      for (const part of expr.parts) if (typeof part !== "string") visit(part);
      return;
    case "IndexExpr":
      visit(expr.object);
      visit(expr.index);
      return;
    case "MemberExpr":
      visit(expr.object);
      return;
    case "CallExpr":
      visit(expr.callee);
      expr.args.forEach(visit);
      return;
    case "MethodCallExpr":
      visit(expr.object);
      expr.args.forEach(visit);
      return;
    case "FunctionExpr":
      expr.body = mergeBlock(expr.body, onChange);
      return;
    case "TableExpr":
      for (const field of expr.fields) {
        if (field.kind === "computed") visit(field.key);
        visit(field.value);
      }
      return;
    case "BinaryExpr":
      visit(expr.left);
      visit(expr.right);
      return;
    case "UnaryExpr":
      visit(expr.operand);
      return;
    case "TypeAssertionExpr":
      visit(expr.expr);
      return;
    case "IfExpr":
      visit(expr.cond);
      visit(expr.thenExpr);
      for (const clause of expr.elseifs) {
        visit(clause.cond);
        visit(clause.expr);
      }
      visit(expr.elseExpr);
      return;
    case "ParenExpr":
      visit(expr.expr);
      return;
    default:
      return;
  }
}
