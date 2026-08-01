import type { Chunk, Expr, Stat } from "./ast";
import { collectUnsafeBaseNames } from "./hoist-repeated-access";

export function aliasRepeatedGlobalCalls(chunk: Chunk, willRename: boolean): boolean {
  const unsafeNames = collectUnsafeBaseNames(chunk);
  const changedRef = { value: false };
  chunk.body = processScope(chunk.body, unsafeNames, willRename, changedRef);
  return changedRef.value;
}

const DECL_OVERHEAD = 7;

function worthAliasing(name: string, count: number, willRename: boolean): boolean {
  if (count < 3) return false;
  const assumedNameLength = willRename ? 1 : `__fn${aliasCounter + 1}`.length;
  const originalCost = count * name.length;
  const newCost = count * assumedNameLength + (DECL_OVERHEAD + assumedNameLength + name.length);
  return newCost < originalCost;
}

let aliasCounter = 0;

export function resetAliasCounter(): void {
  aliasCounter = 0;
}

function processScope(
  stats: Stat[],
  unsafeNames: Set<string>,
  willRename: boolean,
  changedRef: { value: boolean },
): Stat[] {
  const counts = new Map<string, number>();
  countBlock(stats, unsafeNames, willRename, counts, changedRef);

  const aliasNames = new Map<string, string>();
  for (const [name, count] of counts) {
    if (!worthAliasing(name, count, willRename)) continue;
    aliasCounter += 1;
    aliasNames.set(name, `__fn${aliasCounter}`);
  }
  if (aliasNames.size === 0) return stats;

  replaceBlock(stats, aliasNames);
  changedRef.value = true;

  const newLocals: Stat[] = [];
  for (const [globalName, alias] of aliasNames) {
    newLocals.push({
      type: "LocalStat",
      names: [{ name: alias, synthetic: true }],
      init: [{ type: "Identifier", name: globalName }],
    });
  }
  return [...newLocals, ...stats];
}

function isAliasCandidateCallee(expr: Expr, unsafeNames: Set<string>): string | undefined {
  if (expr.type !== "Identifier") return undefined;
  return unsafeNames.has(expr.name) ? undefined : expr.name;
}

function countBlock(
  stats: Stat[],
  unsafeNames: Set<string>,
  willRename: boolean,
  counts: Map<string, number>,
  changedRef: { value: boolean },
) {
  for (const stat of stats) countStat(stat, unsafeNames, willRename, counts, changedRef);
}

function bump(name: string | undefined, counts: Map<string, number>) {
  if (name === undefined) return;
  counts.set(name, (counts.get(name) ?? 0) + 1);
}

function countStat(
  stat: Stat,
  unsafeNames: Set<string>,
  willRename: boolean,
  counts: Map<string, number>,
  changedRef: { value: boolean },
) {
  const visit = (e: Expr) => countExpr(e, unsafeNames, willRename, counts, changedRef);
  const block = (b: Stat[]) => countBlock(b, unsafeNames, willRename, counts, changedRef);
  switch (stat.type) {
    case "LocalStat":
      stat.init.forEach(visit);
      return;
    case "LocalFunctionStat":
      stat.func.body = processScope(stat.func.body, unsafeNames, willRename, changedRef);
      return;
    case "FunctionDeclStat":
      visit(stat.target.base);
      stat.func.body = processScope(stat.func.body, unsafeNames, willRename, changedRef);
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
      block(stat.body);
      return;
    case "WhileStat":
      visit(stat.cond);
      block(stat.body);
      return;
    case "RepeatStat":
      block(stat.body);
      visit(stat.cond);
      return;
    case "IfStat":
      for (const clause of stat.clauses) {
        visit(clause.cond);
        block(clause.body);
      }
      if (stat.elseBody) block(stat.elseBody);
      return;
    case "NumericForStat":
      visit(stat.start);
      visit(stat.stop);
      if (stat.step) visit(stat.step);
      block(stat.body);
      return;
    case "GenericForStat":
      stat.exprs.forEach(visit);
      block(stat.body);
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
  unsafeNames: Set<string>,
  willRename: boolean,
  counts: Map<string, number>,
  changedRef: { value: boolean },
) {
  const visit = (e: Expr) => countExpr(e, unsafeNames, willRename, counts, changedRef);
  switch (expr.type) {
    case "CallExpr": {
      const name = isAliasCandidateCallee(expr.callee, unsafeNames);
      bump(name, counts);
      if (name === undefined) visit(expr.callee);
      expr.args.forEach(visit);
      return;
    }
    case "MethodCallExpr":
      visit(expr.object);
      expr.args.forEach(visit);
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
    case "FunctionExpr":
      expr.body = processScope(expr.body, unsafeNames, willRename, changedRef);
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

// === pass 2: replace aliased call callees, staying within this scope
// (nested function bodies were already independently handled) ===

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
  switch (expr.type) {
    case "CallExpr": {
      const alias = expr.callee.type === "Identifier" ? names.get(expr.callee.name) : undefined;
      expr.callee = alias ? { type: "Identifier", name: alias } : replaceExpr(expr.callee, names);
      expr.args = expr.args.map((a) => replaceExpr(a, names));
      return expr;
    }
    case "MethodCallExpr":
      expr.object = replaceExpr(expr.object, names);
      expr.args = expr.args.map((a) => replaceExpr(a, names));
      return expr;
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
