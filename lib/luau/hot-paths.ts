import type { Chunk, Expr, Stat } from "./ast";

// Suggestions, never rewrites. Everything here is a transform that would
// genuinely speed a script up and that a compressor must not perform on
// its own: hoisting a read out of a loop is only correct if the value does
// not change, and on Roblox the loop usually exists precisely because it
// does. The author knows which; nothing here can. So the line is reported
// and the decision is left where it belongs.
//
// Each gain was measured against the Luau runtime, see
// __tests__/runtime-shapes.test.ts.

export interface HotPath {
  /** Line the loop opens on. */
  line: number;
  /** Short name of the pattern, for grouping. */
  kind: "loop-concat" | "repeated-field" | "length-in-condition";
  /** What was found and what to do about it, in one sentence. */
  message: string;
}

/** Renders a member/index chain as a stable key, or undefined if it is not one. */
function chainKey(expr: Expr): string | undefined {
  switch (expr.type) {
    case "Identifier":
      return expr.symbolId !== undefined ? `s${expr.symbolId}` : `g:${expr.name}`;
    case "MemberExpr": {
      const base = chainKey(expr.object);
      return base === undefined ? undefined : `${base}.${expr.name}`;
    }
    default:
      // An index by anything but a name could read differently each time,
      // and a call in the chain is not a read at all.
      return undefined;
  }
}

function chainDepth(key: string): number {
  return key.split(".").length - 1;
}

/**
 * The chain as the author wrote it. The key above identifies a local by
 * symbol so two different `cfg`s never merge, which makes it useless to
 * show; this is what goes in the message.
 */
function chainText(expr: Expr): string | undefined {
  switch (expr.type) {
    case "Identifier":
      return expr.name;
    case "MemberExpr": {
      const base = chainText(expr.object);
      return base === undefined ? undefined : `${base}.${expr.name}`;
    }
    default:
      return undefined;
  }
}

/**
 * The nameable thing a target hangs off, whatever the path down to it.
 * `t[i].x = v` names no chain, because the index could be anything, but it
 * still writes to `t`, and treating the whole of `t` as written is the
 * conservative reading.
 */
function baseKey(expr: Expr): string | undefined {
  switch (expr.type) {
    case "Identifier":
      return chainKey(expr);
    case "MemberExpr":
    case "IndexExpr":
      return baseKey(expr.object);
    default:
      return undefined;
  }
}

function noteAssigned(target: Expr, into: Set<string>): void {
  const key = chainKey(target);
  if (key) {
    into.add(key);
    for (const prefix of prefixes(key)) into.add(prefix);
  }
  const base = baseKey(target);
  if (base) into.add(base);
}

/** Every name a statement or expression assigns to, as chain keys. */
function collectAssigned(stats: Stat[], into: Set<string>): void {
  for (const stat of stats) {
    switch (stat.type) {
      case "AssignStat":
        for (const target of stat.targets) noteAssigned(target, into);
        break;
      case "CompoundAssignStat":
        noteAssigned(stat.target, into);
        break;
      case "LocalStat":
        for (const name of stat.names) if (name.symbolId !== undefined) into.add(`s${name.symbolId}`);
        break;
      case "LocalFunctionStat":
        if (stat.symbolId !== undefined) into.add(`s${stat.symbolId}`);
        collectAssigned(stat.func.body, into);
        break;
      case "FunctionDeclStat":
        collectAssigned(stat.func.body, into);
        break;
      case "DoStat":
      case "WhileStat":
      case "RepeatStat":
      case "NumericForStat":
      case "GenericForStat":
        collectAssigned(stat.body, into);
        break;
      case "IfStat":
        for (const clause of stat.clauses) collectAssigned(clause.body, into);
        if (stat.elseBody) collectAssigned(stat.elseBody, into);
        break;
      default:
        break;
    }
  }
}

function prefixes(key: string): string[] {
  const parts = key.split(".");
  const out: string[] = [];
  for (let i = 1; i < parts.length; i += 1) out.push(parts.slice(0, i).join("."));
  return out;
}

/**
 * A call anywhere in the loop can reach almost anything, so a chain read
 * either side of one is not safely hoistable and is not worth reporting.
 */
function containsCall(stats: Stat[]): boolean {
  let found = false;
  const inExpr = (expr: Expr): void => {
    if (found) return;
    if (expr.type === "CallExpr" || expr.type === "MethodCallExpr") {
      found = true;
      return;
    }
    forEachChild(expr, inExpr);
  };
  walkStats(stats, inExpr, () => undefined);
  return found;
}

