import type { AssignStat, Expr, Stat } from "./ast";
import type { ResolvedProgram } from "./scope-resolver";

// Merges two adjacent single-target plain-assignment statements into one:
// `a=1 b=2` -> `a,b=1,2`. Deliberately narrow: only fires when both
// targets are bare Identifiers (never `t[k]=`/`t.k=`, whose index/base
// expressions would need their own evaluation-order analysis) and neither
// value expression contains a call.
//
// Two distinct semantic traps this guards against:
//  1. Lua evaluates ALL values in a multi-assignment before performing ANY
//     store. `a=1 b=a+1` sequentially: a is stored as 1, THEN `a+1` reads
//     the NEW a (=2). Merged `a,b=1,a+1` would read the OLD a instead.
//     Guarded by refusing to merge when the second value references the
//     first target's binding (by symbolId for locals, by name for the
//     same global).
//  2. `a=1 a=2` (re-assigning the same binding) has a well-defined
//     "last one wins" result sequentially; `a,a=1,2` assigns the same
//     target twice in one statement, whose result Lua explicitly leaves
//     undefined between conflicting duplicate targets. Guarded by
//     refusing to merge when both targets denote the same binding.
//
// Calls are excluded entirely because a call's side effect could
// legitimately depend on running between the two original stores (e.g.
// mutating whatever the second target's evaluation would read) --
// something that isn't the case for the plain-identifier-target,
// call-free shape this pass restricts itself to. As with every other
// pass, compress-aggressive.ts re-parses and re-resolves the output and
// rejects anything not alpha-equivalent to the pre-print tree, so a
// misjudged merge here fails closed rather than shipping wrong code.
export function mergeAdjacentAssigns(resolved: ResolvedProgram): boolean {
  let changed = false;
  resolved.chunk.body = mergeBlock(resolved.chunk.body, () => {
    changed = true;
  });
  return changed;
}

function isPlainIdentifierTarget(stat: AssignStat): boolean {
  return stat.targets.length === 1 && stat.targets[0].type === "Identifier";
}

function sameBinding(a: AssignStat, b: AssignStat): boolean {
  const ta = a.targets[0];
  const tb = b.targets[0];
  if (ta.type !== "Identifier" || tb.type !== "Identifier") return false;
  if (ta.symbolId !== undefined || tb.symbolId !== undefined) return ta.symbolId === tb.symbolId;
  return ta.isGlobal === true && tb.isGlobal === true && ta.name === tb.name;
}

function containsCall(expr: Expr): boolean {
  const visit = (e: Expr) => containsCall(e);
  switch (expr.type) {
    case "CallExpr":
    case "MethodCallExpr":
      return true;
    case "InterpolatedStringExpr":
      return expr.parts.some((part) => typeof part !== "string" && visit(part));
    case "IndexExpr":
      return visit(expr.object) || visit(expr.index);
    case "MemberExpr":
      return visit(expr.object);
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
    default:
      return false; // literals, Identifier, FunctionExpr (body doesn't run here)
  }
}

function exprReferencesTarget(expr: Expr, target: AssignStat["targets"][0]): boolean {
  if (target.type !== "Identifier") return false;
  const visit = (e: Expr) => exprReferencesTarget(e, target);
  switch (expr.type) {
    case "Identifier":
      if (target.symbolId !== undefined) return expr.symbolId === target.symbolId;
      return expr.isGlobal === true && expr.name === target.name;
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
    default:
      return false;
  }
}

function canMerge(a: Stat, b: Stat): a is AssignStat {
  if (a.type !== "AssignStat" || b.type !== "AssignStat") return false;
  if (!isPlainIdentifierTarget(a) || !isPlainIdentifierTarget(b)) return false;
  if (a.values.length !== 1 || b.values.length !== 1) return false;
  if (containsCall(a.values[0]) || containsCall(b.values[0])) return false;
  if (sameBinding(a, b)) return false;
  return !exprReferencesTarget(b.values[0], a.targets[0]);
}

function mergeBlock(stats: Stat[], onChange: () => void): Stat[] {
  const processed = stats.map((s) => mergeInStat(s, onChange));
  const out: Stat[] = [];
  for (const stat of processed) {
    const prev = out[out.length - 1];
    if (prev && canMerge(prev, stat)) {
      const b = stat as AssignStat;
      prev.targets = prev.targets.concat(b.targets);
      prev.values = prev.values.concat(b.values);
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
