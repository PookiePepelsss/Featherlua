import type { AssignStat, Expr, Stat } from "./ast";
import type { ResolvedProgram } from "./scope-resolver";
import { isCallExpr, someExpr } from "./ast-search";

// `a=1 b=2` -> `a,b=1,2`. Only bare Identifier targets by default (never
// `t[k]=`, whose index expression would need its own evaluation-order
// analysis), and neither value may contain a call -- a call's side effect
// could legitimately depend on running between the two original stores.
// Two more guards: Lua evaluates every value in a multi-assignment before
// any store happens, so `a=1 b=a+1` (b reads a's NEW value) would silently
// become `a,b=1,a+1` reading the OLD value -- refused whenever the second
// value reads the first target's binding. And `a=1 a=2` assigning the
// same binding twice in one merged statement is explicitly undefined in
// Lua, so same-binding targets are refused too. Any miscategorization
// still fails closed via compress-aggressive.ts's output re-validation.
//
// `includeMemberTargets` (off by default, EXPERIMENTAL) additionally
// allows `t.x=1 t.y=2` -> `t.x,t.y=1,2` for a plain-Identifier-based
// field (`t.x`, never `t[k]` or `f().x`). This rests on an assumption the
// self-validation backstop CANNOT catch, unlike every other pass here:
// assigning to a table field can invoke a custom `__newindex`, and
// merging changes the relative order two such handlers would fire in --
// a real behavior difference invisible to a structural re-parse check,
// which only confirms the output *parses* to an equivalent shape, not
// that it *runs* the same. Table proxies/readonly wrappers using
// `__newindex` are common enough in real Luau OOP code that this stays
// opt-in.
export function mergeAdjacentAssigns(resolved: ResolvedProgram, includeMemberTargets: boolean): boolean {
  let changed = false;
  resolved.chunk.body = mergeBlock(resolved.chunk.body, includeMemberTargets, () => {
    changed = true;
  });
  return changed;
}

function isMergeableTarget(stat: AssignStat, includeMemberTargets: boolean): boolean {
  if (stat.targets.length !== 1) return false;
  const target = stat.targets[0];
  if (target.type === "Identifier") return true;
  return includeMemberTargets && target.type === "MemberExpr" && target.object.type === "Identifier";
}

// A comparable identity for an assignment target or a read of the same
// shape (`Identifier` or plain `base.field` `MemberExpr`) -- undefined
// for anything else (globals with no symbolId still get a name-based key
// so two different-scope locals that happen to share a name never
// collide with a global of the same name).
function targetIdentity(expr: Expr): string | undefined {
  if (expr.type === "Identifier") {
    if (expr.symbolId !== undefined) return `s${expr.symbolId}`;
    return expr.isGlobal === true ? `g:${expr.name}` : undefined;
  }
  if (expr.type === "MemberExpr") {
    const baseId = targetIdentity(expr.object);
    return baseId !== undefined ? `${baseId}.${expr.name}` : undefined;
  }
  return undefined;
}

function sameBinding(a: AssignStat, b: AssignStat): boolean {
  const ia = targetIdentity(a.targets[0]);
  const ib = targetIdentity(b.targets[0]);
  return ia !== undefined && ia === ib;
}

function referencesTarget(expr: Expr, target: Expr): boolean {
  const targetId = targetIdentity(target);
  if (targetId === undefined) return false;
  return someExpr(expr, (e) => targetIdentity(e) === targetId);
}

function canMerge(a: Stat, b: Stat, includeMemberTargets: boolean): a is AssignStat {
  if (a.type !== "AssignStat" || b.type !== "AssignStat") return false;
  if (!isMergeableTarget(a, includeMemberTargets) || !isMergeableTarget(b, includeMemberTargets)) return false;
  if (a.values.length !== 1 || b.values.length !== 1) return false;
  if (someExpr(a.values[0], isCallExpr) || someExpr(b.values[0], isCallExpr)) return false;
  if (sameBinding(a, b)) return false;
  return !referencesTarget(b.values[0], a.targets[0]);
}

function mergeBlock(stats: Stat[], includeMemberTargets: boolean, onChange: () => void): Stat[] {
  const processed = stats.map((s) => mergeInStat(s, includeMemberTargets, onChange));
  const out: Stat[] = [];
  for (const stat of processed) {
    const prev = out[out.length - 1];
    if (prev && canMerge(prev, stat, includeMemberTargets)) {
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

function mergeInStat(stat: Stat, includeMemberTargets: boolean, onChange: () => void): Stat {
  const visit = (e: Expr) => mergeInExpr(e, includeMemberTargets, onChange);
  const block = (b: Stat[]) => mergeBlock(b, includeMemberTargets, onChange);
  switch (stat.type) {
    case "LocalStat":
      stat.init.forEach(visit);
      return stat;
    case "LocalFunctionStat":
      stat.func.body = block(stat.func.body);
      return stat;
    case "FunctionDeclStat":
      visit(stat.target.base);
      stat.func.body = block(stat.func.body);
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
      stat.body = block(stat.body);
      return stat;
    case "WhileStat":
      visit(stat.cond);
      stat.body = block(stat.body);
      return stat;
    case "RepeatStat":
      stat.body = block(stat.body);
      visit(stat.cond);
      return stat;
    case "IfStat":
      for (const clause of stat.clauses) {
        visit(clause.cond);
        clause.body = block(clause.body);
      }
      if (stat.elseBody) stat.elseBody = block(stat.elseBody);
      return stat;
    case "NumericForStat":
      visit(stat.start);
      visit(stat.stop);
      if (stat.step) visit(stat.step);
      stat.body = block(stat.body);
      return stat;
    case "GenericForStat":
      stat.exprs.forEach(visit);
      stat.body = block(stat.body);
      return stat;
    case "ReturnStat":
      stat.args.forEach(visit);
      return stat;
    default:
      return stat;
  }
}

function mergeInExpr(expr: Expr, includeMemberTargets: boolean, onChange: () => void): void {
  const visit = (e: Expr) => mergeInExpr(e, includeMemberTargets, onChange);
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
      expr.body = mergeBlock(expr.body, includeMemberTargets, onChange);
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
