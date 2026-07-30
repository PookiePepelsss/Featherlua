import type { Expr, Stat } from "./ast";
import type { ResolvedProgram } from "./scope-resolver";

// Substitutes references to a local with its literal value when the local
// is PROVABLY never reassigned anywhere in the program, then removes the
// now-dead declaration. This is the pattern that makes dead-branch
// elimination (optimize.ts) actually fire on real code: `local DEBUG =
// false; if DEBUG then ... end` doesn't have a literal condition until
// DEBUG's value is propagated into it.
//
// Deliberately narrow, for safety:
// - Only single-name `local x = <literal>` declarations are candidates
//   (never a multi-name/multi-value LocalStat, which has different
//   truncation/assignment semantics).
// - Only scalar literal kinds (nil/true/false/number/string) propagate.
//   NOT table constructors: cloning a table-constructor expression to
//   every use site would create a NEW table at each site instead of
//   preserving reference identity to the SAME table -- `local t = {1};
//   f(t); g(t)` needs f and g to share one table, not each get their own.
// - `<close>` locals are never touched: their scope-exit is what triggers
//   Luau's `__close` handling, a real runtime side effect that removing
//   the declaration would eliminate.
// - "Never reassigned" is proven by scanning every AssignStat/
//   CompoundAssignStat target in the whole program, not by trusting a
//   `<const>` attribute (though a `<const>` local trivially satisfies
//   this by construction, since Luau itself forbids reassigning one).
// - No cross-local chaining in a single pass (`local a=1; local b=a`
//   does not make `b` propagate `a`'s value directly) -- the caller loops
//   this together with optimize() to converge on chains iteratively:
//   propagating `a` turns `local b = a` into `local b = 1` `(a literal)`,
//   which becomes a new candidate on the next iteration.
//
// Returns true if anything was substituted (caller uses this to decide
// whether another iteration might find more).
export function propagateConstants(resolved: ResolvedProgram): boolean {
  const candidates = new Map<number, Expr>(); // symbolId -> literal to substitute
  const reassigned = new Set<number>();

  collectBlock(resolved.chunk.body, candidates, reassigned);

  const eligible = new Map<number, Expr>();
  for (const [id, literal] of candidates) {
    if (!reassigned.has(id)) eligible.set(id, literal);
  }
  if (eligible.size === 0) return false;

  // Two separate passes, deliberately not interleaved: substitute first
  // (recording which symbols were actually inlined at least once), then
  // drop declarations in a second pass. Dropping a declaration merely
  // because its symbol is "eligible" (regardless of whether anything ever
  // referenced it) would silently fold this into a DIFFERENT optimization
  // -- unused-variable elimination -- which happens to also be safe here
  // (the initializer is a side-effect-free literal) but is a separate
  // concern from "propagation" and was removing declarations that had
  // zero references to begin with, not ones actually inlined.
  const hitSymbols = new Set<number>();
  resolved.chunk.body = substituteBlock(resolved.chunk.body, eligible, hitSymbols);
  if (hitSymbols.size === 0) return false;

  resolved.chunk.body = dropDeclarations(resolved.chunk.body, hitSymbols);
  return true;
}

// Removes `local x = <literal>` declarations for symbols that were
// actually inlined at every use site by the substitute pass above (so the
// declaration is now provably dead: literal initializer, zero remaining
// reads, never reassigned).
function dropDeclarations(stats: Stat[], hitSymbols: Set<number>): Stat[] {
  const kept: Stat[] = [];
  for (const stat of stats) {
    if (stat.type === "LocalStat" && stat.names.length === 1 && stat.names[0].symbolId !== undefined && hitSymbols.has(stat.names[0].symbolId)) {
      continue;
    }
    dropDeclarationsInStat(stat, hitSymbols);
    kept.push(stat);
  }
  return kept;
}

