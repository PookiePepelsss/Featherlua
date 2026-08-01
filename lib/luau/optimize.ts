import type { Chunk, Expr, Stat } from "./ast";
import { KEYWORDS } from "./tokens";

export function parseLuauNumber(raw: string): number | undefined {
  const clean = raw.replace(/_/g, "");
  const hex = /^0[xX]([0-9a-fA-F]*)(?:\.([0-9a-fA-F]*))?(?:[pP]([+-]?[0-9]+))?$/.exec(clean);
  if (hex) {
    const [, intPart, fracPart, expPart] = hex;
    if (!intPart && !fracPart) return undefined;
    let mantissa = intPart ? parseInt(intPart, 16) : 0;
    if (fracPart) mantissa += parseInt(fracPart, 16) / Math.pow(16, fracPart.length);
    const exp = expPart ? parseInt(expPart, 10) : 0;
    return mantissa * Math.pow(2, exp);
  }
  if (/^0[bB]/.test(clean)) {
    const digits = clean.slice(2);
    if (!/^[01]+$/.test(digits)) return undefined;
    return parseInt(digits, 2);
  }
  if (!/^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(clean)) return undefined;
  return parseFloat(clean);
}

function formatLuauNumber(n: number): string {
  return String(n);
}

function asNumberLiteral(expr: Expr): number | undefined {
  if (expr.type !== "NumberExpr") return undefined;
  return parseLuauNumber(expr.raw);
}

function canonicalizeNumber(raw: string): string {
  const value = parseLuauNumber(raw);
  if (value === undefined || !Number.isFinite(value) || Object.is(value, -0)) return raw;
  const formatted = formatLuauNumber(value);
  return formatted.length < raw.length ? formatted : raw;
}

