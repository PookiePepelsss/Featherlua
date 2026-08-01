import type { Expr, Stat } from "./ast";
import type { ResolvedProgram } from "./scope-resolver";
import { isRemovableInitializer } from "./effect-analysis";

// Removes `local` declarations (and unused `local function` definitions)
// referenced nowhere, when the initializer can't possibly error or have a
// side effect. Separate from constant-propagate.ts's dead-declaration
// cleanup, which only drops what it actually inlined somewhere -- this
// drops anything simply never used, propagatable or not.
//
// Removable initializers are deliberately narrower than merely looking
// side-effect-free: literals, resolved local reads, function definitions,
// and tables whose values and computed keys are themselves proven safe.
// Global reads, indexing, operators, calls, and invalid computed keys can
// invoke metamethods or throw, so they remain even when the local is unused.
//
// Only single-name, at-most-single-init locals qualify (`local x = f(),
// g()` still calls g() for its side effect even though only f()'s result
// is kept), matching the same conservative scope used elsewhere.
export function removeUnusedLocals(resolved: ResolvedProgram): boolean {
  const refCounts = new Map<number, number>();
  countReferences(resolved.chunk.body, refCounts);

  let changed = false;
  resolved.chunk.body = stripUnused(resolved.chunk.body, refCounts, () => {
    changed = true;
  });
  return changed;
}

// === pass 1: count every Identifier reference by symbolId, everywhere ===

function countReferences(stats: Stat[], counts: Map<number, number>) {
  for (const stat of stats) countStat(stat, counts);
}

function bump(id: number | undefined, counts: Map<number, number>) {
  if (id === undefined) return;
  counts.set(id, (counts.get(id) ?? 0) + 1);
}

function countStat(stat: Stat, counts: Map<number, number>) {
  const visit = (e: Expr) => countExpr(e, counts);
  switch (stat.type) {
    case "LocalStat":
      stat.init.forEach(visit);
      return;
    case "LocalFunctionStat":
      countReferences(stat.func.body, counts);
      return;
    case "FunctionDeclStat":
      visit(stat.target.base);
      countReferences(stat.func.body, counts);
      return;
    case "AssignStat":
      stat.targets.forEach(visit);
      stat.values.forEach(visit);
      return;
    case "CompoundAssignStat":
      visit(stat.target);
      visit(stat.value);
      return;
    case "CallStat":
      visit(stat.call);
      return;
    case "DoStat":
      countReferences(stat.body, counts);
      return;
    case "WhileStat":
      visit(stat.cond);
      countReferences(stat.body, counts);
      return;
    case "RepeatStat":
      countReferences(stat.body, counts);
      visit(stat.cond);
      return;
    case "IfStat":
      for (const clause of stat.clauses) {
        visit(clause.cond);
        countReferences(clause.body, counts);
      }
      if (stat.elseBody) countReferences(stat.elseBody, counts);
      return;
    case "NumericForStat":
      visit(stat.start);
      visit(stat.stop);
      if (stat.step) visit(stat.step);
      countReferences(stat.body, counts);
      return;
    case "GenericForStat":
      stat.exprs.forEach(visit);
      countReferences(stat.body, counts);
      return;
    case "ReturnStat":
      stat.args.forEach(visit);
      return;
    default:
      return;
  }
}

function countExpr(expr: Expr, counts: Map<number, number>) {
  const visit = (e: Expr) => countExpr(e, counts);
  switch (expr.type) {
    case "NilExpr":
    case "TrueExpr":
    case "FalseExpr":
    case "VarargExpr":
    case "NumberExpr":
    case "StringExpr":
      return;
    case "Identifier":
      bump(expr.symbolId, counts);
      return;
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
      countReferences(expr.body, counts);
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
  }
}

// === pass 2: drop declarations with zero references and a pure initializer ===

function stripUnused(stats: Stat[], counts: Map<number, number>, onChange: () => void): Stat[] {
  const kept: Stat[] = [];
  for (const stat of stats) {
    if (isUnusedLocal(stat, counts) || isUnusedLocalFunction(stat, counts)) {
      onChange();
      continue;
    }
    stripUnusedInStat(stat, counts, onChange);
    kept.push(stat);
  }
  return kept;
}

function isUnused(symbolId: number | undefined, counts: Map<number, number>): boolean {
  return symbolId !== undefined && (counts.get(symbolId) ?? 0) === 0;
}

function isUnusedLocal(stat: Stat, counts: Map<number, number>): boolean {
  if (stat.type !== "LocalStat" || stat.names.length !== 1 || stat.init.length > 1) return false;
  // A <close> local's scope-exit is what triggers Luau's `__close`
  // handling -- a real runtime side effect, even when the variable is
  // never read. Never remove it, matching constant-propagate.ts's same
  // exclusion.
  if (stat.names[0].attrib === "close") return false;
  if (!isUnused(stat.names[0].symbolId, counts)) return false;
  return stat.init.length === 0 || isRemovableInitializer(stat.init[0]);
}

function isUnusedLocalFunction(stat: Stat, counts: Map<number, number>): boolean {
  return stat.type === "LocalFunctionStat" && isUnused(stat.symbolId, counts);
}

// Recurses into every FunctionExpr body reachable from this statement,
// including ones nested in expression position (`local f = function()
// local dead = 1 end`), not just the statement-level forms.
function stripUnusedInStat(stat: Stat, counts: Map<number, number>, onChange: () => void) {
  const visit = (e: Expr) => stripUnusedInExpr(e, counts, onChange);
  switch (stat.type) {
    case "LocalStat":
      stat.init.forEach(visit);
      return;
    case "LocalFunctionStat":
    case "FunctionDeclStat":
      stat.func.body = stripUnused(stat.func.body, counts, onChange);
      return;
    case "AssignStat":
      stat.targets.forEach(visit);
      stat.values.forEach(visit);
      return;
    case "CompoundAssignStat":
      visit(stat.target);
      visit(stat.value);
      return;
    case "CallStat":
      visit(stat.call);
      return;
    case "DoStat":
      stat.body = stripUnused(stat.body, counts, onChange);
      return;
    case "WhileStat":
      visit(stat.cond);
      stat.body = stripUnused(stat.body, counts, onChange);
      return;
    case "RepeatStat":
      stat.body = stripUnused(stat.body, counts, onChange);
      visit(stat.cond);
      return;
    case "IfStat":
      for (const clause of stat.clauses) {
        visit(clause.cond);
        clause.body = stripUnused(clause.body, counts, onChange);
      }
      if (stat.elseBody) stat.elseBody = stripUnused(stat.elseBody, counts, onChange);
      return;
    case "NumericForStat":
      visit(stat.start);
      visit(stat.stop);
      if (stat.step) visit(stat.step);
      stat.body = stripUnused(stat.body, counts, onChange);
      return;
    case "GenericForStat":
      stat.exprs.forEach(visit);
      stat.body = stripUnused(stat.body, counts, onChange);
      return;
    case "ReturnStat":
      stat.args.forEach(visit);
      return;
    default:
      return;
  }
}

function stripUnusedInExpr(expr: Expr, counts: Map<number, number>, onChange: () => void) {
  const visit = (e: Expr) => stripUnusedInExpr(e, counts, onChange);
  switch (expr.type) {
    case "NilExpr":
    case "TrueExpr":
    case "FalseExpr":
    case "VarargExpr":
    case "NumberExpr":
    case "StringExpr":
    case "Identifier":
      return;
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
      expr.body = stripUnused(expr.body, counts, onChange);
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
  }
}