function dropDeclarationsInStat(stat: Stat, hitSymbols: Set<number>) {
  const visit = (e: Expr) => dropDeclarationsInExpr(e, hitSymbols);
  switch (stat.type) {
    case "LocalStat":
      stat.init.forEach(visit);
      return;
    case "LocalFunctionStat":
    case "FunctionDeclStat":
      stat.func.body = dropDeclarations(stat.func.body, hitSymbols);
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
    case "WhileStat":
    case "NumericForStat":
    case "GenericForStat":
      if (stat.type === "WhileStat") visit(stat.cond);
      if (stat.type === "NumericForStat") {
        visit(stat.start);
        visit(stat.stop);
        if (stat.step) visit(stat.step);
      }
      if (stat.type === "GenericForStat") stat.exprs.forEach(visit);
      stat.body = dropDeclarations(stat.body, hitSymbols);
      return;
    case "RepeatStat":
      stat.body = dropDeclarations(stat.body, hitSymbols);
      visit(stat.cond);
      return;
    case "IfStat":
      for (const clause of stat.clauses) {
        visit(clause.cond);
        clause.body = dropDeclarations(clause.body, hitSymbols);
      }
      if (stat.elseBody) stat.elseBody = dropDeclarations(stat.elseBody, hitSymbols);
      return;
    case "ReturnStat":
      stat.args.forEach(visit);
      return;
    default:
      return;
  }
}

function dropDeclarationsInExpr(expr: Expr, hitSymbols: Set<number>) {
  const visit = (e: Expr) => dropDeclarationsInExpr(e, hitSymbols);
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
      expr.body = dropDeclarations(expr.body, hitSymbols);
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

function isPropagatableLiteral(expr: Expr): boolean {
  return (
    expr.type === "NilExpr" ||
    expr.type === "TrueExpr" ||
    expr.type === "FalseExpr" ||
    expr.type === "NumberExpr" ||
    expr.type === "StringExpr"
  );
}

function cloneLiteral(expr: Expr): Expr {
  // All propagatable kinds are plain data (no nested Expr fields), so a
  // shallow copy is a full, safe clone -- each use site gets its own node
  // instance rather than sharing one (later passes mutate nodes in place).
  return { ...expr };
}

// === pass 1: collect candidate declarations + every reassignment target ===

function collectBlock(stats: Stat[], candidates: Map<number, Expr>, reassigned: Set<number>) {
  for (const stat of stats) collectStat(stat, candidates, reassigned);
}

function markReassigned(target: Expr, reassigned: Set<number>) {
  if (target.type === "Identifier" && target.symbolId !== undefined) reassigned.add(target.symbolId);
}

function collectStat(stat: Stat, candidates: Map<number, Expr>, reassigned: Set<number>) {
  const visit = (e: Expr) => collectExpr(e, candidates, reassigned);
  switch (stat.type) {
    case "LocalStat":
      stat.init.forEach(visit);
      if (
        stat.names.length === 1 &&
        stat.init.length === 1 &&
        stat.names[0].attrib !== "close" &&
        stat.names[0].symbolId !== undefined &&
        isPropagatableLiteral(stat.init[0])
      ) {
        candidates.set(stat.names[0].symbolId, stat.init[0]);
      }
      return;
    case "LocalFunctionStat":
      collectBlock(stat.func.body, candidates, reassigned);
      return;
    case "FunctionDeclStat":
      collectBlock(stat.func.body, candidates, reassigned);
      return;
    case "AssignStat":
      for (const t of stat.targets) markReassigned(t, reassigned);
      stat.targets.forEach(visit);
      stat.values.forEach(visit);
      return;
    case "CompoundAssignStat":
      markReassigned(stat.target, reassigned);
      visit(stat.target);
      visit(stat.value);
      return;
    case "CallStat":
      visit(stat.call);
      return;
    case "DoStat":
      collectBlock(stat.body, candidates, reassigned);
      return;
    case "WhileStat":
      visit(stat.cond);
      collectBlock(stat.body, candidates, reassigned);
      return;
    case "RepeatStat":
      collectBlock(stat.body, candidates, reassigned);
      visit(stat.cond);
      return;
    case "IfStat":
      for (const clause of stat.clauses) {
        visit(clause.cond);
        collectBlock(clause.body, candidates, reassigned);
      }
      if (stat.elseBody) collectBlock(stat.elseBody, candidates, reassigned);
      return;
    case "NumericForStat":
      visit(stat.start);
      visit(stat.stop);
      if (stat.step) visit(stat.step);
      collectBlock(stat.body, candidates, reassigned);
      return;
    case "GenericForStat":
      stat.exprs.forEach(visit);
      collectBlock(stat.body, candidates, reassigned);
      return;
    case "ReturnStat":
      stat.args.forEach(visit);
      return;
    case "BreakStat":
    case "ContinueStat":
    case "GotoStat":
    case "LabelStat":
    case "TypeAliasStat":
      return;
  }
}

function collectExpr(expr: Expr, candidates: Map<number, Expr>, reassigned: Set<number>) {
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
      for (const part of expr.parts) if (typeof part !== "string") collectExpr(part, candidates, reassigned);
      return;
    case "IndexExpr":
      collectExpr(expr.object, candidates, reassigned);
      collectExpr(expr.index, candidates, reassigned);
      return;
    case "MemberExpr":
      collectExpr(expr.object, candidates, reassigned);
      return;
    case "CallExpr":
      collectExpr(expr.callee, candidates, reassigned);
      expr.args.forEach((a) => collectExpr(a, candidates, reassigned));
      return;
    case "MethodCallExpr":
      collectExpr(expr.object, candidates, reassigned);
      expr.args.forEach((a) => collectExpr(a, candidates, reassigned));
      return;
    case "FunctionExpr":
      collectBlock(expr.body, candidates, reassigned);
      return;
    case "TableExpr":
      for (const field of expr.fields) {
        if (field.kind === "computed") collectExpr(field.key, candidates, reassigned);
        collectExpr(field.value, candidates, reassigned);
      }
      return;
    case "BinaryExpr":
      collectExpr(expr.left, candidates, reassigned);
      collectExpr(expr.right, candidates, reassigned);
      return;
    case "UnaryExpr":
      collectExpr(expr.operand, candidates, reassigned);
      return;
    case "TypeAssertionExpr":
      collectExpr(expr.expr, candidates, reassigned);
      return;
    case "IfExpr":
      collectExpr(expr.cond, candidates, reassigned);
      collectExpr(expr.thenExpr, candidates, reassigned);
      for (const clause of expr.elseifs) {
        collectExpr(clause.cond, candidates, reassigned);
        collectExpr(clause.expr, candidates, reassigned);
      }
      collectExpr(expr.elseExpr, candidates, reassigned);
      return;
    case "ParenExpr":
      collectExpr(expr.expr, candidates, reassigned);
      return;
  }
}

