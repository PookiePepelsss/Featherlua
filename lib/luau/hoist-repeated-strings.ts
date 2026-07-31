import type { Chunk, Expr, Stat } from "./ast";

// A string literal repeated 3+ times within one function's scope gets
// hoisted into a `local` at the top of that scope, on by default: unlike
// hoist-repeated-access.ts, this rests on no unverifiable assumption --
// strings have no identity or metatable a script can intercept, so
// referencing one via a local is behaviorally identical even as a call
// argument (a RemoteEvent payload keeps the same value, just a different
// source expression), and it's cheap to hoist even into a conditionally
// reached branch. Scoped to one function at a time rather than across
// closures, so a hoist and its uses always share the same block family.
export function hoistRepeatedStrings(chunk: Chunk): boolean {
  const changedRef = { value: false };
  chunk.body = processScope(chunk.body, changedRef);
  return changedRef.value;
}

// A conservative stand-in for the eventual local name's length, used to
// decide whether keeping a repeated string as a local is worth it at all.
// Not the real generated name's length (that depends on stringHoistCounter,
// which would make the answer depend on processing order) -- a fixed
// estimate so the same (raw, count) pair always gets the same verdict.
// constant-propagate.ts calls the same function for the same reason: it
// must never propagate away a local this pass would have created, or the
// two passes fight every other compress (see stringLocalIsWorthKeeping's
// own comment for what that looked like in practice).
const ASSUMED_NAME_LENGTH = 7;
const DECL_OVERHEAD = 7; // `local ` + `=`

export function stringLocalIsWorthKeeping(raw: string, count: number): boolean {
  if (count < 3) return false;
  const originalCost = count * raw.length;
  const newCost = count * ASSUMED_NAME_LENGTH + (DECL_OVERHEAD + ASSUMED_NAME_LENGTH + raw.length);
  return newCost < originalCost;
}

let stringHoistCounter = 0;

function processScope(stats: Stat[], changedRef: { value: boolean }): Stat[] {
  const counts = new Map<string, number>();
  const templatesByRaw = new Map<string, Expr>();
  countBlock(stats, counts, templatesByRaw, changedRef);

  const hoistNames = new Map<string, string>();
  for (const [raw, count] of counts) {
    if (!stringLocalIsWorthKeeping(raw, count)) continue;
    stringHoistCounter += 1;
    hoistNames.set(raw, `__str${stringHoistCounter}`);
  }
  if (hoistNames.size === 0) return stats;

  replaceBlock(stats, hoistNames);
  changedRef.value = true;

  const newLocals: Stat[] = [];
  for (const [raw, name] of hoistNames) {
    const init = templatesByRaw.get(raw);
    if (!init) continue;
    newLocals.push({ type: "LocalStat", names: [{ name, synthetic: true }], init: [init] });
  }
  return [...newLocals, ...stats];
}

// === pass 1: count string literals reachable in this scope, stopping at
// (but independently recursing into) nested function-body boundaries ===

function countBlock(
  stats: Stat[],
  counts: Map<string, number>,
  templates: Map<string, Expr>,
  changedRef: { value: boolean },
) {
  for (const stat of stats) countStat(stat, counts, templates, changedRef);
}

function bump(expr: Expr, counts: Map<string, number>, templates: Map<string, Expr>) {
  if (expr.type !== "StringExpr") return;
  counts.set(expr.raw, (counts.get(expr.raw) ?? 0) + 1);
  if (!templates.has(expr.raw)) templates.set(expr.raw, expr);
}

function countStat(
  stat: Stat,
  counts: Map<string, number>,
  templates: Map<string, Expr>,
  changedRef: { value: boolean },
) {
  const visit = (e: Expr) => countExpr(e, counts, templates, changedRef);
  switch (stat.type) {
    case "LocalStat":
      stat.init.forEach(visit);
      return;
    case "LocalFunctionStat":
      stat.func.body = processScope(stat.func.body, changedRef);
      return;
    case "FunctionDeclStat":
      visit(stat.target.base);
      stat.func.body = processScope(stat.func.body, changedRef);
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
      countBlock(stat.body, counts, templates, changedRef);
      return;
    case "WhileStat":
      visit(stat.cond);
      countBlock(stat.body, counts, templates, changedRef);
      return;
    case "RepeatStat":
      countBlock(stat.body, counts, templates, changedRef);
      visit(stat.cond);
      return;
    case "IfStat":
      for (const clause of stat.clauses) {
        visit(clause.cond);
        countBlock(clause.body, counts, templates, changedRef);
      }
      if (stat.elseBody) countBlock(stat.elseBody, counts, templates, changedRef);
      return;
    case "NumericForStat":
      visit(stat.start);
      visit(stat.stop);
      if (stat.step) visit(stat.step);
      countBlock(stat.body, counts, templates, changedRef);
      return;
    case "GenericForStat":
      stat.exprs.forEach(visit);
      countBlock(stat.body, counts, templates, changedRef);
      return;
    case "ReturnStat":
      stat.args.forEach(visit);
      return;
    default:
      return;
  }
}

