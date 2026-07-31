import type { AssignStat, Expr, Stat } from "./ast";
import type { ResolvedProgram } from "./scope-resolver";
import { isCallExpr, someExpr } from "./ast-search";

// `a=1 b=2` -> `a,b=1,2`. Only bare Identifier targets (never `t[k]=`, whose
// index expression would need its own evaluation-order analysis), and
// neither value may contain a call -- a call's side effect could
// legitimately depend on running between the two original stores. Two more
// guards: Lua evaluates every value in a multi-assignment before any store
// happens, so `a=1 b=a+1` (b reads a's NEW value) would silently become
// `a,b=1,a+1` reading the OLD value -- refused whenever the second value
// references the first target's binding. And `a=1 a=2` assigning the same
// binding twice in one merged statement is explicitly undefined in Lua, so
// same-binding targets are refused too. Any miscategorization still fails
// closed via compress-aggressive.ts's output re-validation.
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

function referencesTarget(expr: Expr, target: AssignStat["targets"][0]): boolean {
  if (target.type !== "Identifier") return false;
  return someExpr(expr, (e) => {
    if (e.type !== "Identifier") return false;
    if (target.symbolId !== undefined) return e.symbolId === target.symbolId;
    return e.isGlobal === true && target.isGlobal === true && e.name === target.name;
  });
}

function canMerge(a: Stat, b: Stat): a is AssignStat {
  if (a.type !== "AssignStat" || b.type !== "AssignStat") return false;
  if (!isPlainIdentifierTarget(a) || !isPlainIdentifierTarget(b)) return false;
  if (a.values.length !== 1 || b.values.length !== 1) return false;
  if (someExpr(a.values[0], isCallExpr) || someExpr(b.values[0], isCallExpr)) return false;
  if (sameBinding(a, b)) return false;
  return !referencesTarget(b.values[0], a.targets[0]);
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
