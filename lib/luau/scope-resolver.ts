import type {
  AssignTarget, Chunk, Expr, FunctionExpr, Stat,
} from "./ast";

export interface Symbol {
  id: number;
  originalName: string;
  kind: "local" | "param" | "loopvar" | "self";
}

// Exported so renamer.ts can do scope-aware name reuse: two symbols whose
// declaring scopes aren't in an ancestor/descendant relationship (siblings,
// cousins, ...) are never simultaneously visible under Lua's static lexical
// scoping, so they can safely share a generated name.
export interface Scope {
  parent: Scope | null;
  names: Map<string, Symbol>;
  /** Symbol ids declared directly in this scope, in declaration order.
   * Unlike `names` (which only keeps the latest symbol per string key, for
   * lookup), this keeps every declaration, including ones later shadowed by
   * a same-named redeclaration in the same scope (`local x=1; local x=2`
   * is two distinct symbols, both need their own slot). */
  declaredOrder: number[];
  children: Scope[];
  /** Symbols declared in an ancestor scope and referenced somewhere inside
   * this scope's subtree. A generated name may be reused by a nested scope
   * exactly when the outer symbol holding it does not appear in that set:
   * shadowing a binding nothing inside reads is unobservable. */
  outerRefs: Set<number>;
}

export interface ResolvedProgram {
  chunk: Chunk;
  symbols: Map<number, Symbol>;
  rootScope: Scope;
}

class ScopeResolver {
  private symbols = new Map<number, Symbol>();
  private nextId = 0;

  private createSymbol(name: string, kind: Symbol["kind"]): Symbol {
    const sym: Symbol = { id: this.nextId++, originalName: name, kind };
    this.symbols.set(sym.id, sym);
    return sym;
  }

  private pushScope(parent: Scope | null): Scope {
    const scope: Scope = { parent, names: new Map(), declaredOrder: [], children: [], outerRefs: new Set() };
    if (parent) parent.children.push(scope);
    return scope;
  }

  private declare(scope: Scope, name: string, kind: Symbol["kind"]): Symbol {
    const sym = this.createSymbol(name, kind);
    scope.names.set(name, sym);
    scope.declaredOrder.push(sym.id);
    return sym;
  }

  private lookup(name: string, scope: Scope | null): Symbol | undefined {
    for (let s = scope; s !== null; s = s.parent) {
      const found = s.names.get(name);
      if (found) {
        // Every scope between the reference and the declaration now has
        // this symbol live inside it.
        for (let walk = scope; walk !== null && walk !== s; walk = walk.parent) {
          walk.outerRefs.add(found.id);
        }
        return found;
      }
    }
    return undefined;
  }

  resolve(chunk: Chunk): ResolvedProgram {
    const root = this.pushScope(null);
    this.block(chunk.body, root);
    return { chunk, symbols: this.symbols, rootScope: root };
  }

  private block(stats: Stat[], scope: Scope) {
    for (const stat of stats) this.stat(stat, scope);
  }

  private functionExpr(func: FunctionExpr, outerScope: Scope) {
    const inner = this.pushScope(outerScope);
    if (func.implicitSelf) {
      func.selfSymbolId = this.declare(inner, "self", "self").id;
    }
    for (const param of func.params) {
      param.symbolId = this.declare(inner, param.name, "param").id;
    }
    this.block(func.body, inner);
  }

  private assignTarget(target: AssignTarget, scope: Scope) {
    this.expr(target, scope);
  }

