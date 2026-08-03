import type { Chunk, Expr, Stat } from "./ast";
import { collectNames } from "./ast-search";
import { LOCAL_REGISTER_LIMIT } from "./alias-globals";

// Names already bound or read anywhere in the chunk. A synthesized local
// that reuses one of them would be shadowed by the user's own declaration
// (or shadow a global they read), silently rebinding every site this pass
// rewrote, so every hoist name is checked against this set.
let takenNames = new Set<string>();
let renameWillRun = false;

export function hoistRepeatedStrings(chunk: Chunk, willRename: boolean): boolean {
  takenNames = collectNames(chunk.body);
  renameWillRun = willRename;
  const changedRef = { value: false };
  chunk.body = processScope(chunk.body, changedRef);
  return changedRef.value;
}

// `local ` plus `=`. The name itself is counted separately because its
// length depends on whether the renamer runs afterwards.
const DECL_OVERHEAD = 7;

// With renaming on, a hoisted local ends up in the renamer's `a`..`zz`
// pool, so budget 2 characters rather than the 7 of `__strNN`. Assuming 7
// unconditionally made the pass reject hoists that were in fact a clear
// win once the name shrank.
function assumedNameLength(willRename: boolean) {
  return willRename ? 2 : 7;
}

// `f"str"` needs no parentheses, but `f(name)` does, so every occurrence
// that was the sole argument of a call costs two extra characters once it
// becomes an identifier. Ignoring that made the pass hoist strings whose
// call sites were cheaper left alone.
const CALL_SUGAR_PENALTY = 2;

export function stringLocalIsWorthKeeping(
  raw: string,
  count: number,
  willRename: boolean,
  sugarCount = 0,
): boolean {
  if (count < 3) return false;
  const nameLength = assumedNameLength(willRename);
  const originalCost = count * raw.length;
  const newCost =
    count * nameLength +
    sugarCount * CALL_SUGAR_PENALTY +
    (DECL_OVERHEAD + nameLength + raw.length);
  return newCost < originalCost;
}

let stringHoistCounter = 0;

export function resetStringHoistCounter(): void {
  stringHoistCounter = 0;
}

function nextHoistName(): string {
  for (;;) {
    stringHoistCounter += 1;
    const candidate = `__str${stringHoistCounter}`;
    if (!takenNames.has(candidate)) {
      takenNames.add(candidate);
      return candidate;
    }
  }
}

interface StringUse {
  total: number;
  // Occurrences written as `f"str"`, which regain parentheses when hoisted.
  sugar: number;
}

function processScope(stats: Stat[], changedRef: { value: boolean }): Stat[] {
  const counts = new Map<string, StringUse>();
  const templatesByRaw = new Map<string, Expr>();
  countBlock(stats, counts, templatesByRaw, changedRef);

  // Luau allocates one register per local per function and caps it at 200.
  // Synthesized declarations have to fit in what this scope has not already
  // spent, or the output stops compiling on exactly the large scripts the
  // pass is meant to help.
  let budget = LOCAL_REGISTER_LIMIT - countLocals(stats);
  const hoistNames = new Map<string, string>();
  for (const [raw, use] of counts) {
    if (budget <= 0) break;
    if (!stringLocalIsWorthKeeping(raw, use.total, renameWillRun, use.sugar)) continue;
    hoistNames.set(raw, nextHoistName());
    budget -= 1;
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

function countLocals(stats: Stat[]): number {
  let used = 0;
  for (const stat of stats) {
    if (stat.type === "LocalStat") used += stat.names.length;
    else if (stat.type === "LocalFunctionStat") used += 1;
  }
  return used;
}

function countBlock(
  stats: Stat[],
  counts: Map<string, StringUse>,
  templates: Map<string, Expr>,
  changedRef: { value: boolean },
) {
  for (const stat of stats) countStat(stat, counts, templates, changedRef);
}

function bump(expr: Expr, counts: Map<string, StringUse>, templates: Map<string, Expr>, sugar = false) {
  if (expr.type !== "StringExpr") return;
  const use = counts.get(expr.raw) ?? { total: 0, sugar: 0 };
  use.total += 1;
  if (sugar) use.sugar += 1;
  counts.set(expr.raw, use);
  if (!templates.has(expr.raw)) templates.set(expr.raw, expr);
}

function countStat(
  stat: Stat,
  counts: Map<string, StringUse>,
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

// A single string argument is printed without parentheses, so it is the one
// position where replacing the literal with a name costs more than the name.
function visitArgs(
  args: Expr[],
  counts: Map<string, StringUse>,
  templates: Map<string, Expr>,
  changedRef: { value: boolean },
) {
  if (args.length === 1 && args[0].type === "StringExpr") {
    bump(args[0], counts, templates, true);
    return;
  }
  for (const arg of args) countExpr(arg, counts, templates, changedRef);
}

function countExpr(
  expr: Expr,
  counts: Map<string, StringUse>,
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
      visitArgs(expr.args, counts, templates, changedRef);
      return;
    case "MethodCallExpr":
      visit(expr.object);
      visitArgs(expr.args, counts, templates, changedRef);
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
