import type {
  AssignTarget, Chunk, Expr, FunctionExpr, FunctionName, LocalName, Param, Stat, TableField, TypeSpan,
} from "./ast";

export interface EquivalenceResult {
  equal: boolean;
  reason?: string;
}

class MismatchError extends Error {}

// Lockstep structural walk of two ASTs. Exact match required on node `type`
// and every non-identifier field (operators, member/method names, table
// keys, type-span token text, label names). Identifier/declaration names
// are compared via alpha-equivalence: two symbolId maps assign a shared
// canonical index the first time each side's symbol is *declared*; every
// later reference on either side must resolve to the same canonical index.
// This lets `local a = 1` and `local xyz = 1` compare equal (post-rename)
// while still catching a resolver bug that wrongly treats a local as a
// global (isGlobal/unresolved identifiers are compared by literal name).
class Comparator {
  private mapA = new Map<number, number>();
  private mapB = new Map<number, number>();
  private path: (string | number)[] = [];

  private fail(msg: string): never {
    throw new MismatchError(`${this.path.join(".") || "<root>"}: ${msg}`);
  }

  private at<T>(seg: string | number, fn: () => T): T {
    this.path.push(seg);
    try {
      return fn();
    } finally {
      this.path.pop();
    }
  }

  private declare(idA: number | undefined, idB: number | undefined, nameA: string, nameB: string) {
    if (idA === undefined && idB === undefined) return; // no scope info yet (pre-resolver)
    if (idA === undefined || idB === undefined) this.fail(`symbolId presence mismatch for '${nameA}'/'${nameB}'`);
    if (this.mapA.has(idA)) this.fail(`symbolId ${idA} declared twice`);
    if (this.mapB.has(idB)) this.fail(`symbolId ${idB} declared twice`);
    const canonical = this.mapA.size;
    this.mapA.set(idA, canonical);
    this.mapB.set(idB, canonical);
  }

  private reference(a: { name: string; symbolId?: number; isGlobal?: boolean }, b: { name: string; symbolId?: number; isGlobal?: boolean }) {
    if (a.symbolId === undefined && b.symbolId === undefined) {
      if (a.name !== b.name) this.fail(`identifier '${a.name}' vs '${b.name}'`);
      return;
    }
    if (a.symbolId === undefined || b.symbolId === undefined) {
      this.fail(`symbolId presence mismatch on reference '${a.name}'/'${b.name}'`);
    }
    if (Boolean(a.isGlobal) !== Boolean(b.isGlobal)) this.fail(`isGlobal mismatch for '${a.name}'/'${b.name}'`);
    if (a.isGlobal) {
      if (a.name !== b.name) this.fail(`global '${a.name}' vs '${b.name}'`);
      return;
    }
    const ca = this.mapA.get(a.symbolId);
    const cb = this.mapB.get(b.symbolId);
    if (ca === undefined || cb === undefined) this.fail(`reference to an undeclared symbolId ('${a.name}'/'${b.name}')`);
    if (ca !== cb) this.fail(`'${a.name}'/'${b.name}' resolve to different declarations`);
  }

  chunk(a: Chunk, b: Chunk) {
    this.block(a.body, b.body);
  }

  private block(a: Stat[], b: Stat[]) {
    if (a.length !== b.length) this.fail(`block length ${a.length} vs ${b.length}`);
    a.forEach((s, i) => this.at(i, () => this.stat(s, b[i])));
  }

  private exprList(a: Expr[], b: Expr[]) {
    if (a.length !== b.length) this.fail(`expr list length ${a.length} vs ${b.length}`);
    a.forEach((e, i) => this.at(i, () => this.expr(e, b[i])));
  }

  private localNames(a: LocalName[], b: LocalName[]) {
    if (a.length !== b.length) this.fail(`local name list length ${a.length} vs ${b.length}`);
    a.forEach((n, i) =>
      this.at(i, () => {
        const other = b[i];
        if (n.attrib !== other.attrib) this.fail(`attrib '${n.attrib}' vs '${other.attrib}'`);
        this.optionalTypeSpan(n.typeAnnotation, other.typeAnnotation);
        this.declare(n.symbolId, other.symbolId, n.name, other.name);
      }),
    );
  }

