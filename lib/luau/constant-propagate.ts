import type { Expr, Stat } from "./ast";
import type { ResolvedProgram } from "./scope-resolver";
import { stringLocalIsWorthKeeping } from "./hoist-repeated-strings";

export function propagateConstants(resolved: ResolvedProgram, willRename: boolean, pinnedNames?: Set<string>): boolean {
  const candidates = new Map<number, Expr>(); // symbolId -> literal to substitute
  const nameLengths = new Map<number, number>(); // symbolId -> original declared name's length
  const reassigned = new Set<number>();
  const refCounts = new Map<number, number>();

  collectBlock(resolved.chunk.body, candidates, nameLengths, reassigned, refCounts);

  const eligible = new Map<number, Expr>();
  for (const [id, literal] of candidates) {
    if (reassigned.has(id)) continue;
    // Substituting this away would delete a declaration a surviving type
    // annotation still names.
    if (pinnedNames?.size && pinnedNames.has(resolved.symbols.get(id)?.originalName ?? "")) continue;
    const refCount = refCounts.get(id) ?? 0;
    // Keep string hoisting and propagation from undoing each other.
    if (literal.type === "StringExpr" && stringLocalIsWorthKeeping(literal.raw, refCount, willRename)) continue;
    const rawLength = literalRawLength(literal);
    if (rawLength !== undefined && !worthPropagatingLiteral(rawLength, refCount, nameLengths.get(id), willRename)) {
      continue;
    }
    eligible.set(id, literal);
  }
  if (eligible.size === 0) return false;

  const hitSymbols = new Set<number>();
  resolved.chunk.body = substituteBlock(resolved.chunk.body, eligible, hitSymbols);
  if (hitSymbols.size === 0) return false;

  resolved.chunk.body = dropDeclarations(resolved.chunk.body, hitSymbols);
  return true;
}

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

// The printed length of a nil/boolean/number literal -- fixed text for
// nil/true/false, the literal's own raw text for a number. Strings are
// deliberately not covered here; their gate lives in
// hoist-repeated-strings.ts and has to stay in sync with that pass
// specifically (see the caller).
function literalRawLength(expr: Expr): number | undefined {
  switch (expr.type) {
    case "NilExpr":
      return 3;
    case "TrueExpr":
      return 4;
    case "FalseExpr":
      return 5;
    case "NumberExpr":
      return expr.raw.length;
    default:
      return undefined;
  }
}

// True if inlining a literal `refCount` times costs no more bytes than
// leaving it as a local. `nameLength` is the original declaration's name
// length when renaming is off (the local keeps that exact text); when
// renaming is on, 1 is used instead -- an optimistic but realistic
// assumption, since renaming reliably gets a scope's first handful of
// locals down to a single letter.
const DECL_OVERHEAD = 7; // `local ` + `=`

function worthPropagatingLiteral(
  rawLength: number,
  refCount: number,
  nameLength: number | undefined,
  willRename: boolean,
): boolean {
  if (refCount < 2 || nameLength === undefined) return true;
  const assumedNameLength = willRename ? 1 : nameLength;
  // Propagating drops the declaration entirely (each use becomes the raw
  // literal); not propagating keeps it (each use stays a name reference,
  // but the declaration itself -- `local `+name+`=`+raw -- still costs
  // bytes too).
  const inlinedCost = refCount * rawLength;
  const keptAsLocalCost = refCount * assumedNameLength + (DECL_OVERHEAD + assumedNameLength + rawLength);
  return inlinedCost <= keptAsLocalCost;
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

function collectBlock(
  stats: Stat[],
  candidates: Map<number, Expr>,
  nameLengths: Map<number, number>,
  reassigned: Set<number>,
  refCounts: Map<number, number>,
) {
  for (const stat of stats) collectStat(stat, candidates, nameLengths, reassigned, refCounts);
}

function markReassigned(target: Expr, reassigned: Set<number>) {
  if (target.type === "Identifier" && target.symbolId !== undefined) reassigned.add(target.symbolId);
}

function collectStat(
  stat: Stat,
  candidates: Map<number, Expr>,
  nameLengths: Map<number, number>,
  reassigned: Set<number>,
  refCounts: Map<number, number>,
) {
  const visit = (e: Expr) => collectExpr(e, candidates, reassigned, refCounts, nameLengths);
  const block = (b: Stat[]) => collectBlock(b, candidates, nameLengths, reassigned, refCounts);
  switch (stat.type) {
    case "LocalStat":
      stat.init.forEach(visit);
      if (
        stat.names.length === 1 &&
        stat.init.length === 1 &&
        stat.names[0].attrib !== "close" &&
        !stat.names[0].synthetic &&
        stat.names[0].symbolId !== undefined &&
        isPropagatableLiteral(stat.init[0])
      ) {
        candidates.set(stat.names[0].symbolId, stat.init[0]);
        nameLengths.set(stat.names[0].symbolId, stat.names[0].name.length);
      }
      return;
    case "LocalFunctionStat":
      block(stat.func.body);
      return;
    case "FunctionDeclStat":
      block(stat.func.body);
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
    case "BreakStat":
    case "ContinueStat":
    case "TypeAliasStat":
      return;
  }
}

function collectExpr(
  expr: Expr,
  candidates: Map<number, Expr>,
  reassigned: Set<number>,
  refCounts: Map<number, number>,
  nameLengths: Map<number, number>,
) {
  const visit = (e: Expr) => collectExpr(e, candidates, reassigned, refCounts, nameLengths);
  switch (expr.type) {
    case "NilExpr":
    case "TrueExpr":
    case "FalseExpr":
    case "VarargExpr":
    case "NumberExpr":
    case "StringExpr":
      return;
    case "Identifier":
      if (expr.symbolId !== undefined) refCounts.set(expr.symbolId, (refCounts.get(expr.symbolId) ?? 0) + 1);
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
      collectBlock(expr.body, candidates, nameLengths, reassigned, refCounts);
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
