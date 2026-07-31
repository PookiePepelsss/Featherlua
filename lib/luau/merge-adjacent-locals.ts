import type { Expr, LocalStat, Stat } from "./ast";
import type { ResolvedProgram } from "./scope-resolver";

// Merges two adjacent single-name `local` declarations into one:
// `local a=1 local b=2` -> `local a,b=1,2`. Only fires when both sides are
// either fully saturated (exactly one init value for the one name) or both
// bare declarations (no init) -- any other shape (e.g. `local a=f(),g()`,
// which discards g()'s value but still calls it) would shift which value
// lands on which name once concatenated, silently changing behavior.
//
// Also refuses to merge when the second statement's init expression
// references the first statement's just-declared symbol: in the merged
// form `local a,b=1,a+1`, `a` on the right resolves to whatever was in
// scope BEFORE this statement (real Lua semantics -- new locals aren't
// visible in their own declaration's init list), not the `a=1` just
// declared, which is exactly the meaning the unmerged code had. Checked by
// symbolId (assigned during resolution on the original, unmerged tree), so
// it reflects true scoping regardless of shadowing.
//
// A subtle miscategorization here would still be caught before shipping --
// compress-aggressive.ts re-parses and re-resolves the printed output and
// rejects anything not alpha-equivalent to the pre-print tree.
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
  return !exprReferencesSymbol(b.init[0], id);
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

// === does `expr` (or anything reachable from it) read symbolId `id`? ===

function exprReferencesSymbol(expr: Expr, id: number): boolean {
  const visit = (e: Expr) => exprReferencesSymbol(e, id);
  switch (expr.type) {
    case "NilExpr":
    case "TrueExpr":
    case "FalseExpr":
    case "VarargExpr":
    case "NumberExpr":
    case "StringExpr":
      return false;
    case "Identifier":
      return expr.symbolId === id;
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
      return blockReferencesSymbol(expr.body, id);
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

function blockReferencesSymbol(stats: Stat[], id: number): boolean {
  return stats.some((stat) => statReferencesSymbol(stat, id));
}

function statReferencesSymbol(stat: Stat, id: number): boolean {
  const visit = (e: Expr) => exprReferencesSymbol(e, id);
  switch (stat.type) {
    case "LocalStat":
      return stat.init.some(visit);
    case "LocalFunctionStat":
      return blockReferencesSymbol(stat.func.body, id);
    case "FunctionDeclStat":
      return visit(stat.target.base) || blockReferencesSymbol(stat.func.body, id);
    case "AssignStat":
      return stat.targets.some(visit) || stat.values.some(visit);
    case "CompoundAssignStat":
      return visit(stat.target) || visit(stat.value);
    case "CallStat":
      return visit(stat.call);
    case "DoStat":
      return blockReferencesSymbol(stat.body, id);
    case "WhileStat":
      return visit(stat.cond) || blockReferencesSymbol(stat.body, id);
    case "RepeatStat":
      return blockReferencesSymbol(stat.body, id) || visit(stat.cond);
    case "IfStat":
      return (
        stat.clauses.some((c) => visit(c.cond) || blockReferencesSymbol(c.body, id)) ||
        (stat.elseBody !== undefined && blockReferencesSymbol(stat.elseBody, id))
      );
    case "NumericForStat":
      return (
        visit(stat.start) ||
        visit(stat.stop) ||
        (stat.step !== undefined && visit(stat.step)) ||
        blockReferencesSymbol(stat.body, id)
      );
    case "GenericForStat":
      return stat.exprs.some(visit) || blockReferencesSymbol(stat.body, id);
    case "ReturnStat":
      return stat.args.some(visit);
    default:
      return false;
  }
}
