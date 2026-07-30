import type { Chunk, Expr, Stat } from "./ast";

// Narrow, provably-safe optimizations that reduce actual runtime work (not
// just byte count): folding literal arithmetic, and removing branches whose
// condition is a literal `true`/`false`. Both matter most when the folded
// expression or eliminated check sits inside a loop (re-evaluated every
// iteration otherwise). Deliberately does NOT do constant propagation
// (tracking that a *variable* always holds a literal value), string
// escape-aware folding, or folding `%`/`//`/`^` -- each adds real
// correctness risk (Lua's `%` is floor-mod, not JS's truncating `%`; `^`
// isn't guaranteed bit-identical between JS and Lua's libm `pow`; string
// escapes need a full, easy-to-get-wrong decoder) for marginal payoff.
// Runs on the raw parsed AST, before scope resolution -- folding literals
// and removing whole branches needs no symbol/scope information.

function parseLuauNumber(raw: string): number | undefined {
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

// JS's default number-to-string is the shortest decimal that round-trips
// to the exact same IEEE-754 double, which is exactly what's needed here:
// the printed literal must parse back to the identical bit pattern the
// folded arithmetic produced, not just "a" correct-looking value.
function formatLuauNumber(n: number): string {
  return String(n);
}

function asNumberLiteral(expr: Expr): number | undefined {
  if (expr.type !== "NumberExpr") return undefined;
  return parseLuauNumber(expr.raw);
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

// Only nil and false are falsy in Lua -- 0 and "" are truthy, unlike JS.
function literalTruthiness(expr: Expr): boolean | undefined {
  if (expr.type === "NilExpr" || expr.type === "FalseExpr") return false;
  if (expr.type === "TrueExpr" || expr.type === "NumberExpr" || expr.type === "StringExpr") return true;
  return undefined;
}

// `==`/`~=` between literals of different fundamental Lua types are always
// false/true respectively -- Lua never coerces across number/string/
// boolean/nil for equality (no metatables involved for raw literals).
// String==string is deliberately left unfolded: proving two escaped string
// literals decode to different values isn't safe without a full escape
// decoder (`"\65"` and `"A"` are different raw text but the same string).
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
  return undefined; // string==string
}

// `<`/`<=`/`>`/`>=` only fold between two numbers -- Lua allows ordering
// comparisons between two numbers or two strings (byte-wise), never mixed
// types (that's a runtime error, not a boolean, so must never be folded to
// one), and string ordering has the same escape-decoding risk as equality.
function foldNumericComparison(left: Expr, right: Expr, op: string): Expr | undefined {
  const a = asNumberLiteral(left);
  const b = asNumberLiteral(right);
  if (a === undefined || b === undefined) return undefined;
  const result = op === "<" ? a < b : op === "<=" ? a <= b : op === ">" ? a > b : a >= b;
  return boolNode(result);
}

// Lua's `and`/`or` return one of their OPERANDS, never a synthesized
// true/false: `a and b` is `a` if `a` is falsy, else `b`; `a or b` is `a`
// if `a` is truthy, else `b`. Only the LEFT operand's truthiness needs to
// be known (a literal); the right side is returned as-is, unevaluated and
// unexamined, matching Lua's short-circuit evaluation exactly -- if `right`
// has side effects, they only ever ran when Lua would have run them too.
function foldLogical(left: Expr, right: Expr, op: "and" | "or"): Expr | undefined {
  const truthy = literalTruthiness(left);
  if (truthy === undefined) return undefined;
  if (op === "and") return truthy ? right : left;
  return truthy ? left : right;
}

// String literal `..` concatenation, done by splicing RAW token text
// (never decoding escapes): each operand's raw content between its quotes
// is copied verbatim into a new string with the same quote character.
// Since both operands already lexed successfully, any backslash in their
// raw content is definitely the start of a complete, self-contained escape
// pair (scanQuoted's escape-skip logic guarantees this) -- concatenation
// can't merge two fragments into a NEW escape sequence at the boundary.
// Restricted to matching plain-quote strings (not long-bracket `[[...]]`,
// not mismatched quote characters) to avoid needing any re-escaping logic.
function foldConcat(left: Expr, right: Expr): Expr | undefined {
  if (left.type !== "StringExpr" || right.type !== "StringExpr") return undefined;
  const quote = left.raw[0];
  if ((quote !== "'" && quote !== '"') || right.raw[0] !== quote) return undefined;
  const leftInner = left.raw.slice(1, -1);
  const rightInner = right.raw.slice(1, -1);
  return { type: "StringExpr", raw: `${quote}${leftInner}${rightInner}${quote}` };
}

// Returns the AST node that printing-then-reparsing this value would
// actually produce -- never a NumberExpr with a sign baked into `raw`
// (the lexer can't scan a leading "-" as part of a number token, so that
// would silently become a mismatched UnaryExpr on reparse and get
// rejected by compress-aggressive's self-validation).
function foldToNumberNode(value: number): Expr | undefined {
  if (!Number.isFinite(value)) return undefined; // no literal syntax for inf/nan
  if (Object.is(value, -0)) return undefined; // avoid losing the sign of zero
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
    case "NumberExpr":
    case "StringExpr":
    case "Identifier":
      return expr;
    case "InterpolatedStringExpr":
      expr.parts = expr.parts.map((part) => (typeof part === "string" ? part : foldExpr(part)));
      return expr;
    case "IndexExpr":
      expr.object = foldExpr(expr.object);
      expr.index = foldExpr(expr.index);
      return expr;
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

function optimizeBlock(stats: Stat[]): Stat[] {
  const kept: Stat[] = [];
  for (const stat of stats) {
    const result = optimizeStat(stat);
    if (result) kept.push(result);
  }
  return kept;
}

function optimizeStat(stat: Stat): Stat | undefined {
  switch (stat.type) {
    case "LocalStat":
      stat.init = stat.init.map(foldExpr);
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
    case "DoStat":
      stat.body = optimizeBlock(stat.body);
      return stat;
    case "WhileStat":
      stat.cond = foldExpr(stat.cond);
      stat.body = optimizeBlock(stat.body);
      return stat;
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
          return { type: "DoStat", body: clause.body };
        }
        if (clause.cond.type === "FalseExpr") {
          if (stat.elseBody) {
            if (!containsLabel(stat.elseBody)) return { type: "DoStat", body: stat.elseBody };
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