  private stat(stat: Stat, scope: Scope) {
    switch (stat.type) {
      case "LocalStat":
        // Resolve init expressions BEFORE declaring the new names, so
        // `local x = x` has its RHS resolve to whatever was visible before
        // this statement (an outer local or a global), never to itself.
        for (const e of stat.init) this.expr(e, scope);
        for (const name of stat.names) {
          name.symbolId = this.declare(scope, name.name, "local").id;
        }
        return;
      case "LocalFunctionStat":
        // Declared BEFORE resolving the body (self-recursion visible) --
        // the one difference from `local f = function() end`, which is a
        // plain LocalStat whose init is resolved under the rule above.
        stat.symbolId = this.declare(scope, stat.name, "local").id;
        this.functionExpr(stat.func, scope);
        return;
      case "FunctionDeclStat":
        // `function a.b.c() end` never declares a local; `a` is a plain
        // reference (must already exist), and `.b`/`.c` are member names.
        this.expr(stat.target.base, scope);
        this.functionExpr(stat.func, scope);
        return;
      case "AssignStat":
        for (const t of stat.targets) this.assignTarget(t, scope);
        for (const v of stat.values) this.expr(v, scope);
        return;
      case "CompoundAssignStat":
        this.assignTarget(stat.target, scope);
        this.expr(stat.value, scope);
        return;
      case "CallStat":
        this.expr(stat.call, scope);
        return;
      case "DoStat":
        this.block(stat.body, this.pushScope(scope));
        return;
      case "WhileStat":
        this.expr(stat.cond, scope);
        this.block(stat.body, this.pushScope(scope));
        return;
      case "RepeatStat": {
        // `until` sees locals declared in the loop body -- resolve the
        // condition in the SAME (still-open) inner scope, not the outer one.
        const inner = this.pushScope(scope);
        this.block(stat.body, inner);
        this.expr(stat.cond, inner);
        return;
      }
      case "IfStat":
        for (const clause of stat.clauses) {
          this.expr(clause.cond, scope);
          this.block(clause.body, this.pushScope(scope));
        }
        if (stat.elseBody) this.block(stat.elseBody, this.pushScope(scope));
        return;
      case "NumericForStat": {
        this.expr(stat.start, scope);
        this.expr(stat.stop, scope);
        if (stat.step) this.expr(stat.step, scope);
        const inner = this.pushScope(scope);
        stat.symbolId = this.declare(inner, stat.varName, "loopvar").id;
        this.block(stat.body, inner);
        return;
      }
      case "GenericForStat": {
        for (const e of stat.exprs) this.expr(e, scope);
        const inner = this.pushScope(scope);
        stat.symbolIds = stat.names.map((name) => this.declare(inner, name, "loopvar").id);
        this.block(stat.body, inner);
        return;
      }
      case "ReturnStat":
        for (const a of stat.args) this.expr(a, scope);
        return;
      case "BreakStat":
      case "ContinueStat":
      case "TypeAliasStat":
        return; // no identifiers to resolve (type spans are opaque)
    }
  }

  private expr(expr: Expr, scope: Scope) {
    switch (expr.type) {
      case "NilExpr":
      case "TrueExpr":
      case "FalseExpr":
      case "VarargExpr":
      case "NumberExpr":
      case "StringExpr":
        return;
      case "InterpolatedStringExpr":
        for (const part of expr.parts) {
          if (typeof part !== "string") this.expr(part, scope);
        }
        return;
      case "Identifier": {
        const sym = this.lookup(expr.name, scope);
        if (sym) expr.symbolId = sym.id;
        else expr.isGlobal = true;
        return;
      }
      case "IndexExpr":
        this.expr(expr.object, scope);
        this.expr(expr.index, scope);
        return;
      case "MemberExpr":
        this.expr(expr.object, scope); // name is a plain field, never resolved
        return;
      case "CallExpr":
        this.expr(expr.callee, scope);
        for (const a of expr.args) this.expr(a, scope);
        return;
      case "MethodCallExpr":
        this.expr(expr.object, scope); // method name never resolved
        for (const a of expr.args) this.expr(a, scope);
        return;
      case "FunctionExpr":
        this.functionExpr(expr, scope);
        return;
      case "TableExpr":
        for (const field of expr.fields) {
          if (field.kind === "item") this.expr(field.value, scope);
          else if (field.kind === "named") this.expr(field.value, scope); // key never resolved
          else {
            this.expr(field.key, scope);
            this.expr(field.value, scope);
          }
        }
        return;
      case "BinaryExpr":
        this.expr(expr.left, scope);
        this.expr(expr.right, scope);
        return;
      case "UnaryExpr":
        this.expr(expr.operand, scope);
        return;
      case "TypeAssertionExpr":
        this.expr(expr.expr, scope); // typeAnnotation is opaque, never resolved
        return;
      case "IfExpr":
        this.expr(expr.cond, scope);
        this.expr(expr.thenExpr, scope);
        for (const clause of expr.elseifs) {
          this.expr(clause.cond, scope);
          this.expr(clause.expr, scope);
        }
        this.expr(expr.elseExpr, scope);
        return;
      case "ParenExpr":
        this.expr(expr.expr, scope);
        return;
    }
  }
}

export function resolveScopes(chunk: Chunk): ResolvedProgram {
  return new ScopeResolver().resolve(chunk);
}