  private params(a: Param[], b: Param[]) {
    if (a.length !== b.length) this.fail(`param list length ${a.length} vs ${b.length}`);
    a.forEach((p, i) =>
      this.at(i, () => {
        const other = b[i];
        this.optionalTypeSpan(p.typeAnnotation, other.typeAnnotation);
        this.declare(p.symbolId, other.symbolId, p.name, other.name);
      }),
    );
  }

  private functionExpr(a: FunctionExpr, b: FunctionExpr) {
    if (a.hasVararg !== b.hasVararg) this.fail(`hasVararg ${a.hasVararg} vs ${b.hasVararg}`);
    if (a.implicitSelf !== b.implicitSelf) this.fail(`implicitSelf ${a.implicitSelf} vs ${b.implicitSelf}`);
    this.optionalTypeSpan(a.generics, b.generics);
    this.optionalTypeSpan(a.returnType, b.returnType);
    if (a.implicitSelf) this.declare(a.selfSymbolId, b.selfSymbolId, "self", "self");
    this.params(a.params, b.params);
    this.block(a.body, b.body);
  }

  private functionName(a: FunctionName, b: FunctionName) {
    this.at("base", () => this.expr(a.base, b.base));
    if (a.isMethod !== b.isMethod) this.fail(`isMethod ${a.isMethod} vs ${b.isMethod}`);
    if (a.path.length !== b.path.length || a.path.some((seg, i) => seg !== b.path[i])) {
      this.fail(`function name path [${a.path}] vs [${b.path}]`);
    }
  }

  private assignTarget(a: AssignTarget, b: AssignTarget) {
    this.expr(a, b);
  }

  private optionalTypeSpan(a: TypeSpan | undefined, b: TypeSpan | undefined) {
    if (!a && !b) return;
    if (!a || !b) this.fail(`type annotation presence mismatch`);
    this.typeSpan(a, b);
  }

  private typeSpan(a: TypeSpan, b: TypeSpan) {
    if (a.tokens.length !== b.tokens.length) this.fail(`type span token count ${a.tokens.length} vs ${b.tokens.length}`);
    a.tokens.forEach((tok, i) => {
      const other = b.tokens[i];
      if (tok.kind !== other.kind || tok.text !== other.text) {
        this.fail(`type span token ${i}: ${tok.kind}:${tok.text} vs ${other.kind}:${other.text}`);
      }
    });
  }

  private tableFields(a: TableField[], b: TableField[]) {
    if (a.length !== b.length) this.fail(`table field count ${a.length} vs ${b.length}`);
    a.forEach((f, i) =>
      this.at(i, () => {
        const other = b[i];
        if (f.kind !== other.kind) this.fail(`table field kind '${f.kind}' vs '${other.kind}'`);
        if (f.kind === "item" && other.kind === "item") {
          this.at("value", () => this.expr(f.value, other.value));
        } else if (f.kind === "named" && other.kind === "named") {
          if (f.name !== other.name) this.fail(`table key '${f.name}' vs '${other.name}'`);
          this.at("value", () => this.expr(f.value, other.value));
        } else if (f.kind === "computed" && other.kind === "computed") {
          this.at("key", () => this.expr(f.key, other.key));
          this.at("value", () => this.expr(f.value, other.value));
        }
      }),
    );
  }