function forEachChild(expr: Expr, visit: (child: Expr) => void): void {
  switch (expr.type) {
    case "MemberExpr":
      visit(expr.object);
      return;
    case "IndexExpr":
      visit(expr.object);
      visit(expr.index);
      return;
    case "CallExpr":
      visit(expr.callee);
      expr.args.forEach(visit);
      return;
    case "MethodCallExpr":
      visit(expr.object);
      expr.args.forEach(visit);
      return;
    case "BinaryExpr":
      visit(expr.left);
      visit(expr.right);
      return;
    case "UnaryExpr":
      visit(expr.operand);
      return;
    case "ParenExpr":
    case "TypeAssertionExpr":
      visit(expr.type === "ParenExpr" ? expr.expr : expr.expr);
      return;
    case "TableExpr":
      for (const field of expr.fields) {
        if (field.kind === "computed") visit(field.key);
        visit(field.value);
      }
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
    case "InterpolatedStringExpr":
      for (const part of expr.parts) if (typeof part !== "string") visit(part);
      return;
    case "FunctionExpr":
      return; // a nested closure runs on its own terms
    default:
      return;
  }
}

/** Visits every expression and statement in a block, not entering closures. */
function walkStats(stats: Stat[], onExpr: (e: Expr) => void, onStat: (s: Stat) => void): void {
  const expr = (e: Expr) => {
    onExpr(e);
    forEachChild(e, expr);
  };
  for (const stat of stats) {
    onStat(stat);
    switch (stat.type) {
      case "LocalStat":
        stat.init.forEach(expr);
        break;
      case "AssignStat":
        stat.targets.forEach(expr);
        stat.values.forEach(expr);
        break;
      case "CompoundAssignStat":
        expr(stat.target);
        expr(stat.value);
        break;
      case "CallStat":
        expr(stat.call);
        break;
      case "ReturnStat":
        stat.args.forEach(expr);
        break;
      case "DoStat":
        walkStats(stat.body, onExpr, onStat);
        break;
      case "WhileStat":
        expr(stat.cond);
        walkStats(stat.body, onExpr, onStat);
        break;
      case "RepeatStat":
        walkStats(stat.body, onExpr, onStat);
        expr(stat.cond);
        break;
      case "NumericForStat":
        expr(stat.start);
        expr(stat.stop);
        if (stat.step) expr(stat.step);
        walkStats(stat.body, onExpr, onStat);
        break;
      case "GenericForStat":
        stat.exprs.forEach(expr);
        walkStats(stat.body, onExpr, onStat);
        break;
      case "IfStat":
        for (const clause of stat.clauses) {
          expr(clause.cond);
          walkStats(clause.body, onExpr, onStat);
        }
        if (stat.elseBody) walkStats(stat.elseBody, onExpr, onStat);
        break;
      default:
        break;
    }
  }
}

/**
 * `s = s .. x` inside a loop rebuilds the whole string every iteration, so
 * the cost is quadratic in the result. Collecting the pieces and calling
 * `table.concat` once measured 106x on twenty thousand appends, and it is
 * the largest single win available to a script.
 */
function findLoopConcat(body: Stat[]): boolean {
  let found = false;
  walkStats(body, () => undefined, (stat) => {
    if (found) return;
    if (stat.type === "CompoundAssignStat" && stat.operator === "..=") {
      found = true;
      return;
    }
    if (stat.type !== "AssignStat" || stat.targets.length !== 1 || stat.values.length !== 1) return;
    const target = chainKey(stat.targets[0]);
    if (!target) return;
    const value = stat.values[0];
    if (value.type !== "BinaryExpr" || value.operator !== "..") return;
    // Only when the target is also an operand, which is what makes it
    // accumulate rather than merely assign.
    if (chainKey(value.left) === target || chainKey(value.right) === target) found = true;
  });
  return found;
}

/**
 * A field chain read more than once in a loop, where nothing writes it.
 * Reports whether it hangs off one of the loop's own variables, because
 * that decides where the saving can be taken: a chain rooted at the loop
 * variable is a different thing each time round, so it can only be read
 * once per iteration, not once before the loop.
 */