const SIMPLE_STRING_INDEX_RE = /^(["'])([A-Za-z_][A-Za-z0-9_]*)\1$/;

function stringIndexToFieldName(raw: string): string | undefined {
  const match = SIMPLE_STRING_INDEX_RE.exec(raw);
  if (!match) return undefined;
  const name = match[2];
  return KEYWORDS.has(name) ? undefined : name;
}

function boolNode(v: boolean): Expr {
  return v ? { type: "TrueExpr" } : { type: "FalseExpr" };
}

type LiteralKind = "number" | "string" | "boolean" | "nil";

function literalKind(expr: Expr): LiteralKind | undefined {
  switch (expr.type) {
    case "NumberExpr":
      return "number";
    case "StringExpr":
      return "string";
    case "TrueExpr":
    case "FalseExpr":
      return "boolean";
    case "NilExpr":
      return "nil";
    default:
      return undefined;
  }
}

function literalTruthiness(expr: Expr): boolean | undefined {
  if (expr.type === "NilExpr" || expr.type === "FalseExpr") return false;
  if (expr.type === "TrueExpr" || expr.type === "NumberExpr" || expr.type === "StringExpr") return true;
  return undefined;
}

function foldEquality(left: Expr, right: Expr, isEq: boolean): Expr | undefined {
  const lk = literalKind(left);
  const rk = literalKind(right);
  if (!lk || !rk) return undefined;
  if (lk !== rk) return boolNode(!isEq);
  if (lk === "number") {
    const a = asNumberLiteral(left);
    const b = asNumberLiteral(right);
    if (a === undefined || b === undefined) return undefined;
    return boolNode(isEq ? a === b : a !== b);
  }
  if (lk === "boolean") {
    const a = left.type === "TrueExpr";
    const b = right.type === "TrueExpr";
    return boolNode(isEq ? a === b : a !== b);
  }
  if (lk === "nil") return boolNode(isEq);
  return undefined;
}

function foldNumericComparison(left: Expr, right: Expr, op: string): Expr | undefined {
  const a = asNumberLiteral(left);
  const b = asNumberLiteral(right);
  if (a === undefined || b === undefined) return undefined;
  const result = op === "<" ? a < b : op === "<=" ? a <= b : op === ">" ? a > b : a >= b;
  return boolNode(result);
}

function foldLogical(left: Expr, right: Expr, op: "and" | "or"): Expr | undefined {
  const truthy = literalTruthiness(left);
  if (truthy === undefined) return undefined;
  if (op === "and") return truthy ? right : left;
  return truthy ? left : right;
}

// Decimal escapes and \z can absorb text across a token boundary.
function trailingAbsorbingEscape(raw: string): { kind: "decimal"; digits: number } | { kind: "z" } | undefined {
  let index = 0;
  while (index < raw.length) {
    if (raw[index] !== "\\") {
      index += 1;
      continue;
    }
    const next = raw[index + 1];
    if (next === undefined) return undefined;
    if (/[0-9]/.test(next)) {
      let digits = 1;
      while (digits < 3 && /[0-9]/.test(raw[index + 1 + digits] ?? "")) digits += 1;
      index += 1 + digits;
      if (index === raw.length) return { kind: "decimal", digits };
      continue;
    }
    if (next === "z") {
      index += 2;
      while (/\s/u.test(raw[index] ?? "")) index += 1;
      if (index === raw.length) return { kind: "z" };
      continue;
    }
    if (next === "x") {
      index += 4;
      continue;
    }
    if (next === "u" && raw[index + 2] === "{") {
      const close = raw.indexOf("}", index + 3);
      index = close === -1 ? raw.length : close + 1;
      continue;
    }
    index += 2;
  }
  return undefined;
}

function foldConcat(left: Expr, right: Expr): Expr | undefined {
  if (left.type !== "StringExpr" || right.type !== "StringExpr") return undefined;
  const quote = left.raw[0];
  if ((quote !== "'" && quote !== '"') || right.raw[0] !== quote) return undefined;
  const leftInner = left.raw.slice(1, -1);
  const rightInner = right.raw.slice(1, -1);
  const trailing = trailingAbsorbingEscape(leftInner);
  if (trailing?.kind === "decimal" && trailing.digits < 3 && /^[0-9]/.test(rightInner)) return undefined;
  if (trailing?.kind === "z" && /^\s/u.test(rightInner)) return undefined;
  return { type: "StringExpr", raw: `${quote}${leftInner}${rightInner}${quote}` };
}

function foldToNumberNode(value: number): Expr | undefined {
  if (!Number.isFinite(value)) return undefined;
  if (Object.is(value, -0)) return undefined;
  if (value < 0) {
    return { type: "UnaryExpr", operator: "-", operand: { type: "NumberExpr", raw: formatLuauNumber(-value) } };
  }
  return { type: "NumberExpr", raw: formatLuauNumber(value) };
}

const FOLDABLE_BINOPS = new Set(["+", "-", "*", "/"]);

function foldExpr(expr: Expr): Expr {
  switch (expr.type) {
    case "NilExpr":
    case "TrueExpr":
    case "FalseExpr":
    case "VarargExpr":
    case "StringExpr":
    case "Identifier":
      return expr;
    case "NumberExpr":
      expr.raw = canonicalizeNumber(expr.raw);
      return expr;
    case "InterpolatedStringExpr":
      expr.parts = expr.parts.map((part) => (typeof part === "string" ? part : foldExpr(part)));
      return expr;
    case "IndexExpr": {
      expr.object = foldExpr(expr.object);
      expr.index = foldExpr(expr.index);
      if (expr.index.type === "StringExpr") {
        const name = stringIndexToFieldName(expr.index.raw);
        if (name) return { type: "MemberExpr", object: expr.object, name };
      }
      return expr;
    }
    case "MemberExpr":
      expr.object = foldExpr(expr.object);
      return expr;
    case "CallExpr":
      expr.callee = foldExpr(expr.callee);
      expr.args = expr.args.map(foldExpr);
      return expr;
    case "MethodCallExpr":
      expr.object = foldExpr(expr.object);
      expr.args = expr.args.map(foldExpr);
      return expr;
    case "FunctionExpr":
      expr.body = optimizeBlock(expr.body);
      return expr;
    case "TableExpr":
      for (const field of expr.fields) {
        if (field.kind === "computed") field.key = foldExpr(field.key);
        field.value = foldExpr(field.value);
      }
      return expr;
    case "UnaryExpr": {
      expr.operand = foldExpr(expr.operand);
      if (expr.operator === "-") {
        const v = asNumberLiteral(expr.operand);
        if (v !== undefined) {
          const folded = foldToNumberNode(-v);
          if (folded) return folded;
        }
      } else if (expr.operator === "not") {
        const truthy = literalTruthiness(expr.operand);
        if (truthy !== undefined) return boolNode(!truthy);
      }
      return expr;
    }
    case "BinaryExpr": {
      expr.left = foldExpr(expr.left);
      expr.right = foldExpr(expr.right);
      if (FOLDABLE_BINOPS.has(expr.operator)) {
        const a = asNumberLiteral(expr.left);
        const b = asNumberLiteral(expr.right);
        if (a !== undefined && b !== undefined) {
          const result =
            expr.operator === "+" ? a + b :
            expr.operator === "-" ? a - b :
            expr.operator === "*" ? a * b :
            a / b;
          const folded = foldToNumberNode(result);
          if (folded) return folded;
        }
        return expr;
      }
      if (expr.operator === "==" || expr.operator === "~=") {
        const folded = foldEquality(expr.left, expr.right, expr.operator === "==");
        if (folded) return folded;
        return expr;
      }
      if (expr.operator === "<" || expr.operator === "<=" || expr.operator === ">" || expr.operator === ">=") {
        const folded = foldNumericComparison(expr.left, expr.right, expr.operator);
        if (folded) return folded;
        return expr;
      }
      if (expr.operator === "and" || expr.operator === "or") {
        const folded = foldLogical(expr.left, expr.right, expr.operator);
        if (folded) return folded;
        return expr;
      }
      if (expr.operator === "..") {
        const folded = foldConcat(expr.left, expr.right);
        if (folded) return folded;
        return expr;
      }
      return expr;
    }
    case "TypeAssertionExpr":
      expr.expr = foldExpr(expr.expr);
      return expr;
    case "IfExpr":
      expr.cond = foldExpr(expr.cond);
      expr.thenExpr = foldExpr(expr.thenExpr);
      for (const clause of expr.elseifs) {
        clause.cond = foldExpr(clause.cond);
        clause.expr = foldExpr(clause.expr);
      }
      expr.elseExpr = foldExpr(expr.elseExpr);
      return expr;
    case "ParenExpr":
      expr.expr = foldExpr(expr.expr);
      // Parens around a bare number literal are always redundant (never
      // multi-value), so unwrapping here is a strict simplification.
      if (expr.expr.type === "NumberExpr") return expr.expr;
      return expr;
  }
}

// True if a goto elsewhere might target a label inside this block (or any
// nested block). Eliminating a branch containing one could strand that
// goto with no matching label, which the parser doesn't validate (Luau's
// own compiler would only catch it at the user's next compile). Cheap and
// conservative: just skip the optimization rather than risk it.
function containsLabel(stats: Stat[]): boolean {
  for (const stat of stats) {
    switch (stat.type) {
      case "LabelStat":
        return true;
      case "DoStat":
      case "WhileStat":
      case "NumericForStat":
      case "GenericForStat":
        if (containsLabel(stat.body)) return true;
        break;
      case "RepeatStat":
        if (containsLabel(stat.body)) return true;
        break;
      case "IfStat":
        if (stat.clauses.some((c) => containsLabel(c.body))) return true;
        if (stat.elseBody && containsLabel(stat.elseBody)) return true;
        break;
      default:
        break;
    }
  }
  return false;
}

export function optimize(chunk: Chunk): Chunk {
  chunk.body = optimizeBlock(chunk.body);
  return chunk;
}

// True if `type` unconditionally exits the block it's in -- statements
// after it in the same block never run.
function isTerminator(stat: Stat): boolean {
  return (
    stat.type === "ReturnStat" ||
    stat.type === "BreakStat" ||
    stat.type === "ContinueStat" ||
    stat.type === "GotoStat"
  );
}

// A goto elsewhere (including one that already ran, earlier in this same
// block) can only target a label directly in this block or an enclosing
// one -- Luau's scoping never lets a label inside a nested do/if/loop body
// be jumped to from outside it. So only a label at THIS level, not nested
// deeper, can make code after a terminator reachable.
function hasTopLevelLabel(stats: Stat[]): boolean {
  return stats.some((s) => s.type === "LabelStat");
}

function optimizeBlock(stats: Stat[]): Stat[] {
  const kept: Stat[] = [];
  for (let i = 0; i < stats.length; i += 1) {
    const result = optimizeStat(stats[i]);
    if (!result) continue;
    kept.push(result);
    if (isTerminator(result) && !hasTopLevelLabel(stats.slice(i + 1))) break;
  }
  return kept;
}

function optimizeStat(stat: Stat): Stat | undefined {
  switch (stat.type) {
    case "LocalStat":
      stat.init = stat.init.map(foldExpr);
      // `local x = nil` (or `local a, b = nil, nil`) is exactly what a bare
      // `local x` already means -- every name past the given inits (or with
      // no init at all) is implicitly nil regardless of count, so this only
      // fires when EVERY given init is a literal nil (never a partial list,
      // where a real value could still be lurking).
      if (stat.init.length > 0 && stat.init.every((e) => e.type === "NilExpr")) {
        stat.init = [];
      }
      return stat;
    case "LocalFunctionStat":
      stat.func.body = optimizeBlock(stat.func.body);
      return stat;
    case "FunctionDeclStat":
      stat.target.base = foldExpr(stat.target.base);
      stat.func.body = optimizeBlock(stat.func.body);
      return stat;
    case "AssignStat":
      stat.targets = stat.targets.map((t) => foldExpr(t) as typeof t);
      stat.values = stat.values.map(foldExpr);
      return stat;
    case "CompoundAssignStat":
      stat.target = foldExpr(stat.target) as typeof stat.target;
      stat.value = foldExpr(stat.value);
      return stat;
    case "CallStat":
      stat.call = foldExpr(stat.call) as typeof stat.call;
      return stat;
    case "DoStat": {
      stat.body = optimizeBlock(stat.body);
      // An empty do-block does nothing and creates no observable scope --
      // safe to drop outright, including empty blocks left behind by an
      // earlier optimize()/propagateConstants() round (e.g. a `do...end`
      // wrapper from eliminating an `if true` branch whose only statement
      // was then itself removed by constant propagation).
      if (stat.body.length === 0) return undefined;
      return stat;
    }
    case "WhileStat": {
      stat.cond = foldExpr(stat.cond);
      stat.body = optimizeBlock(stat.body);
      // `while false do ... end` never runs its body even once -- safe to
      // drop entirely, unlike a mid-loop `break`/`if false` elimination
      // (see optimize.ts's other passes) which must preserve scope via a
      // do-wrapper; here nothing survives at all.
      if (stat.cond.type === "FalseExpr" && !containsLabel(stat.body)) return undefined;
      return stat;
    }
    case "RepeatStat":
      stat.body = optimizeBlock(stat.body);
      stat.cond = foldExpr(stat.cond);
      return stat;
    case "IfStat": {
      for (const clause of stat.clauses) {
        clause.cond = foldExpr(clause.cond);
        clause.body = optimizeBlock(clause.body);
      }
      if (stat.elseBody) stat.elseBody = optimizeBlock(stat.elseBody);
      // Only the single-clause (no elseif) case, to keep this bounded:
      // `if COND then A [else B] end`.
      if (stat.clauses.length === 1) {
        const [clause] = stat.clauses;
        if (clause.cond.type === "TrueExpr" && !containsLabel(clause.body)) {
          return clause.body.length === 0 ? undefined : { type: "DoStat", body: clause.body };
        }
        if (clause.cond.type === "FalseExpr") {
          if (stat.elseBody) {
            if (!containsLabel(stat.elseBody)) {
              return stat.elseBody.length === 0 ? undefined : { type: "DoStat", body: stat.elseBody };
            }
          } else if (!containsLabel(clause.body)) {
            return undefined; // neither branch ever runs; drop the statement
          }
        }
      }
      return stat;
    }
    case "NumericForStat":
      stat.start = foldExpr(stat.start);
      stat.stop = foldExpr(stat.stop);
      if (stat.step) stat.step = foldExpr(stat.step);
      stat.body = optimizeBlock(stat.body);
      return stat;
    case "GenericForStat":
      stat.exprs = stat.exprs.map(foldExpr);
      stat.body = optimizeBlock(stat.body);
      return stat;
    case "ReturnStat":
      stat.args = stat.args.map(foldExpr);
      return stat;
    case "BreakStat":
    case "ContinueStat":
    case "GotoStat":
    case "LabelStat":
    case "TypeAliasStat":
      return stat;
  }
}