// === pass 2: substitute eligible references, recording which symbols were
// actually inlined somewhere (declarations are dropped separately, above,
// only for symbols this pass actually hit) ===

function substituteBlock(stats: Stat[], eligible: Map<number, Expr>, hits: Set<number>): Stat[] {
  return stats.map((stat) => substituteStat(stat, eligible, hits));
}

function substituteStat(stat: Stat, eligible: Map<number, Expr>, hits: Set<number>): Stat {
  const sub = (e: Expr) => substituteExpr(e, eligible, hits);
  switch (stat.type) {
    case "LocalStat":
      stat.init = stat.init.map(sub);
      return stat;
    case "LocalFunctionStat":
      stat.func.body = substituteBlock(stat.func.body, eligible, hits);
      return stat;
    case "FunctionDeclStat":
      stat.func.body = substituteBlock(stat.func.body, eligible, hits);
      return stat;
    case "AssignStat":
      // A target's own top-level identifier can never itself be eligible
      // (an eligible symbol is by definition never a reassignment target),
      // but `t[x] = 5` / `t.f().g = 5` can still contain eligible reads
      // inside the target's object/index sub-expressions.
      stat.targets = stat.targets.map((t) => sub(t) as typeof t);
      stat.values = stat.values.map(sub);
      return stat;
    case "CompoundAssignStat":
      stat.target = sub(stat.target) as typeof stat.target;
      stat.value = sub(stat.value);
      return stat;
    case "CallStat":
      stat.call = sub(stat.call) as typeof stat.call;
      return stat;
    case "DoStat":
      stat.body = substituteBlock(stat.body, eligible, hits);
      return stat;
    case "WhileStat":
      stat.cond = sub(stat.cond);
      stat.body = substituteBlock(stat.body, eligible, hits);
      return stat;
    case "RepeatStat":
      stat.body = substituteBlock(stat.body, eligible, hits);
      stat.cond = sub(stat.cond);
      return stat;
    case "IfStat":
      for (const clause of stat.clauses) {
        clause.cond = sub(clause.cond);
        clause.body = substituteBlock(clause.body, eligible, hits);
      }
      if (stat.elseBody) stat.elseBody = substituteBlock(stat.elseBody, eligible, hits);
      return stat;
    case "NumericForStat":
      stat.start = sub(stat.start);
      stat.stop = sub(stat.stop);
      if (stat.step) stat.step = sub(stat.step);
      stat.body = substituteBlock(stat.body, eligible, hits);
      return stat;
    case "GenericForStat":
      stat.exprs = stat.exprs.map(sub);
      stat.body = substituteBlock(stat.body, eligible, hits);
      return stat;
    case "ReturnStat":
      stat.args = stat.args.map(sub);
      return stat;
    default:
      return stat;
  }
}

