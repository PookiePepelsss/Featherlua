import type { Chunk, Expr, Stat } from "./ast";
import { parseLuauNumber } from "./optimize";

// Opt-in, off-by-default optimization: hoists a repeated `global.field.
// field...` read out of a loop into a local computed once before it. This
// is a real, well-established Lua/Luau performance idiom (caching
// `game:GetService(...)` results, deep field chains, etc.), but unlike
// every other pass in this codebase it rests on ONE assumption that can't
// be verified from source: that the accessed tables have no custom
// `__index` metamethod with a side effect or a non-idempotent result. If
// that assumption doesn't hold for a given script, this pass can change
// behavior. That's why it's opt-in and off by default -- everything else
// here is provably safe from the source text alone; this isn't.
//
// Scoped as narrowly as it usefully can be to keep that one assumption as
// the *only* one:
// - Only `NumericForStat` with literal bounds provably running at least
//   once, or `RepeatStat` (which always runs its body once by definition)
//   -- hoisting eagerly evaluates the chain before the loop even starts,
//   so a loop that might run zero times must never be a candidate (that
//   would introduce a read, and possible error, that never happened).
// - The chain's root name must never appear as a `local` declaration or
//   an assignment target ANYWHERE in the whole program -- if a name is
//   never declared locally and never assigned to, every occurrence of it
//   unambiguously denotes the same stable global, with no scoping
//   ambiguity to reason about.
// - A loop containing ANY function call anywhere in its body (including
//   nested loops/conditionals/closures) is skipped entirely: a call can
//   do anything, including mutating a table reachable from the chain,
//   which would invalidate a value cached before the loop started. This
//   is also what keeps this pass from ever touching a RemoteEvent/
//   RemoteFunction call or its arguments -- those are calls, never chain
//   reads, so they're never examined as hoist candidates and the call
//   itself disqualifies the whole loop from hoisting around it.
// - Only occurrences reached UNCONDITIONALLY (directly in the loop body's
//   statement list, transparent through `do...end`, never inside an `if`
//   or nested loop) count as candidates or get replaced -- anything
//   conditionally reached is left completely untouched, so this can never
//   eagerly evaluate something the original code might have skipped.
// - Chains never include a call or a computed (`[...]`) index -- only a
//   plain `Name.field.field...` spine, depth 1+.
export function hoistRepeatedGlobalAccess(chunk: Chunk): boolean {
  const unsafeNames = collectUnsafeBaseNames(chunk);
  const changedRef = { value: false };
  chunk.body = processBlock(chunk.body, unsafeNames, changedRef);
  return changedRef.value;
}

// === chain identity ===

// A chain is `Identifier` followed by 1+ `.name` MemberExpr steps -- never
// a computed index, never anything containing a call.
function chainKey(expr: Expr): string | undefined {
  if (expr.type !== "MemberExpr") return undefined;
  const parts: string[] = [];
  let cur: Expr = expr;
  while (cur.type === "MemberExpr") {
    parts.unshift(cur.name);
    cur = cur.object;
  }
  if (cur.type !== "Identifier") return undefined;
  return `${cur.name}.${parts.join(".")}`;
}

function chainBaseName(expr: Expr): string | undefined {
  let cur = expr;
  while (cur.type === "MemberExpr") cur = cur.object;
  return cur.type === "Identifier" ? cur.name : undefined;
}

// === whole-program scan: names that can never be trusted as a stable global ===

