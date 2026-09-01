import { KEYWORDS } from "./tokens";
import type { Chunk, Expr, Stat } from "./ast";
import type { ResolvedProgram, Scope } from "./scope-resolver";

// Excluded from the generated-name alphabet even though Luau treats them as
// contextual/soft keywords (legal identifiers in most positions) -- zero
// ambiguity risk for the printer/parser at negligible cost (26+ letters of
// headroom for any realistic file).
const SOFT_KEYWORDS = new Set(["continue", "type", "export"]);

function shortName(n: number): string {
  const head = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const tail = `${head}0123456789`;
  let width = 1;
  let block = head.length;
  while (n >= block) {
    n -= block;
    width += 1;
    block *= tail.length;
  }

  const divisor = tail.length ** (width - 1);
  let name = head[Math.floor(n / divisor)];
  let remainder = n % divisor;
  for (let position = width - 2; position >= 0; position -= 1) {
    const place = tail.length ** position;
    name += tail[Math.floor(remainder / place)];
    remainder %= place;
  }
  return name;
}

function collectRenameStats(chunk: Chunk) {
  const globals = new Set<string>();
  const references = new Map<number, number>();

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
        if (expr.isGlobal) globals.add(expr.name);
        else if (expr.symbolId !== undefined) {
          references.set(expr.symbolId, (references.get(expr.symbolId) ?? 0) + 1);
        }
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
      case "TypeAliasStat":
        return;
    }
  }

  visitBlock(chunk.body);
  return { globals, references };
}

// Two locals can share a name as long as neither's scope contains the
// other's, since then they are never in view at the same time. A DFS
// carrying a "next free index" down the tree gets that for free: children
// continue from where the parent stopped, so no descendant collides with an
// ancestor, while siblings restart from the same number and reuse names.
export function computeRenameMap(resolved: ResolvedProgram, pinnedNames?: Set<string>): Map<number, string> {
  const { globals, references } = collectRenameStats(resolved.chunk);
  // Type spans are reprinted verbatim, so a local a surviving annotation
  // names has to keep that name, and no other local may be given it.
  const pinned = pinnedNames ?? new Set<string>();
  const taken = new Set<string>([...KEYWORDS, ...SOFT_KEYWORDS, ...globals, ...pinned]);
  const renameMap = new Map<number, string>();

  function visit(scope: Scope) {
    // Only the outer names actually read inside this scope are off limits.
    // Anything else an ancestor holds can be reused here, which is what
    // keeps deeply nested code on single-character names instead of
    // spilling into two once a chunk has more than 52 locals.
    const blocked = new Set<string>();
    for (const id of scope.outerRefs) {
      const name = renameMap.get(id);
      if (name !== undefined) blocked.add(name);
    }

    const symbols = scope.declaredOrder
      .map((symbolId, order) => ({ symbolId, order, symbol: resolved.symbols.get(symbolId)! }))
      .filter((entry) => entry.symbol.kind !== "self" && !pinned.has(entry.symbol.originalName))
      .sort((a, b) => (references.get(b.symbolId) ?? 0) - (references.get(a.symbolId) ?? 0) || a.order - b.order);

    let index = 0;
    for (const { symbolId } of symbols) {
      let candidate: string;
      do {
        candidate = shortName(index);
        index += 1;
      } while (taken.has(candidate) || blocked.has(candidate));
      renameMap.set(symbolId, candidate);
      // Declarations in one scope are all simultaneously live, so they also
      // block each other, and they block every descendant that reads them.
      blocked.add(candidate);
    }
    for (const child of scope.children) visit(child);
  }

  visit(resolved.rootScope);
  return renameMap;
}
