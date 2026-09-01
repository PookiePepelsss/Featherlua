import type { Chunk, Expr, FunctionExpr, Stat, TypeSpan } from "./ast";

// Strips every annotation from the tree: types on params and locals,
// generics, return and vararg types, `type` aliases, and `expr :: Type`
// assertions. Luau erases types at compile time, so this cannot change what
// the code does. Mutates in place and returns the same chunk.
export function stripTypeInfo(chunk: Chunk): Chunk {
  onSpan = () => undefined;
  dropAliases = true;
  chunk.body = stripBlock(chunk.body);
  return chunk;
}

// Every name mentioned in a type annotation. Spans are reprinted verbatim,
// so when annotations are kept, the locals they name must keep their names
// and their declarations or the annotation points at nothing. Only applies
// when the user asks to keep types; by default there are none left.
export function collectTypeSpanNames(chunk: Chunk): Set<string> {
  const names = new Set<string>();
  onSpan = (span) => {
    if (span) for (const token of span.tokens) if (token.kind === "Name") names.add(token.text);
    return span;
  };
  dropAliases = false;
  stripBlock(chunk.body);
  onSpan = () => undefined;
  dropAliases = true;
  return names;
}

// The walk below is shared: `stripTypeInfo` discards each span it reaches,
// `collectTypeSpanNames` reads and returns it untouched.
let onSpan: (span: TypeSpan | undefined) => TypeSpan | undefined = () => undefined;
let dropAliases = true;

function stripBlock(stats: Stat[]): Stat[] {
  const kept: Stat[] = [];
  for (const stat of stats) {
    if (stat.type === "TypeAliasStat") {
      if (dropAliases) continue; // zero runtime effect, drop entirely
      stat.generics = onSpan(stat.generics);
      stat.definition = onSpan(stat.definition) ?? stat.definition;
      kept.push(stat);
      continue;
    }
    stripStat(stat);
    kept.push(stat);
  }
  return kept;
}

function stripFunctionExpr(func: FunctionExpr) {
  func.generics = onSpan(func.generics);
  func.returnType = onSpan(func.returnType);
  func.varargType = onSpan(func.varargType);
  for (const param of func.params) param.typeAnnotation = onSpan(param.typeAnnotation);
  func.body = stripBlock(func.body);
}

function stripStat(stat: Stat) {
  switch (stat.type) {
    case "LocalStat":
      for (const name of stat.names) name.typeAnnotation = onSpan(name.typeAnnotation);
      stat.init = stat.init.map(stripExpr);
      return;
    case "LocalFunctionStat":
      stripFunctionExpr(stat.func);
      return;
    case "FunctionDeclStat":
      stat.target.base = stripExpr(stat.target.base);
      stripFunctionExpr(stat.func);
      return;
    case "AssignStat":
      stat.targets = stat.targets.map((t) => stripExpr(t) as typeof t);
      stat.values = stat.values.map(stripExpr);
      return;
    case "CompoundAssignStat":
      stat.target = stripExpr(stat.target) as typeof stat.target;
      stat.value = stripExpr(stat.value);
      return;
    case "CallStat":
      stat.call = stripExpr(stat.call) as typeof stat.call;
      return;
    case "DoStat":
      stat.body = stripBlock(stat.body);
      return;
    case "WhileStat":
      stat.cond = stripExpr(stat.cond);
      stat.body = stripBlock(stat.body);
      return;
    case "RepeatStat":
      stat.body = stripBlock(stat.body);
      stat.cond = stripExpr(stat.cond);
      return;
    case "IfStat":
      for (const clause of stat.clauses) {
        clause.cond = stripExpr(clause.cond);
        clause.body = stripBlock(clause.body);
      }
      if (stat.elseBody) stat.elseBody = stripBlock(stat.elseBody);
      return;
    case "NumericForStat":
      stat.start = stripExpr(stat.start);
      stat.stop = stripExpr(stat.stop);
      if (stat.step) stat.step = stripExpr(stat.step);
      stat.body = stripBlock(stat.body);
      return;
    case "GenericForStat":
      stat.exprs = stat.exprs.map(stripExpr);
      stat.body = stripBlock(stat.body);
      return;
    case "ReturnStat":
      stat.args = stat.args.map(stripExpr);
      return;
    case "BreakStat":
    case "ContinueStat":
      return;
    case "TypeAliasStat":
      return; // unreachable: filtered out in stripBlock
  }
}

function stripExpr(expr: Expr): Expr {
  switch (expr.type) {
    case "NilExpr":
    case "TrueExpr":
    case "FalseExpr":
    case "VarargExpr":
    case "NumberExpr":
    case "StringExpr":
    case "Identifier":
      return expr;
    case "InterpolatedStringExpr":
      expr.parts = expr.parts.map((part) => (typeof part === "string" ? part : stripExpr(part)));
      return expr;
    case "IndexExpr":
      expr.object = stripExpr(expr.object);
      expr.index = stripExpr(expr.index);
      return expr;
    case "MemberExpr":
      expr.object = stripExpr(expr.object);
      return expr;
    case "CallExpr":
      expr.callee = stripExpr(expr.callee);
      expr.args = expr.args.map(stripExpr);
      return expr;
    case "MethodCallExpr":
      expr.object = stripExpr(expr.object);
      expr.args = expr.args.map(stripExpr);
      return expr;
    case "FunctionExpr":
      stripFunctionExpr(expr);
      return expr;
    case "TableExpr":
      for (const field of expr.fields) {
        if (field.kind === "computed") field.key = stripExpr(field.key);
        field.value = stripExpr(field.value);
      }
      return expr;
    case "BinaryExpr":
      expr.left = stripExpr(expr.left);
      expr.right = stripExpr(expr.right);
      return expr;
    case "UnaryExpr":
      expr.operand = stripExpr(expr.operand);
      return expr;
    case "TypeAssertionExpr": {
      // `(x :: number)` and `x` are runtime-identical -- the assertion is a
      // compile-time-only type-checker hint, not a runtime cast. Replace
      // the whole node with the (recursively stripped) inner expression.
      if (!dropAliases) {
        onSpan(expr.typeAnnotation);
        expr.expr = stripExpr(expr.expr);
        return expr;
      }
      // One thing about the assertion IS observable: like parentheses, it
      // truncates a call or `...` to a single value, so `f(g() :: any)`
      // passes one argument where `f(g())` passes them all. Handing back
      // the bare call would change that; parens keep the truncation.
      const inner = stripExpr(expr.expr);
      const multiValue = inner.type === "CallExpr" || inner.type === "MethodCallExpr" || inner.type === "VarargExpr";
      return multiValue ? { type: "ParenExpr", expr: inner } : inner;
    }
    case "IfExpr":
      expr.cond = stripExpr(expr.cond);
      expr.thenExpr = stripExpr(expr.thenExpr);
      for (const clause of expr.elseifs) {
        clause.cond = stripExpr(clause.cond);
        clause.expr = stripExpr(clause.expr);
      }
      expr.elseExpr = stripExpr(expr.elseExpr);
      return expr;
    case "ParenExpr":
      expr.expr = stripExpr(expr.expr);
      return expr;
  }
}
