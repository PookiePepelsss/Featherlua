import type { Chunk, CompoundAssignStat, DoStat, Expr, Stat } from "./ast";
import { KEYWORDS } from "./tokens";

// Luau reads hex and binary literals into a 64-bit unsigned integer, which
// saturates rather than growing: every literal past 2^64-1 becomes 2^64-1
// and converts to the same double. Computing the exact mathematical value
// instead would fold `0xDEADBEEFDEADBEEFDEADBEEF` to a number the runtime
// never produces.
const UINT64_SATURATED = Math.pow(2, 64);

function saturatingInteger(digits: string, radix: number, maxDigits: number): number {
  const significant = digits.replace(/^0+/, "");
  return significant.length > maxDigits ? UINT64_SATURATED : parseInt(digits, radix);
}

export function parseLuauNumber(raw: string): number | undefined {
  const clean = raw.replace(/_/g, "");
  const hex = /^0[xX]([0-9a-fA-F]*)(?:\.([0-9a-fA-F]*))?(?:[pP]([+-]?[0-9]+))?$/.exec(clean);
  if (hex) {
    const [, intPart, fracPart, expPart] = hex;
    if (!intPart && !fracPart) return undefined;
    if (!fracPart && !expPart) return saturatingInteger(intPart, 16, 16);
    let mantissa = intPart ? parseInt(intPart, 16) : 0;
    if (fracPart) mantissa += parseInt(fracPart, 16) / Math.pow(16, fracPart.length);
    const exp = expPart ? parseInt(expPart, 10) : 0;
    return mantissa * Math.pow(2, exp);
  }
  if (/^0[bB]/.test(clean)) {
    const digits = clean.slice(2);
    if (!/^[01]+$/.test(digits)) return undefined;
    return saturatingInteger(digits, 2, 64);
  }
  if (!/^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(clean)) return undefined;
  return parseFloat(clean);
}

