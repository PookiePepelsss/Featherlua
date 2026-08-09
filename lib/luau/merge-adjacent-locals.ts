import type { Expr, LocalStat, Stat } from "./ast";
import type { ResolvedProgram } from "./scope-resolver";
import { someExpr } from "./ast-search";
import { isDefinitelyInert } from "./effect-analysis";
import { functionLocalCount, SYNTHESIZED_LOCAL_CEILING } from "./alias-globals";

export function mergeAdjacentLocals(resolved: ResolvedProgram): boolean {
  let changed = false;
  resolved.chunk.body = mergeBlock(resolved.chunk.body, () => {
    changed = true;
  }, 0);
  return changed;
}

function saturationKind(stat: LocalStat): "bare" | "saturated" | "neither" {
  if (stat.init.length === 0) return "bare";
  return stat.init.length === stat.names.length ? "saturated" : "neither";
}

function canMerge(a: LocalStat, b: LocalStat): boolean {
  if ([...a.names, ...b.names].some((name) => name.attrib === "close")) return false;
  const aKind = saturationKind(a);
  if (aKind === "neither" || aKind !== saturationKind(b)) return false;
  if (aKind === "bare") return true;
  if (!b.init.every(isDefinitelyInert)) return false;
  const aIds = a.names.map((n) => n.symbolId);
  if (aIds.some((id) => id === undefined)) return false;
  return !b.init.some((init) => someExpr(init, (e) => e.type === "Identifier" && aIds.includes(e.symbolId)));
}

// `local a=1 local b=2` and `local a,b=1,2` bind the same two names, but
// the merged form evaluates every value before assigning any of them, so it
// needs a temporary register per name at once where the separate statements
// needed one at a time. Luau draws locals and temporaries from the same
// pool of 200, so a long run merged into one declaration is what pushes a
// crowded function over.
//
// `outerLive` is how many locals of the same function are already bound
// where this block starts. Measuring only the block's own locals was the
// hole: a short block nested inside a function holding a hundred and fifty
// of them looked to have room it did not have, and a real script in the
// corpus stopped compiling because of it. Function bodies start a fresh
// pool, so they pass zero.
function mergeBlock(stats: Stat[], onChange: () => void, outerLive: number): Stat[] {
  const processed: Stat[] = [];
  let live = outerLive;
  for (const stat of stats) {
    processed.push(mergeInStat(stat, onChange, live));
    if (stat.type === "LocalStat") live += stat.names.length;
    else if (stat.type === "LocalFunctionStat") live += 1;
  }

  // How many names one declaration may hold before its temporaries would
  // not fit. At one or below nothing merges at all.
  const headroom = SYNTHESIZED_LOCAL_CEILING - outerLive - functionLocalCount(processed);
  const out: Stat[] = [];
  for (const stat of processed) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.type === "LocalStat" &&
      stat.type === "LocalStat" &&
      prev.names.length + stat.names.length <= headroom &&
      canMerge(prev, stat)
    ) {
      prev.names = prev.names.concat(stat.names);
      prev.init = prev.init.concat(stat.init);
      onChange();
      continue;
    }
    out.push(stat);
  }
  return out;
}

function mergeInStat(stat: Stat, onChange: () => void, outerLive: number): Stat {
  const visit = (e: Expr) => mergeInExpr(e, onChange);
  const nested = (body: Stat[]) => mergeBlock(body, onChange, outerLive);
  switch (stat.type) {
    case "LocalStat":
      stat.init.forEach(visit);
      return stat;
    case "LocalFunctionStat":
      stat.func.body = mergeBlock(stat.func.body, onChange, 0);
      return stat;
    case "FunctionDeclStat":
      visit(stat.target.base);
      stat.func.body = mergeBlock(stat.func.body, onChange, 0);
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
      stat.body = nested(stat.body);
      return stat;
    case "WhileStat":
      visit(stat.cond);
      stat.body = nested(stat.body);
      return stat;
    case "RepeatStat":
      stat.body = nested(stat.body);
      visit(stat.cond);
      return stat;
    case "IfStat":
      for (const clause of stat.clauses) {
        visit(clause.cond);
        clause.body = nested(clause.body);
      }
      if (stat.elseBody) stat.elseBody = nested(stat.elseBody);
      return stat;
    case "NumericForStat":
      visit(stat.start);
      visit(stat.stop);
      if (stat.step) visit(stat.step);
      stat.body = nested(stat.body);
      return stat;
    case "GenericForStat":
      stat.exprs.forEach(visit);
      stat.body = nested(stat.body);
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
      expr.body = mergeBlock(expr.body, onChange, 0);
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