function collectUnsafeBaseNames(chunk: Chunk): Set<string> {
  const names = new Set<string>();

  function addTargetBase(target: Expr) {
    let cur = target;
    while (cur.type === "MemberExpr" || cur.type === "IndexExpr") cur = cur.object;
    if (cur.type === "Identifier") names.add(cur.name);
  }

  function visitBlock(stats: Stat[]) {
    stats.forEach(visitStat);
  }

  function visitFuncLike(func: { params: { name: string }[]; body: Stat[] }) {
    for (const p of func.params) names.add(p.name);
    visitBlock(func.body);
  }

  function visitStat(stat: Stat) {
    switch (stat.type) {
      case "LocalStat":
        for (const n of stat.names) names.add(n.name);
        stat.init.forEach(visitExpr);
        return;
      case "LocalFunctionStat":
        names.add(stat.name);
        visitFuncLike(stat.func);
        return;
      case "FunctionDeclStat":
        visitExpr(stat.target.base);
        visitFuncLike(stat.func);
        return;
      case "AssignStat":
        stat.targets.forEach(addTargetBase);
        stat.targets.forEach(visitExpr);
        stat.values.forEach(visitExpr);
        return;
      case "CompoundAssignStat":
        addTargetBase(stat.target);
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
        names.add(stat.varName);
        visitExpr(stat.start);
        visitExpr(stat.stop);
        if (stat.step) visitExpr(stat.step);
        visitBlock(stat.body);
        return;
      case "GenericForStat":
        for (const n of stat.names) names.add(n);
        stat.exprs.forEach(visitExpr);
        visitBlock(stat.body);
        return;
      case "ReturnStat":
        stat.args.forEach(visitExpr);
        return;
      default:
        return;
    }
  }

  function visitExpr(expr: Expr) {
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
        for (const part of expr.parts) if (typeof part !== "string") visitExpr(part);
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
        visitFuncLike(expr);
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

  visitBlock(chunk.body);
  return names;
}

// === does any part of this zone contain a call? (full recursion, including
// nested loops/conditionals/closures -- any call anywhere disqualifies) ===

function zoneContainsCall(stats: Stat[]): boolean {
  for (const stat of stats) {
    if (statContainsCall(stat)) return true;
  }
  return false;
}

function statContainsCall(stat: Stat): boolean {
  switch (stat.type) {
    case "LocalStat":
      return stat.init.some(exprContainsCall);
    case "LocalFunctionStat":
      return zoneContainsCall(stat.func.body);
    case "FunctionDeclStat":
      return exprContainsCall(stat.target.base) || zoneContainsCall(stat.func.body);
    case "AssignStat":
      return stat.targets.some(exprContainsCall) || stat.values.some(exprContainsCall);
    case "CompoundAssignStat":
      return exprContainsCall(stat.target) || exprContainsCall(stat.value);
    case "CallStat":
      return true;
    case "DoStat":
      return zoneContainsCall(stat.body);
    case "WhileStat":
      return exprContainsCall(stat.cond) || zoneContainsCall(stat.body);
    case "RepeatStat":
      return zoneContainsCall(stat.body) || exprContainsCall(stat.cond);
    case "IfStat":
      return (
        stat.clauses.some((c) => exprContainsCall(c.cond) || zoneContainsCall(c.body)) ||
        (stat.elseBody ? zoneContainsCall(stat.elseBody) : false)
      );
    case "NumericForStat":
      return (
        exprContainsCall(stat.start) ||
        exprContainsCall(stat.stop) ||
        (stat.step ? exprContainsCall(stat.step) : false) ||
        zoneContainsCall(stat.body)
      );
    case "GenericForStat":
      return stat.exprs.some(exprContainsCall) || zoneContainsCall(stat.body);
    case "ReturnStat":
      return stat.args.some(exprContainsCall);
    default:
      return false;
  }
}

function exprContainsCall(expr: Expr): boolean {
  switch (expr.type) {
    case "CallExpr":
    case "MethodCallExpr":
      return true;
    case "NilExpr":
    case "TrueExpr":
    case "FalseExpr":
    case "VarargExpr":
    case "NumberExpr":
    case "StringExpr":
    case "Identifier":
      return false;
    case "InterpolatedStringExpr":
      return expr.parts.some((p) => typeof p !== "string" && exprContainsCall(p));
    case "IndexExpr":
      return exprContainsCall(expr.object) || exprContainsCall(expr.index);
    case "MemberExpr":
      return exprContainsCall(expr.object);
    case "FunctionExpr":
      return zoneContainsCall(expr.body);
    case "TableExpr":
      return expr.fields.some((f) => (f.kind === "computed" && exprContainsCall(f.key)) || exprContainsCall(f.value));
    case "BinaryExpr":
      return exprContainsCall(expr.left) || exprContainsCall(expr.right);
    case "UnaryExpr":
      return exprContainsCall(expr.operand);
    case "TypeAssertionExpr":
      return exprContainsCall(expr.expr);
    case "IfExpr":
      return (
        exprContainsCall(expr.cond) ||
        exprContainsCall(expr.thenExpr) ||
        expr.elseifs.some((c) => exprContainsCall(c.cond) || exprContainsCall(c.expr)) ||
        exprContainsCall(expr.elseExpr)
      );
    case "ParenExpr":
      return exprContainsCall(expr.expr);
  }
}

// === is a NumericForStat/RepeatStat provably going to run its body at
// least once? (hoisting must never introduce an evaluation that the
// original zero-iteration loop would never have reached) ===

function numericForRunsAtLeastOnce(stat: Extract<Stat, { type: "NumericForStat" }>): boolean {
  const start = stat.start.type === "NumberExpr" ? parseLuauNumber(stat.start.raw) : undefined;
  const stop = stat.stop.type === "NumberExpr" ? parseLuauNumber(stat.stop.raw) : undefined;
  if (start === undefined || stop === undefined) return false;
  const step = stat.step
    ? stat.step.type === "NumberExpr"
      ? parseLuauNumber(stat.step.raw)
      : undefined
    : 1;
  if (step === undefined || step === 0) return false;
  return step > 0 ? start <= stop : start >= stop;
}

// === hoisting itself ===

let hoistCounter = 0;

// Only walks the UNCONDITIONAL top level of the loop body (transparent
// through `do...end`; stops at `if`/nested loops/closures) -- both for
// deciding what's safe to hoist and for replacing occurrences. Anything
// reached conditionally is left completely alone.
function tryHoist(loopBody: Stat[], unsafeNames: Set<string>): Stat[] {
  if (zoneContainsCall(loopBody)) return [];

  const counts = new Map<string, number>();
  const templatesByKey = new Map<string, Expr>();
  countTopLevel(loopBody, counts);

  const hoistNames = new Map<string, string>();
  for (const [key, count] of counts) {
    if (count < 2) continue;
    const base = key.slice(0, key.indexOf("."));
    if (unsafeNames.has(base)) continue;
    hoistCounter += 1;
    hoistNames.set(key, `__hoist${hoistCounter}`);
  }
  if (hoistNames.size === 0) return [];

  replaceTopLevel(loopBody, hoistNames);

  const newLocals: Stat[] = [];
  for (const [key, name] of hoistNames) {
    const init = templatesByKey.get(key);
    if (!init) continue;
    newLocals.push({ type: "LocalStat", names: [{ name }], init: [init] });
  }
  return newLocals;

  function countTopLevel(stats: Stat[], out: Map<string, number>) {
    for (const stat of stats) countStatTopLevel(stat, out);
  }

  function countStatTopLevel(stat: Stat, out: Map<string, number>) {
    switch (stat.type) {
      case "LocalStat":
        stat.init.forEach((e) => countExprTopLevel(e, out));
        return;
      case "AssignStat":
        stat.values.forEach((e) => countExprTopLevel(e, out));
        return;
      case "CompoundAssignStat":
        countExprTopLevel(stat.value, out);
        return;
      case "DoStat":
        countTopLevel(stat.body, out);
        return;
      case "NumericForStat":
        countExprTopLevel(stat.start, out);
        countExprTopLevel(stat.stop, out);
        if (stat.step) countExprTopLevel(stat.step, out);
        return;
      case "GenericForStat":
        stat.exprs.forEach((e) => countExprTopLevel(e, out));
        return;
      case "ReturnStat":
        stat.args.forEach((e) => countExprTopLevel(e, out));
        return;
      default:
        return; // if/while/repeat/nested-for/function bodies: conditional or a new zone, not counted
    }
  }

  function countExprTopLevel(expr: Expr, out: Map<string, number>) {
    const key = chainKey(expr);
    if (key) {
      out.set(key, (out.get(key) ?? 0) + 1);
      if (!templatesByKey.has(key)) templatesByKey.set(key, expr);
      return;
    }
    switch (expr.type) {
      case "IndexExpr":
        countExprTopLevel(expr.object, out);
        countExprTopLevel(expr.index, out);
        return;
      case "TableExpr":
        for (const f of expr.fields) {
          if (f.kind === "computed") countExprTopLevel(f.key, out);
          countExprTopLevel(f.value, out);
        }
        return;
      case "BinaryExpr":
        countExprTopLevel(expr.left, out);
        countExprTopLevel(expr.right, out);
        return;
      case "UnaryExpr":
        countExprTopLevel(expr.operand, out);
        return;
      case "TypeAssertionExpr":
        countExprTopLevel(expr.expr, out);
        return;
      case "ParenExpr":
        countExprTopLevel(expr.expr, out);
        return;
      case "InterpolatedStringExpr":
        for (const p of expr.parts) if (typeof p !== "string") countExprTopLevel(p, out);
        return;
      default:
        return; // calls, closures, if-expressions: not descended into here
    }
  }

  function replaceTopLevel(stats: Stat[], names: Map<string, string>) {
    for (const stat of stats) replaceStatTopLevel(stat, names);
  }

  function replaceStatTopLevel(stat: Stat, names: Map<string, string>) {
    const sub = (e: Expr) => replaceExprTopLevel(e, names);
    switch (stat.type) {
      case "LocalStat":
        stat.init = stat.init.map(sub);
        return;
      case "AssignStat":
        stat.values = stat.values.map(sub);
        return;
      case "CompoundAssignStat":
        stat.value = sub(stat.value);
        return;
      case "DoStat":
        replaceTopLevel(stat.body, names);
        return;
      case "NumericForStat":
        stat.start = sub(stat.start);
        stat.stop = sub(stat.stop);
        if (stat.step) stat.step = sub(stat.step);
        return;
      case "GenericForStat":
        stat.exprs = stat.exprs.map(sub);
        return;
      case "ReturnStat":
        stat.args = stat.args.map(sub);
        return;
      default:
        return;
    }
  }

  function replaceExprTopLevel(expr: Expr, names: Map<string, string>): Expr {
    const key = chainKey(expr);
    if (key) {
      const name = names.get(key);
      return name ? { type: "Identifier", name } : expr;
    }
    switch (expr.type) {
      case "IndexExpr":
        expr.object = replaceExprTopLevel(expr.object, names);
        expr.index = replaceExprTopLevel(expr.index, names);
        return expr;
      case "TableExpr":
        for (const f of expr.fields) {
          if (f.kind === "computed") f.key = replaceExprTopLevel(f.key, names);
          f.value = replaceExprTopLevel(f.value, names);
        }
        return expr;
      case "BinaryExpr":
        expr.left = replaceExprTopLevel(expr.left, names);
        expr.right = replaceExprTopLevel(expr.right, names);
        return expr;
      case "UnaryExpr":
        expr.operand = replaceExprTopLevel(expr.operand, names);
        return expr;
      case "TypeAssertionExpr":
        expr.expr = replaceExprTopLevel(expr.expr, names);
        return expr;
      case "ParenExpr":
        expr.expr = replaceExprTopLevel(expr.expr, names);
        return expr;
      case "InterpolatedStringExpr":
        expr.parts = expr.parts.map((p) => (typeof p === "string" ? p : replaceExprTopLevel(p, names)));
        return expr;
      default:
        return expr;
    }
  }
}

// === driver: walk every block, hoisting for eligible loops, recursing
// into every nested block (including expression-nested function bodies)
// to find more ===

function processBlock(stats: Stat[], unsafeNames: Set<string>, changedRef: { value: boolean }): Stat[] {
  const result: Stat[] = [];
  for (const stat of stats) {
    if (stat.type === "NumericForStat" && numericForRunsAtLeastOnce(stat)) {
      const newLocals = tryHoist(stat.body, unsafeNames);
      if (newLocals.length > 0) {
        result.push(...newLocals);
        changedRef.value = true;
      }
    } else if (stat.type === "RepeatStat") {
      const newLocals = tryHoist(stat.body, unsafeNames);
      if (newLocals.length > 0) {
        result.push(...newLocals);
        changedRef.value = true;
      }
    }
    result.push(processStatChildren(stat, unsafeNames, changedRef));
  }
  return result;
}

function processStatChildren(stat: Stat, unsafeNames: Set<string>, changedRef: { value: boolean }): Stat {
  const sub = (e: Expr) => processExprChildren(e, unsafeNames, changedRef);
  switch (stat.type) {
    case "LocalStat":
      stat.init = stat.init.map(sub);
      return stat;
    case "LocalFunctionStat":
      stat.func.body = processBlock(stat.func.body, unsafeNames, changedRef);
      return stat;
    case "FunctionDeclStat":
      stat.target.base = sub(stat.target.base);
      stat.func.body = processBlock(stat.func.body, unsafeNames, changedRef);
      return stat;
    case "AssignStat":
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
      stat.body = processBlock(stat.body, unsafeNames, changedRef);
      return stat;
    case "WhileStat":
      stat.cond = sub(stat.cond);
      stat.body = processBlock(stat.body, unsafeNames, changedRef);
      return stat;
    case "RepeatStat":
      stat.body = processBlock(stat.body, unsafeNames, changedRef);
      stat.cond = sub(stat.cond);
      return stat;
    case "IfStat":
      for (const clause of stat.clauses) {
        clause.cond = sub(clause.cond);
        clause.body = processBlock(clause.body, unsafeNames, changedRef);
      }
      if (stat.elseBody) stat.elseBody = processBlock(stat.elseBody, unsafeNames, changedRef);
      return stat;
    case "NumericForStat":
      stat.start = sub(stat.start);
      stat.stop = sub(stat.stop);
      if (stat.step) stat.step = sub(stat.step);
      stat.body = processBlock(stat.body, unsafeNames, changedRef);
      return stat;
    case "GenericForStat":
      stat.exprs = stat.exprs.map(sub);
      stat.body = processBlock(stat.body, unsafeNames, changedRef);
      return stat;
    case "ReturnStat":
      stat.args = stat.args.map(sub);
      return stat;
    default:
      return stat;
  }
}

function processExprChildren(expr: Expr, unsafeNames: Set<string>, changedRef: { value: boolean }): Expr {
  const sub = (e: Expr) => processExprChildren(e, unsafeNames, changedRef);
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
      expr.parts = expr.parts.map((p) => (typeof p === "string" ? p : sub(p)));
      return expr;
    case "IndexExpr":
      expr.object = sub(expr.object);
      expr.index = sub(expr.index);
      return expr;
    case "MemberExpr":
      expr.object = sub(expr.object);
      return expr;
    case "CallExpr":
      expr.callee = sub(expr.callee);
      expr.args = expr.args.map(sub);
      return expr;
    case "MethodCallExpr":
      expr.object = sub(expr.object);
      expr.args = expr.args.map(sub);
      return expr;
    case "FunctionExpr":
      expr.body = processBlock(expr.body, unsafeNames, changedRef);
      return expr;
    case "TableExpr":
      for (const f of expr.fields) {
        if (f.kind === "computed") f.key = sub(f.key);
        f.value = sub(f.value);
      }
      return expr;
    case "BinaryExpr":
      expr.left = sub(expr.left);
      expr.right = sub(expr.right);
      return expr;
    case "UnaryExpr":
      expr.operand = sub(expr.operand);
      return expr;
    case "TypeAssertionExpr":
      expr.expr = sub(expr.expr);
      return expr;
    case "IfExpr":
      expr.cond = sub(expr.cond);
      expr.thenExpr = sub(expr.thenExpr);
      for (const clause of expr.elseifs) {
        clause.cond = sub(clause.cond);
        clause.expr = sub(clause.expr);
      }
      expr.elseExpr = sub(expr.elseExpr);
      return expr;
    case "ParenExpr":
      expr.expr = sub(expr.expr);
      return expr;
  }
}