  private stat(a: Stat, b: Stat) {
    if (a.type !== b.type) this.fail(`statement type '${a.type}' vs '${b.type}'`);
    switch (a.type) {
      case "LocalStat": {
        const other = b as typeof a;
        this.at("init", () => this.exprList(a.init, other.init));
        this.at("names", () => this.localNames(a.names, other.names));
        return;
      }
      case "LocalFunctionStat": {
        const other = b as typeof a;
        this.declare(a.symbolId, other.symbolId, a.name, other.name);
        this.at("func", () => this.functionExpr(a.func, other.func));
        return;
      }
      case "FunctionDeclStat": {
        const other = b as typeof a;
        this.at("target", () => this.functionName(a.target, other.target));
        this.at("func", () => this.functionExpr(a.func, other.func));
        return;
      }
      case "AssignStat": {
        const other = b as typeof a;
        if (a.targets.length !== other.targets.length) this.fail("assign target count mismatch");
        a.targets.forEach((t, i) => this.at(`target${i}`, () => this.assignTarget(t, other.targets[i])));
        this.at("values", () => this.exprList(a.values, other.values));
        return;
      }
      case "CompoundAssignStat": {
        const other = b as typeof a;
        if (a.operator !== other.operator) this.fail(`compound op '${a.operator}' vs '${other.operator}'`);
        this.at("target", () => this.assignTarget(a.target, other.target));
        this.at("value", () => this.expr(a.value, other.value));
        return;
      }
      case "CallStat": {
        const other = b as typeof a;
        this.at("call", () => this.expr(a.call, other.call));
        return;
      }
      case "DoStat": {
        const other = b as typeof a;
        this.block(a.body, other.body);
        return;
      }
      case "WhileStat": {
        const other = b as typeof a;
        this.at("cond", () => this.expr(a.cond, other.cond));
        this.block(a.body, other.body);
        return;
      }
      case "RepeatStat": {
        const other = b as typeof a;
        this.block(a.body, other.body);
        this.at("cond", () => this.expr(a.cond, other.cond));
        return;
      }
      case "IfStat": {
        const other = b as typeof a;
        if (a.clauses.length !== other.clauses.length) this.fail("if clause count mismatch");
        a.clauses.forEach((c, i) =>
          this.at(`clause${i}`, () => {
            this.at("cond", () => this.expr(c.cond, other.clauses[i].cond));
            this.block(c.body, other.clauses[i].body);
          }),
        );
        if (Boolean(a.elseBody) !== Boolean(other.elseBody)) this.fail("else presence mismatch");
        if (a.elseBody && other.elseBody) this.block(a.elseBody, other.elseBody);
        return;
      }
      case "NumericForStat": {
        const other = b as typeof a;
        this.at("start", () => this.expr(a.start, other.start));
        this.at("stop", () => this.expr(a.stop, other.stop));
        if (Boolean(a.step) !== Boolean(other.step)) this.fail("numeric for step presence mismatch");
        if (a.step && other.step) this.at("step", () => this.expr(a.step!, other.step!));
        this.declare(a.symbolId, other.symbolId, a.varName, other.varName);
        this.block(a.body, other.body);
        return;
      }
      case "GenericForStat": {
        const other = b as typeof a;
        this.at("exprs", () => this.exprList(a.exprs, other.exprs));
        if (a.names.length !== other.names.length) this.fail("generic for name count mismatch");
        a.names.forEach((_, i) => this.declare(a.symbolIds?.[i], other.symbolIds?.[i], a.names[i], other.names[i]));
        this.block(a.body, other.body);
        return;
      }
      case "ReturnStat": {
        const other = b as typeof a;
        this.at("args", () => this.exprList(a.args, other.args));
        return;
      }
      case "BreakStat":
      case "ContinueStat":
        return;
      case "GotoStat": {
        const other = b as typeof a;
        if (a.label !== other.label) this.fail(`goto label '${a.label}' vs '${other.label}'`);
        return;
      }
      case "LabelStat": {
        const other = b as typeof a;
        if (a.name !== other.name) this.fail(`label name '${a.name}' vs '${other.name}'`);
        return;
      }
      case "TypeAliasStat": {
        const other = b as typeof a;
        if (a.name !== other.name) this.fail(`type alias name '${a.name}' vs '${other.name}'`);
        if (a.exported !== other.exported) this.fail("type alias exported mismatch");
        this.optionalTypeSpan(a.generics, other.generics);
        this.typeSpan(a.definition, other.definition);
        return;
      }
    }
  }