// `String` only reaches for exponent notation past 1e21, so it spells
// 1000000 in full where `1e6` is four characters shorter. `toExponential()`
// with no argument emits exactly the digits needed to identify the double,
// so both spellings parse back to the same value and the shorter one wins.
function formatLuauNumber(n: number): string {
  // Lua reads `.5` as happily as `0.5`, and Roblox code is full of them.
  const plain = String(n).replace(/^0\./, ".");
  if (!Number.isFinite(n)) return String(n);
  const exponential = n.toExponential().replace("e+", "e");
  return exponential.length < plain.length ? exponential : plain;
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


// Splits a quoted literal's body into pieces, keeping every escape verbatim
// except `\"` and `'`, which are unescaped so the delimiter choice below
// can re-escape only the one it actually needs. Returns undefined for
// anything it cannot account for exactly, so the literal is left alone.
function stringPieces(body: string): string[] | undefined {
  const pieces: string[] = [];
  let i = 0;
  while (i < body.length) {
    const ch = body[i];
    if (ch !== "\\") {
      pieces.push(ch);
      i += 1;
      continue;
    }
    const next = body[i + 1];
    if (next === undefined) return undefined;
    if (next === '"' || next === "'") {
      pieces.push(next);
      i += 2;
      continue;
    }
    if (next === "x") {
      pieces.push(body.slice(i, i + 4));
      i += 4;
      continue;
    }
    if (next === "u" && body[i + 2] === "{") {
      const close = body.indexOf("}", i + 3);
      if (close === -1) return undefined;
      pieces.push(body.slice(i, close + 1));
      i = close + 1;
      continue;
    }
    if (/[0-9]/.test(next)) {
      let digits = 1;
      while (digits < 3 && /[0-9]/.test(body[i + 1 + digits] ?? "")) digits += 1;
      pieces.push(body.slice(i, i + 1 + digits));
      i += 1 + digits;
      continue;
    }
    if (next === "z") {
      let end = i + 2;
      while (/\s/u.test(body[end] ?? "")) end += 1;
      pieces.push(body.slice(i, end));
      i = end;
      continue;
    }
    pieces.push(body.slice(i, i + 2));
    i += 2;
  }
  return pieces;
}

// Picks whichever delimiter needs fewer escapes. `'it's'` and `"it's"` hold
// the same bytes; the second is two characters shorter.
function canonicalizeString(raw: string): string {
  const quote = raw[0];
  if (quote !== '"' && quote !== "'") return raw;
  const pieces = stringPieces(raw.slice(1, -1));
  if (!pieces) return raw;

  let best = raw;
  for (const delimiter of ['"', "'"]) {
    const body = pieces
      .map((piece) => (piece === delimiter ? "\\" + delimiter : piece))
      .join("");
    const candidate = `${delimiter}${body}${delimiter}`;
    if (candidate.length < best.length) best = candidate;
  }
  return best;
}


// `not (a == b)` and `a ~= b` are the same operation in Lua, `~=` being
// defined as the negation of `==` including the `__eq` metamethod. Only the
// two equality operators qualify: `not (a < b)` is not `a >= b` once NaN or
// a `__lt` metamethod is involved.
function foldNegatedComparison(expr: Expr): Expr | undefined {
  if (expr.type !== "UnaryExpr" || expr.operator !== "not") return undefined;
  const inner = expr.operand.type === "ParenExpr" ? expr.operand.expr : expr.operand;
  if (inner.type !== "BinaryExpr") return undefined;
  if (inner.operator !== "==" && inner.operator !== "~=") return undefined;
  return { ...inner, operator: inner.operator === "==" ? "~=" : "==" };
}

// `a = a + 1` is `a += 1` with two characters fewer. The target has to be
// re-readable without side effects, so only a plain local/global or a chain
// of member accesses on one qualifies: rewriting `t[f()].n = t[f()].n + 1`
// would drop a call, and an index expression could run `__index` a
// different number of times.
function stableAssignTarget(expr: Expr): string | undefined {
  if (expr.type === "Identifier") return expr.symbolId !== undefined ? `s${expr.symbolId}` : `g:${expr.name}`;
  if (expr.type === "MemberExpr") {
    const base = stableAssignTarget(expr.object);
    return base === undefined ? undefined : `${base}.${expr.name}`;
  }
  return undefined;
}

const COMPOUNDABLE = new Set(["+", "-", "*", "/", "//", "%", "^", ".."]);

function toCompoundAssign(stat: Stat): Stat | undefined {
  if (stat.type !== "AssignStat" || stat.targets.length !== 1 || stat.values.length !== 1) return undefined;
  const target = stat.targets[0];
  const value = stat.values[0];
  if (value.type !== "BinaryExpr" || !COMPOUNDABLE.has(value.operator)) return undefined;
  // Only the left operand may be folded away: `a = 1 - a` is not `a -= 1`,
  // and even for commutative operators a metamethod can tell the operands
  // apart.
  const targetId = stableAssignTarget(target);
  if (targetId === undefined || stableAssignTarget(value.left) !== targetId) return undefined;
  return {
    type: "CompoundAssignStat",
    operator: `${value.operator}=` as CompoundAssignStat["operator"],
    target,
    value: value.right,
  };
}

// `[[abc]]` and `"abc"` hold the same bytes and the quoted form is two
// characters shorter. Long brackets process no escapes at all, so this only
// applies when nothing inside would need one: no backslash, no line break,
// and at least one delimiter not occurring in the body.
function longBracketToQuoted(raw: string): string | undefined {
  const opener = /^\[(=*)\[/.exec(raw);
  if (!opener) return undefined;
  const body = raw.slice(opener[0].length, raw.length - opener[0].length);
  if (body.includes("\\") || /[\r\n]/.test(body)) return undefined;
  for (const delimiter of ['"', "'"]) {
    if (body.includes(delimiter)) continue;
    const candidate = `${delimiter}${body}${delimiter}`;
    if (candidate.length < raw.length) return candidate;
  }
  return undefined;
}

// `if c then return a else return b end` says the same as
// `return if c then a else b` in a good deal less space. Every arm has to
// return exactly one value, and that value must not be multi-valued:
// `return f()` passes every result through, where an if-expression would
// truncate it to one.
function singleReturnedValue(body: Stat[]): Expr | undefined {
  if (body.length !== 1) return undefined;
  const only = body[0];
  if (only.type !== "ReturnStat" || only.args.length !== 1) return undefined;
  const value = only.args[0];
  const multiValued = value.type === "CallExpr" || value.type === "MethodCallExpr" || value.type === "VarargExpr";
  return multiValued ? undefined : value;
}

function ifStatToReturn(stat: Stat): Stat | undefined {
  // Without an else arm, falling through returns nothing at all, which is
  // not the same as returning the nil an if-expression would produce.
  if (stat.type !== "IfStat" || !stat.elseBody) return undefined;
  const elseExpr = singleReturnedValue(stat.elseBody);
  if (!elseExpr) return undefined;

  const arms: { cond: Expr; expr: Expr }[] = [];
  for (const clause of stat.clauses) {
    const expr = singleReturnedValue(clause.body);
    if (!expr) return undefined;
    arms.push({ cond: clause.cond, expr });
  }
  if (!arms.length) return undefined;

  const [first, ...rest] = arms;
  return {
    type: "ReturnStat",
    args: [{
      type: "IfExpr",
      cond: first.cond,
      thenExpr: first.expr,
      elseifs: rest,
      elseExpr,
    }],
  };
}

// A bare `return` at the end of a function body does exactly what falling
// off the end does. Only a value-less one qualifies, and only in last
// position, where nothing follows for it to have been skipping.
function dropTrailingReturn(body: Stat[]): Stat[] {
  const last = body[body.length - 1];
  if (last?.type === "ReturnStat" && last.args.length === 0) return body.slice(0, -1);
  return body;
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

// Luau's `%` is not C's fmod, which is what JS `%` gives: `luai_nummod` is
// `a - floor(a/b)*b`, and the two part company once the division rounds.
// The runtime prints `1e300 % 7` as 0 where fmod says 1, so this has to be
// spelled the way Luau spells it.
function luaModulo(a: number, b: number): number {
  return a - Math.floor(a / b) * b;
}

// `^` is `pow`, which no libm is required to round correctly, so folding it
// in general would mean trusting two implementations to agree. Restricting
// it to an integer base and a small non-negative integer exponent, and
// insisting the result land on a safe integer, keeps it to the range where
// the true value is exactly representable and every implementation returns
// it. Luau's own compiler folds these at bytecode level anyway, so the
// output is what it would have computed regardless.
function exactIntegerPow(a: number, b: number): number | undefined {
  if (!Number.isSafeInteger(a) || !Number.isInteger(b) || b < 0 || b > 64) return undefined;
  let result = 1;
  for (let i = 0; i < b; i += 1) {
    result *= a;
    if (!Number.isSafeInteger(result)) return undefined;
  }
  return result;
}

function foldArithmetic(operator: string, a: number, b: number): number | undefined {
  switch (operator) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return a / b;
    case "%":
      return b === 0 ? undefined : luaModulo(a, b);
    case "//":
      return b === 0 ? undefined : Math.floor(a / b);
    case "^":
      return exactIntegerPow(a, b);
    default:
      return undefined;
  }
}

const FOLDABLE_BINOPS = new Set(["+", "-", "*", "/", "%", "//", "^"]);

function foldExpr(expr: Expr): Expr {
  switch (expr.type) {
    case "NilExpr":
    case "TrueExpr":
    case "FalseExpr":
    case "VarargExpr":
    case "Identifier":
      return expr;
    case "StringExpr":
      expr.raw = longBracketToQuoted(expr.raw) ?? canonicalizeString(expr.raw);
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
      expr.body = dropTrailingReturn(optimizeBlock(expr.body));
      return expr;
    case "TableExpr":
      expr.fields = expr.fields.map((field) => {
        const value = foldExpr(field.value);
        if (field.kind !== "computed") return { ...field, value };
        const key = foldExpr(field.key);
        if (key.type === "StringExpr") {
          const name = stringIndexToFieldName(key.raw);
          if (name) return { kind: "named" as const, name, value };
        }
        return { kind: "computed" as const, key, value };
      });
      return expr;
    case "UnaryExpr": {
      const negated = foldNegatedComparison(expr);
      if (negated) return foldExpr(negated);
      expr.operand = foldExpr(expr.operand);
      if (expr.operator === "-") {
        // `-(-5)` reaches here as a negation of the negation folding already
        // produced, and the pair cancels. Zero is left alone: negating it
        // twice is how you write -0, and that is a value of its own.
        const inner = expr.operand.type === "ParenExpr" ? expr.operand.expr : expr.operand;
        if (inner.type === "UnaryExpr" && inner.operator === "-") {
          const value = asNumberLiteral(inner.operand);
          if (value !== undefined && value !== 0) return inner.operand;
        }
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
          const result = foldArithmetic(expr.operator, a, b);
          const folded = result === undefined ? undefined : foldToNumberNode(result);
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
    // A do-block whose body ends in a terminator terminates the parent too:
    // nothing after it can run, so the rest of the block goes and the
    // wrapper is free to inline as the new last statement.
    const rest = stats.slice(i + 1);
    const reachable = hasTopLevelLabel(rest);
    const terminates =
      isTerminator(result) || (result.type === "DoStat" && endsInTerminator(result.body));
    if (result.type === "DoStat" && canInlineDoBlock(result, i === stats.length - 1 || (terminates && !reachable))) {
      kept.push(...result.body);
    } else {
      kept.push(result);
    }
    if (terminates && !reachable) break;
  }
  return kept;
}

// A `do ... end` exists only to bound a scope, so one that declares nothing
// is six characters of nothing. Most of these are left behind by branch
// elimination (`if true then f() end` becomes `do f() end`) rather than
// written by hand.
function canInlineDoBlock(stat: DoStat, isLastInParent: boolean): boolean {
  if (declaresNames(stat.body) || containsLabel(stat.body)) return false;
  const last = stat.body[stat.body.length - 1];
  // `return`, `break` and `continue` each have to end their block, so one
  // lifted into the middle of the parent would not parse.
  if (last && isTerminator(last) && !isLastInParent) return false;
  return true;
}

function endsInTerminator(stats: Stat[]): boolean {
  const last = stats[stats.length - 1];
  return last !== undefined && isTerminator(last);
}

function declaresNames(stats: Stat[]): boolean {
  return stats.some(
    (stat) =>
      stat.type === "LocalStat" ||
      stat.type === "LocalFunctionStat" ||
      stat.type === "TypeAliasStat",
  );
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
      stat.func.body = dropTrailingReturn(optimizeBlock(stat.func.body));
      return stat;
    case "FunctionDeclStat":
      stat.target.base = foldExpr(stat.target.base);
      stat.func.body = dropTrailingReturn(optimizeBlock(stat.func.body));
      return stat;
    case "AssignStat": {
      stat.targets = stat.targets.map((t) => foldExpr(t) as typeof t);
      stat.values = stat.values.map(foldExpr);
      return toCompoundAssign(stat) ?? stat;
    }
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

      // A clause whose condition is known cannot be reached past: one that
      // is always false never runs, and one that is always true means no
      // later clause can. Trimming both before the single-clause rules
      // below lets an elseif chain collapse the same way a lone `if` does.
      // A label anywhere in a discarded body could be the target of a goto
      // elsewhere, so those are left where they are.
      const trimmed: typeof stat.clauses = [];
      let decided = false;
      for (const clause of stat.clauses) {
        if (clause.cond.type === "FalseExpr" && !containsLabel(clause.body)) continue;
        trimmed.push(clause);
        if (clause.cond.type === "TrueExpr") {
          decided = true;
          break;
        }
      }
      if (decided) {
        const dropped = stat.clauses.slice(stat.clauses.indexOf(trimmed[trimmed.length - 1]) + 1);
        const strandsLabel = dropped.some((c) => containsLabel(c.body)) ||
          (stat.elseBody !== undefined && containsLabel(stat.elseBody));
        if (!strandsLabel) stat.elseBody = undefined;
        else decided = false;
      }
      if (trimmed.length !== stat.clauses.length || decided) {
        if (!trimmed.length) {
          if (stat.elseBody && !containsLabel(stat.elseBody)) {
            return stat.elseBody.length === 0 ? undefined : { type: "DoStat", body: stat.elseBody };
          }
          if (!stat.elseBody) return undefined;
        } else {
          stat.clauses = trimmed;
        }
      }

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
      return ifStatToReturn(stat) ?? stat;
    }
    case "NumericForStat":
      stat.start = foldExpr(stat.start);
      stat.stop = foldExpr(stat.stop);
      if (stat.step) stat.step = foldExpr(stat.step);
      // A step of 1 is the default, so spelling it out costs two characters
      // and says nothing.
      if (stat.step?.type === "NumberExpr" && parseLuauNumber(stat.step.raw) === 1) stat.step = undefined;
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