function findRepeatedChain(body: Stat[], loopVars: Set<string>): { text: string; perIteration: boolean } | undefined {
  if (containsCall(body)) return undefined;
  const assigned = new Set<string>();
  collectAssigned(body, assigned);

  const counts = new Map<string, { count: number; text: string }>();
  walkStats(body, (expr) => {
    if (expr.type !== "MemberExpr") return;
    const key = chainKey(expr);
    if (!key || chainDepth(key) < 2) return;
    const seen = counts.get(key);
    if (seen) seen.count += 1;
    else counts.set(key, { count: 1, text: chainText(expr) ?? key });
  }, () => undefined);

  for (const [key, { count, text }] of counts) {
    if (count < 2 || assigned.has(key)) continue;
    if (prefixes(key).some((prefix) => assigned.has(prefix))) continue;
    return { text, perIteration: loopVars.has(key.split(".")[0]) };
  }
  return undefined;
}

/** The loop's own variables, which take a new value every time round. */
function loopVariables(stat: Stat): Set<string> {
  const out = new Set<string>();
  if (stat.type === "NumericForStat" && stat.symbolId !== undefined) out.add(`s${stat.symbolId}`);
  if (stat.type === "GenericForStat") {
    for (const id of stat.symbolIds ?? []) out.add(`s${id}`);
  }
  return out;
}

/**
 * `while i <= #t do` recounts the length on every test.
 *
 * Deliberately not `repeat ... until`: `repeat wait() until #thing > 0` is
 * how a script waits for something to be populated, and there the whole
 * point is that the length is recomputed. Suggesting a hoist would be
 * telling the author to write an infinite loop. Every hit on a real corpus
 * was of exactly that shape.
 */
function findLengthInCondition(stat: Stat): boolean {
  if (stat.type !== "WhileStat") return false;

  const measured: string[] = [];
  const visit = (expr: Expr) => {
    if (expr.type === "UnaryExpr" && expr.operator === "#") {
      const key = chainKey(expr.operand);
      // An unnameable operand could be anything; say nothing about it.
      if (!key) return;
      measured.push(key);
      return;
    }
    forEachChild(expr, visit);
  };
  visit(stat.cond);
  if (!measured.length) return false;

  // A loop that appends to the very thing it is measuring needs the recount.
  const assigned = new Set<string>();
  collectAssigned(stat.body, assigned);
  return measured.some((key) => !assigned.has(key) && !prefixes(key).some((p) => assigned.has(p)));
}

const LOOPS = new Set(["WhileStat", "RepeatStat", "NumericForStat", "GenericForStat"]);

export function findHotPaths(chunk: Chunk): HotPath[] {
  const found: HotPath[] = [];
  const seen = new Set<string>();

  const visitBlock = (stats: Stat[]): void => {
    for (const stat of stats) {
      if (LOOPS.has(stat.type)) {
        const loop = stat as Extract<Stat, { type: "WhileStat" | "RepeatStat" | "NumericForStat" | "GenericForStat" }>;
        const line = loop.line ?? 0;

        if (findLoopConcat(loop.body)) {
          add(line, "loop-concat", "A string is built up with `..` inside this loop, which rebuilds the whole string every time round. Collecting the pieces in a table and calling `table.concat` once measured 106x faster.");
        }
        const chain = findRepeatedChain(loop.body, loopVariables(stat));
        if (chain) {
          const where = chain.perIteration
            ? "It hangs off the loop variable, so read it into a local once at the top of the body"
            : "Reading it into a local once above the loop";
          add(line, "repeated-field", `\`${chain.text}\` is read more than once in this loop and nothing here writes it. ${where} measured up to 3.5x faster. Check it is not a property that changes while the loop runs.`);
        }
        if (findLengthInCondition(stat)) {
          add(line, "length-in-condition", "This loop takes `#` of something in its condition, so the length is recounted on every test. Holding it in a local first measured 1.4x faster, as long as the loop does not change the length.");
        }
      }

      // Descend regardless, so a loop nested in a loop is reported too.
      switch (stat.type) {
        case "DoStat":
        case "WhileStat":
        case "RepeatStat":
        case "NumericForStat":
        case "GenericForStat":
          visitBlock(stat.body);
          break;
        case "IfStat":
          for (const clause of stat.clauses) visitBlock(clause.body);
          if (stat.elseBody) visitBlock(stat.elseBody);
          break;
        case "LocalFunctionStat":
        case "FunctionDeclStat":
          visitBlock(stat.func.body);
          break;
        default:
          break;
      }
    }
  };

  function add(line: number, kind: HotPath["kind"], message: string) {
    const key = `${line}:${kind}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ line, kind, message });
  }

  // Closures held in locals and table fields are walked too, since a
  // render-step callback is exactly where this matters most.
  walkStats(chunk.body, (expr) => {
    if (expr.type === "FunctionExpr") visitBlock(expr.body);
  }, () => undefined);
  visitBlock(chunk.body);

  return found.sort((a, b) => a.line - b.line);
}