  private expr(a: Expr, b: Expr) {
    if (a.type !== b.type) this.fail(`expr type '${a.type}' vs '${b.type}'`);
    switch (a.type) {
      case "NilExpr":
      case "TrueExpr":
      case "FalseExpr":
      case "VarargExpr":
        return;
      case "NumberExpr":
      case "StringExpr": {
        const other = b as typeof a;
        if (a.raw !== other.raw) this.fail(`raw '${a.raw}' vs '${other.raw}'`);
        return;
      }
      case "InterpolatedStringExpr": {
        const other = b as typeof a;
        if (a.parts.length !== other.parts.length) this.fail("interpolation part count mismatch");
        a.parts.forEach((p, i) => {
          const op = other.parts[i];
          if (typeof p === "string" || typeof op === "string") {
            if (p !== op) this.fail(`interpolation segment ${i}: '${p}' vs '${op}'`);
          } else {
            this.at(i, () => this.expr(p, op));
          }
        });
        return;
      }
      case "Identifier": {
        const other = b as typeof a;
        this.reference(a, other);
        return;
      }
      case "IndexExpr": {
        const other = b as typeof a;
        this.at("object", () => this.expr(a.object, other.object));
        this.at("index", () => this.expr(a.index, other.index));
        return;
      }
      case "MemberExpr": {
        const other = b as typeof a;
        this.at("object", () => this.expr(a.object, other.object));
        if (a.name !== other.name) this.fail(`member name '${a.name}' vs '${other.name}'`);
        return;
      }
      case "CallExpr": {
        const other = b as typeof a;
        this.at("callee", () => this.expr(a.callee, other.callee));
        this.at("args", () => this.exprList(a.args, other.args));
        return;
      }
      case "MethodCallExpr": {
        const other = b as typeof a;
        this.at("object", () => this.expr(a.object, other.object));
        if (a.method !== other.method) this.fail(`method name '${a.method}' vs '${other.method}'`);
        this.at("args", () => this.exprList(a.args, other.args));
        return;
      }
      case "FunctionExpr": {
        const other = b as typeof a;
        this.functionExpr(a, other);
        return;
      }
      case "TableExpr": {
        const other = b as typeof a;
        this.tableFields(a.fields, other.fields);
        return;
      }
      case "BinaryExpr": {
        const other = b as typeof a;
        if (a.operator !== other.operator) this.fail(`operator '${a.operator}' vs '${other.operator}'`);
        this.at("left", () => this.expr(a.left, other.left));
        this.at("right", () => this.expr(a.right, other.right));
        return;
      }
      case "UnaryExpr": {
        const other = b as typeof a;
        if (a.operator !== other.operator) this.fail(`unary operator '${a.operator}' vs '${other.operator}'`);
        this.at("operand", () => this.expr(a.operand, other.operand));
        return;
      }
      case "TypeAssertionExpr": {
        const other = b as typeof a;
        this.at("expr", () => this.expr(a.expr, other.expr));
        this.typeSpan(a.typeAnnotation, other.typeAnnotation);
        return;
      }
      case "IfExpr": {
        const other = b as typeof a;
        this.at("cond", () => this.expr(a.cond, other.cond));
        this.at("thenExpr", () => this.expr(a.thenExpr, other.thenExpr));
        if (a.elseifs.length !== other.elseifs.length) this.fail("if-expr elseif count mismatch");
        a.elseifs.forEach((c, i) =>
          this.at(`elseif${i}`, () => {
            this.expr(c.cond, other.elseifs[i].cond);
            this.expr(c.expr, other.elseifs[i].expr);
          }),
        );
        this.at("elseExpr", () => this.expr(a.elseExpr, other.elseExpr));
        return;
      }
      case "ParenExpr": {
        const other = b as typeof a;
        this.at("expr", () => this.expr(a.expr, other.expr));
        return;
      }
    }
  }
}

export function structurallyEqual(a: Chunk, b: Chunk): EquivalenceResult {
  try {
    new Comparator().chunk(a, b);
    return { equal: true };
  } catch (error) {
    if (error instanceof MismatchError) return { equal: false, reason: error.message };
    throw error;
  }
}