function substituteExpr(expr: Expr, eligible: Map<number, Expr>, hits: Set<number>): Expr {
  switch (expr.type) {
    case "NilExpr":
    case "TrueExpr":
    case "FalseExpr":
    case "VarargExpr":
    case "NumberExpr":
    case "StringExpr":
      return expr;
    case "Identifier": {
      if (expr.symbolId !== undefined && eligible.has(expr.symbolId)) {
        hits.add(expr.symbolId);
        return cloneLiteral(eligible.get(expr.symbolId)!);
      }
      return expr;
    }
    case "InterpolatedStringExpr":
      expr.parts = expr.parts.map((part) => (typeof part === "string" ? part : substituteExpr(part, eligible, hits)));
      return expr;
    case "IndexExpr":
      expr.object = substituteExpr(expr.object, eligible, hits);
      expr.index = substituteExpr(expr.index, eligible, hits);
      return expr;
    case "MemberExpr":
      expr.object = substituteExpr(expr.object, eligible, hits);
      return expr;
    case "CallExpr":
      expr.callee = substituteExpr(expr.callee, eligible, hits);
      expr.args = expr.args.map((a) => substituteExpr(a, eligible, hits));
      return expr;
    case "MethodCallExpr":
      expr.object = substituteExpr(expr.object, eligible, hits);
      expr.args = expr.args.map((a) => substituteExpr(a, eligible, hits));
      return expr;
    case "FunctionExpr":
      expr.body = substituteBlock(expr.body, eligible, hits);
      return expr;
    case "TableExpr":
      for (const field of expr.fields) {
        if (field.kind === "computed") field.key = substituteExpr(field.key, eligible, hits);
        field.value = substituteExpr(field.value, eligible, hits);
      }
      return expr;
    case "BinaryExpr":
      expr.left = substituteExpr(expr.left, eligible, hits);
      expr.right = substituteExpr(expr.right, eligible, hits);
      return expr;
    case "UnaryExpr":
      expr.operand = substituteExpr(expr.operand, eligible, hits);
      return expr;
    case "TypeAssertionExpr":
      expr.expr = substituteExpr(expr.expr, eligible, hits);
      return expr;
    case "IfExpr":
      expr.cond = substituteExpr(expr.cond, eligible, hits);
      expr.thenExpr = substituteExpr(expr.thenExpr, eligible, hits);
      for (const clause of expr.elseifs) {
        clause.cond = substituteExpr(clause.cond, eligible, hits);
        clause.expr = substituteExpr(clause.expr, eligible, hits);
      }
      expr.elseExpr = substituteExpr(expr.elseExpr, eligible, hits);
      return expr;
    case "ParenExpr":
      expr.expr = substituteExpr(expr.expr, eligible, hits);
      return expr;
  }
}
