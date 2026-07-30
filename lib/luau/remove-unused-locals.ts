import type { Expr, Stat } from "./ast";
import type { ResolvedProgram } from "./scope-resolver";

// Removes `local` declarations (and unused `local function` definitions)
// that are referenced nowhere in the program and whose initializer can't
// possibly have a side effect or throw. This is a separate, more general
// pass from constant-propagate.ts's dead-declaration cleanup: propagation
// only drops a declaration it actually inlined somewhere; this drops one
// that was simply never used at all, regardless of whether its value
// would have been propagatable.
//
// "Side-effect-free" is deliberately conservative -- broader than just
// scalar literals, but still excludes anything that could observably do
// something or error when evaluated:
// - literals, identifier reads, function *definitions* (not calls -- the
//   body doesn't execute until called), and table constructors built
//   entirely from pure fields are allowed.
// - arithmetic/comparison/concat and calls are excluded: Lua operators can
//   throw at runtime on incompatible operand types (`1 < {}`, `1 + "x"`),
//   and a call can do anything -- removing an unused-but-erroring or
//   unused-but-side-effecting expression would silently change behavior
//   (a program that used to error, or print, now does neither).
//
// Only single-name, at-most-single-init `local` statements are candidates
// (`local x = f(), g()` still calls g() for its side effect even though
// only f()'s result is kept -- dropping the whole statement would drop
// that call too), matching the conservative scope used elsewhere in this
// codebase (constant-propagate.ts, dead-branch elimination in optimize.ts).
export function removeUnusedLocals(resolved: ResolvedProgram): boolean {
  const refCounts = new Map<number, number>();
  countReferences(resolved.chunk.body, refCounts);

  let changed = false;
  resolved.chunk.body = stripUnused(resolved.chunk.body, refCounts, () => {
    changed = true;
  });
  return changed;
}

function isPureExpr(expr: Expr): boolean {
  switch (expr.type) {
    case "NilExpr":
    case "TrueExpr":
    case "FalseExpr":
    case "NumberExpr":
    case "StringExpr":
    case "Identifier":
    case "FunctionExpr": // defining a closure is pure; its body doesn't run until called
      return true;
    case "TableExpr":
      return expr.fields.every((f) => (f.kind !== "computed" || isPureExpr(f.key)) && isPureExpr(f.value));
    case "ParenExpr":
      return isPureExpr(expr.expr);
    default:
      return false;
  }
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
  return stat.init.length === 0 || isPureExpr(stat.init[0]);
}

function isUnusedLocalFunction(stat: Stat, counts: Map<number, number>): boolean {
  return stat.type === "LocalFunctionStat" && isUnused(stat.symbolId, counts);
}

// Recurses into every FunctionExpr body reachable from this statement --
// both the statement-level forms (LocalFunctionStat/FunctionDeclStat) and
// any FunctionExpr nested inside an expression position (a value in a
// LocalStat/AssignStat, a call argument, a table field, ...), which is
// where an unused local inside an assigned-but-not-declared closure
// (`local f = function() local dead = 1 end`) would otherwise be missed.
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
