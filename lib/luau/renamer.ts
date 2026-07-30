import { KEYWORDS } from "./tokens";
import type { Chunk, Expr, Stat } from "./ast";
import type { ResolvedProgram } from "./scope-resolver";

// Excluded from the generated-name alphabet even though Luau treats them as
// contextual/soft keywords (legal identifiers in most positions) -- zero
// ambiguity risk for the printer/parser at negligible cost (26+ letters of
// headroom for any realistic file).
const SOFT_KEYWORDS = new Set(["continue", "type", "export"]);

function shortName(n: number): string {
  let s = "";
  let i = n;
  do {
    s = String.fromCharCode(97 + (i % 26)) + s;
    i = Math.floor(i / 26) - 1;
  } while (i >= 0);
  return s;
}

function collectGlobalNames(chunk: Chunk): Set<string> {
  const names = new Set<string>();

  const visitBlock = (stats: Stat[]) => stats.forEach(visitStat);

  function visitExpr(expr: Expr): void {
    switch (expr.type) {
      case "NilExpr":
      case "TrueExpr":
      case "FalseExpr":
      case "VarargExpr":
      case "NumberExpr":
      case "StringExpr":
        return;
      case "InterpolatedStringExpr":
        for (const part of expr.parts) if (typeof part !== "string") visitExpr(part);
        return;
      case "Identifier":
        if (expr.isGlobal) names.add(expr.name);
        return;
      case "IndexExpr":
        visitExpr(expr.object);
        visitExpr(expr.index);
        return;
      case "MemberExpr":
        visitExpr(expr.object);
        return;
      case "CallExpr":
        visitExpr(expr.callee);
        expr.args.forEach(visitExpr);
        return;
      case "MethodCallExpr":
        visitExpr(expr.object);
        expr.args.forEach(visitExpr);
        return;
      case "FunctionExpr":
        visitBlock(expr.body);
        return;
      case "TableExpr":
        for (const field of expr.fields) {
          if (field.kind === "computed") visitExpr(field.key);
          visitExpr(field.value);
        }
        return;
      case "BinaryExpr":
        visitExpr(expr.left);
        visitExpr(expr.right);
        return;
      case "UnaryExpr":
        visitExpr(expr.operand);
        return;
      case "TypeAssertionExpr":
        visitExpr(expr.expr);
        return;
      case "IfExpr":
        visitExpr(expr.cond);
        visitExpr(expr.thenExpr);
        for (const clause of expr.elseifs) {
          visitExpr(clause.cond);
          visitExpr(clause.expr);
        }
        visitExpr(expr.elseExpr);
        return;
      case "ParenExpr":
        visitExpr(expr.expr);
        return;
    }
  }

  function visitStat(stat: Stat): void {
    switch (stat.type) {
      case "LocalStat":
        stat.init.forEach(visitExpr);
        return;
      case "LocalFunctionStat":
        visitBlock(stat.func.body);
        return;
      case "FunctionDeclStat":
        visitExpr(stat.target.base);
        visitBlock(stat.func.body);
        return;
      case "AssignStat":
        stat.targets.forEach(visitExpr);
        stat.values.forEach(visitExpr);
        return;
      case "CompoundAssignStat":
        visitExpr(stat.target);
        visitExpr(stat.value);
        return;
      case "CallStat":
        visitExpr(stat.call);
        return;
      case "DoStat":
        visitBlock(stat.body);
        return;
      case "WhileStat":
        visitExpr(stat.cond);
        visitBlock(stat.body);
        return;
      case "RepeatStat":
        visitBlock(stat.body);
        visitExpr(stat.cond);
        return;
      case "IfStat":
        for (const clause of stat.clauses) {
          visitExpr(clause.cond);
          visitBlock(clause.body);
        }
        if (stat.elseBody) visitBlock(stat.elseBody);
        return;
      case "NumericForStat":
        visitExpr(stat.start);
        visitExpr(stat.stop);
        if (stat.step) visitExpr(stat.step);
        visitBlock(stat.body);
        return;
      case "GenericForStat":
        stat.exprs.forEach(visitExpr);
        visitBlock(stat.body);
        return;
      case "ReturnStat":
        stat.args.forEach(visitExpr);
        return;
      case "BreakStat":
      case "ContinueStat":
      case "GotoStat":
      case "LabelStat":
      case "TypeAliasStat":
        return;
    }
  }

  visitBlock(chunk.body);
  return names;
}

// One globally-unique short name per symbol across the whole file (not
// per-scope reuse) -- simpler, and sidesteps an entire class of
// shadowing/capture bugs that would otherwise need a Lua VM to catch. See
// plan for the tradeoff (smaller output from per-scope reuse is a possible
// future optimization, not attempted here).
export function computeRenameMap(resolved: ResolvedProgram): Map<number, string> {
  const taken = new Set<string>([...KEYWORDS, ...SOFT_KEYWORDS, ...collectGlobalNames(resolved.chunk)]);
  const renameMap = new Map<number, string>();
  const orderedSymbols = [...resolved.symbols.values()].sort((a, b) => a.id - b.id);
  let n = 0;
  for (const symbol of orderedSymbols) {
    // Luau's `:` method-call sugar always binds the literal name `self` --
    // there is no way to call it anything else while still using colon-call
    // syntax, so it must never be renamed.
    if (symbol.kind === "self") continue;
    let candidate: string;
    do {
      candidate = shortName(n);
      n += 1;
    } while (taken.has(candidate));
    renameMap.set(symbol.id, candidate);
  }
  return renameMap;
}