function countExpr(
  expr: Expr,
  counts: Map<string, number>,
  templates: Map<string, Expr>,
  changedRef: { value: boolean },
) {
  const visit = (e: Expr) => countExpr(e, counts, templates, changedRef);
  switch (expr.type) {
    case "StringExpr":
      bump(expr, counts, templates);
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
      expr.body = processScope(expr.body, changedRef);
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

// === pass 2: replace hoisted string literals with references, staying
// within this scope (nested function bodies were already independently
// handled during counting, so they're skipped here too) ===

function replaceBlock(stats: Stat[], names: Map<string, string>) {
  for (const stat of stats) replaceStat(stat, names);
}

function replaceStat(stat: Stat, names: Map<string, string>) {
  const sub = (e: Expr) => replaceExpr(e, names);
  switch (stat.type) {
    case "LocalStat":
      stat.init = stat.init.map(sub);
      return;
    case "LocalFunctionStat":
    case "FunctionDeclStat":
      return; // already fully handled as its own scope
    case "AssignStat":
      stat.targets = stat.targets.map((t) => sub(t) as typeof t);
      stat.values = stat.values.map(sub);
      return;
    case "CompoundAssignStat":
      stat.target = sub(stat.target) as typeof stat.target;
      stat.value = sub(stat.value);
      return;
    case "CallStat":
      stat.call = sub(stat.call) as typeof stat.call;
      return;
    case "DoStat":
      replaceBlock(stat.body, names);
      return;
    case "WhileStat":
      stat.cond = sub(stat.cond);
      replaceBlock(stat.body, names);
      return;
    case "RepeatStat":
      replaceBlock(stat.body, names);
      stat.cond = sub(stat.cond);
      return;
    case "IfStat":
      for (const clause of stat.clauses) {
        clause.cond = sub(clause.cond);
        replaceBlock(clause.body, names);
      }
      if (stat.elseBody) replaceBlock(stat.elseBody, names);
      return;
    case "NumericForStat":
      stat.start = sub(stat.start);
      stat.stop = sub(stat.stop);
      if (stat.step) stat.step = sub(stat.step);
      replaceBlock(stat.body, names);
      return;
    case "GenericForStat":
      stat.exprs = stat.exprs.map(sub);
      replaceBlock(stat.body, names);
      return;
    case "ReturnStat":
      stat.args = stat.args.map(sub);
      return;
    default:
      return;
  }
}

function replaceExpr(expr: Expr, names: Map<string, string>): Expr {
  if (expr.type === "StringExpr") {
    const name = names.get(expr.raw);
    return name ? { type: "Identifier", name } : expr;
  }
  switch (expr.type) {
    case "InterpolatedStringExpr":
      expr.parts = expr.parts.map((p) => (typeof p === "string" ? p : replaceExpr(p, names)));
      return expr;
    case "IndexExpr":
      expr.object = replaceExpr(expr.object, names);
      expr.index = replaceExpr(expr.index, names);
      return expr;
    case "MemberExpr":
      expr.object = replaceExpr(expr.object, names);
      return expr;
    case "CallExpr":
      expr.callee = replaceExpr(expr.callee, names);
      expr.args = expr.args.map((a) => replaceExpr(a, names));
      return expr;
    case "MethodCallExpr":
      expr.object = replaceExpr(expr.object, names);
      expr.args = expr.args.map((a) => replaceExpr(a, names));
      return expr;
    case "FunctionExpr":
      return expr; // already fully handled as its own scope
    case "TableExpr":
      for (const field of expr.fields) {
        if (field.kind === "computed") field.key = replaceExpr(field.key, names);
        field.value = replaceExpr(field.value, names);
      }
      return expr;
    case "BinaryExpr":
      expr.left = replaceExpr(expr.left, names);
      expr.right = replaceExpr(expr.right, names);
      return expr;
    case "UnaryExpr":
      expr.operand = replaceExpr(expr.operand, names);
      return expr;
    case "TypeAssertionExpr":
      expr.expr = replaceExpr(expr.expr, names);
      return expr;
    case "IfExpr":
      expr.cond = replaceExpr(expr.cond, names);
      expr.thenExpr = replaceExpr(expr.thenExpr, names);
      for (const clause of expr.elseifs) {
        clause.cond = replaceExpr(clause.cond, names);
        clause.expr = replaceExpr(clause.expr, names);
      }
      expr.elseExpr = replaceExpr(expr.elseExpr, names);
      return expr;
    case "ParenExpr":
      expr.expr = replaceExpr(expr.expr, names);
      return expr;
    default:
      return expr;
  }
}
