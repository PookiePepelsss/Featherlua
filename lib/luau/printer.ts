import { BINOP_INFO, UNARY_PRECEDENCE } from "./parser";
import { compoundSymbolSet, DIGIT_RE, IDENT_CONTINUE_RE } from "./scan";
import type {
  AssignTarget, Chunk, Expr, FunctionExpr, FunctionName, Stat, TypeSpan,
} from "./ast";

interface Part {
  text: string;
  // Only true for a NumberExpr's own raw text -- needed so the
  // digit-before-dot guard below can't fire on an identifier that merely
  // ends in a digit (`p1` before `.x`), which is never ambiguous the way
  // a real number literal like `1` before `.5` would be.
  isNumber: boolean;
}

// Forked from app/page.tsx's Safe-mode needsSpace, operating on the printer's
// own emitted raw token strings instead of the Safe tokenizer's tokens.
// Kept independent of Safe mode by design (see plan) but reuses scan.ts's
// already-forked primitives rather than re-duplicating the regexes again.
function needsSpace(left: Part, right: Part): boolean {
  const leftEnd = left.text.length ? left.text[left.text.length - 1] : "";
  const rightStart = right.text[0] ?? "";
  if (IDENT_CONTINUE_RE.test(leftEnd) && IDENT_CONTINUE_RE.test(rightStart)) return true;
  if (left.isNumber && DIGIT_RE.test(leftEnd) && rightStart === ".") return true;
  if (leftEnd === "." && DIGIT_RE.test(rightStart)) return true;
  if (leftEnd === "-" && rightStart === "-") return true;
  if (leftEnd === "[" && (rightStart === "[" || rightStart === "=")) return true;
  return compoundSymbolSet.has(left.text + right.text);
}

const ATOM_PRECEDENCE = 100;
const TYPE_ASSERTION_PRECEDENCE = 9;

function precedenceOf(expr: Expr): number {
  switch (expr.type) {
    case "BinaryExpr":
      return BINOP_INFO[expr.operator].level;
    case "UnaryExpr":
      return UNARY_PRECEDENCE;
    case "TypeAssertionExpr":
      return TYPE_ASSERTION_PRECEDENCE;
    case "IfExpr":
      // Forces parens whenever used as a nested operand (any minPrecedence
      // > 0); only a genuine top-level slot (minPrecedence 0) leaves it bare.
      return 0;
    default:
      return ATOM_PRECEDENCE;
  }
}

export class Printer {
  private parts: Part[] = [];
  private renameMap: Map<number, string> | undefined;

  constructor(renameMap?: Map<number, string>) {
    this.renameMap = renameMap;
  }

  private emit(text: string) {
    this.parts.push({ text, isNumber: false });
  }

  private emitNumber(raw: string) {
    this.parts.push({ text: raw, isNumber: true });
  }

  private emitName(name: string, symbolId?: number) {
    if (symbolId !== undefined && this.renameMap) {
      this.emit(this.renameMap.get(symbolId) ?? name);
    } else {
      this.emit(name);
    }
  }

  private emitTypeSpan(span: TypeSpan) {
    for (const tok of span.tokens) this.emit(tok.text);
  }

  private emitList<T>(items: T[], each: (item: T) => void) {
    items.forEach((item, i) => {
      if (i > 0) this.emit(",");
      each(item);
    });
  }

  print(chunk: Chunk): string {
    this.printBlock(chunk.body);
    let output = "";
    let previous: Part | undefined;
    for (const part of this.parts) {
      if (previous !== undefined && needsSpace(previous, part)) output += " ";
      output += part.text;
      previous = part;
    }
    return output.trim();
  }

  private printBlock(stats: Stat[]) {
    for (const stat of stats) this.printStat(stat);
  }

  private printFunctionSuffix(func: FunctionExpr) {
    if (func.generics) this.emitTypeSpan(func.generics);
    this.emit("(");
    let first = true;
    for (const param of func.params) {
      if (!first) this.emit(",");
      first = false;
      this.emitName(param.name, param.symbolId);
      if (param.typeAnnotation) {
        this.emit(":");
        this.emitTypeSpan(param.typeAnnotation);
      }
    }
    if (func.hasVararg) {
      if (!first) this.emit(",");
      this.emit("...");
      if (func.varargType) {
        this.emit(":");
        this.emitTypeSpan(func.varargType);
      }
    }
    this.emit(")");
    if (func.returnType) {
      this.emit(":");
      this.emitTypeSpan(func.returnType);
    }
    this.printBlock(func.body);
    this.emit("end");
  }

  private printFunctionName(target: FunctionName) {
    this.printExpr(target.base, ATOM_PRECEDENCE);
    target.path.forEach((segment, i) => {
      const isLast = i === target.path.length - 1;
      this.emit(isLast && target.isMethod ? ":" : ".");
      this.emit(segment);
    });
  }

  private printStat(stat: Stat) {
    switch (stat.type) {
      case "LocalStat":
        this.emit("local");
        this.emitList(stat.names, (n) => {
          this.emitName(n.name, n.symbolId);
          if (n.attrib) {
            this.emit("<");
            this.emit(n.attrib);
            this.emit(">");
          }
          if (n.typeAnnotation) {
            this.emit(":");
            this.emitTypeSpan(n.typeAnnotation);
          }
        });
        if (stat.init.length) {
          this.emit("=");
          this.emitList(stat.init, (e) => this.printExpr(e, 0));
        }
        return;
      case "LocalFunctionStat":
        this.emit("local");
        this.emit("function");
        this.emitName(stat.name, stat.symbolId);
        this.printFunctionSuffix(stat.func);
        return;
      case "FunctionDeclStat":
        this.emit("function");
        this.printFunctionName(stat.target);
        this.printFunctionSuffix(stat.func);
        return;
      case "AssignStat":
        this.emitList(stat.targets, (t) => this.printAssignTarget(t));
        this.emit("=");
        this.emitList(stat.values, (e) => this.printExpr(e, 0));
        return;
      case "CompoundAssignStat":
        this.printAssignTarget(stat.target);
        this.emit(stat.operator);
        this.printExpr(stat.value, 0);
        return;
      case "CallStat":
        this.printExpr(stat.call, 0);
        return;
      case "DoStat":
        this.emit("do");
        this.printBlock(stat.body);
        this.emit("end");
        return;
      case "WhileStat":
        this.emit("while");
        this.printExpr(stat.cond, 0);
        this.emit("do");
        this.printBlock(stat.body);
        this.emit("end");
        return;
      case "RepeatStat":
        this.emit("repeat");
        this.printBlock(stat.body);
        this.emit("until");
        this.printExpr(stat.cond, 0);
        return;
      case "IfStat":
        stat.clauses.forEach((clause, i) => {
          this.emit(i === 0 ? "if" : "elseif");
          this.printExpr(clause.cond, 0);
          this.emit("then");
          this.printBlock(clause.body);
        });
        if (stat.elseBody) {
          this.emit("else");
          this.printBlock(stat.elseBody);
        }
        this.emit("end");
        return;
      case "NumericForStat":
        this.emit("for");
        this.emitName(stat.varName, stat.symbolId);
        this.emit("=");
        this.printExpr(stat.start, 0);
        this.emit(",");
        this.printExpr(stat.stop, 0);
        if (stat.step) {
          this.emit(",");
          this.printExpr(stat.step, 0);
        }
        this.emit("do");
        this.printBlock(stat.body);
        this.emit("end");
        return;
      case "GenericForStat":
        this.emit("for");
        this.printGenericFor(stat);
        return;
      case "ReturnStat":
        this.emit("return");
        this.emitList(stat.args, (e) => this.printExpr(e, 0));
        return;
      case "BreakStat":
        this.emit("break");
        return;
      case "ContinueStat":
        this.emit("continue");
        return;
      case "GotoStat":
        this.emit("goto");
        this.emit(stat.label);
        return;
      case "LabelStat":
        // Always precede a label with `;`: a preceding expression-ending
        // statement's trailing simpleexp could otherwise greedily absorb
        // this label's opening `::` as a type assertion, stranding the
        // closing `::` (see parser.test.ts). A leading `;` is always valid.
        this.emit(";");
        this.emit("::");
        this.emit(stat.name);
        this.emit("::");
        return;
      case "TypeAliasStat":
        if (stat.exported) this.emit("export");
        this.emit("type");
        this.emit(stat.name);
        if (stat.generics) this.emitTypeSpan(stat.generics);
        this.emit("=");
        this.emitTypeSpan(stat.definition);
        return;
    }
  }

  private printGenericFor(stat: Extract<Stat, { type: "GenericForStat" }>) {
    stat.names.forEach((name, i) => {
      if (i > 0) this.emit(",");
      this.emitName(name, stat.symbolIds?.[i]);
    });
    this.emit("in");
    this.emitList(stat.exprs, (e) => this.printExpr(e, 0));
    this.emit("do");
    this.printBlock(stat.body);
    this.emit("end");
  }

  private printAssignTarget(target: AssignTarget) {
    this.printExpr(target, 0);
  }

  // Base of a suffix chain (`object`/`callee`). Only a `prefixexp` (Name |
  // '(' exp ')' | prefixexp suffix) can be indexed/called there -- unlike
  // printExpr's general ParenExpr handling, never drop these parens even
  // when "redundant": `({a=1}).a` -> `{a=1}.a` is invalid syntax.
  private printPrefixExprBase(expr: Expr) {
    if (expr.type === "ParenExpr") {
      this.emit("(");
      this.printExpr(expr.expr, 0);
      this.emit(")");
      return;
    }
    this.printExpr(expr, ATOM_PRECEDENCE);
  }

  private printExpr(expr: Expr, minPrecedence: number) {
    if (expr.type === "ParenExpr") {
      // Parens are only semantically load-bearing around something that can
      // yield multiple values (call/method-call/vararg) -- there they
      // truncate to exactly one value, which is observable. Around anything
      // else, source parens were pure grouping/cosmetic: defer to the
      // inner expression's own precedence-based parenthesization instead of
      // unconditionally re-emitting a (possibly redundant) pair.
      const inner = expr.expr;
      const isMultiValue = inner.type === "CallExpr" || inner.type === "MethodCallExpr" || inner.type === "VarargExpr";
      if (isMultiValue) {
        this.emit("(");
        this.printExpr(inner, 0);
        this.emit(")");
      } else {
        this.printExpr(inner, minPrecedence);
      }
      return;
    }

    const prec = precedenceOf(expr);
    const wrap = prec < minPrecedence;
    if (wrap) this.emit("(");

    switch (expr.type) {
      case "NilExpr":
        this.emit("nil");
        break;
      case "TrueExpr":
        this.emit("true");
        break;
      case "FalseExpr":
        this.emit("false");
        break;
      case "VarargExpr":
        this.emit("...");
        break;
      case "NumberExpr":
        this.emitNumber(expr.raw);
        break;
      case "StringExpr":
        this.emit(expr.raw);
        break;
      case "InterpolatedStringExpr":
        this.emit("`");
        expr.parts.forEach((part, i) => {
          if (i % 2 === 0) {
            this.emit(part as string);
          } else {
            this.emit("{");
            this.printExpr(part as Expr, 0);
            this.emit("}");
          }
        });
        this.emit("`");
        break;
      case "Identifier":
        this.emitName(expr.name, expr.symbolId);
        break;
      case "IndexExpr":
        this.printPrefixExprBase(expr.object);
        this.emit("[");
        this.printExpr(expr.index, 0);
        this.emit("]");
        break;
      case "MemberExpr":
        this.printPrefixExprBase(expr.object);
        this.emit(".");
        this.emit(expr.name);
        break;
      case "CallExpr":
        this.printPrefixExprBase(expr.callee);
        this.emit("(");
        this.emitList(expr.args, (a) => this.printExpr(a, 0));
        this.emit(")");
        break;
      case "MethodCallExpr":
        this.printPrefixExprBase(expr.object);
        this.emit(":");
        this.emit(expr.method);
        this.emit("(");
        this.emitList(expr.args, (a) => this.printExpr(a, 0));
        this.emit(")");
        break;
      case "FunctionExpr":
        this.emit("function");
        this.printFunctionSuffix(expr);
        break;
      case "TableExpr":
        this.emit("{");
        this.emitList(expr.fields, (field) => {
          if (field.kind === "item") {
            this.printExpr(field.value, 0);
          } else if (field.kind === "named") {
            this.emit(field.name);
            this.emit("=");
            this.printExpr(field.value, 0);
          } else {
            this.emit("[");
            this.printExpr(field.key, 0);
            this.emit("]");
            this.emit("=");
            this.printExpr(field.value, 0);
          }
        });
        this.emit("}");
        break;
      case "BinaryExpr": {
        const info = BINOP_INFO[expr.operator];
        const leftMin = info.rightAssoc ? info.level + 1 : info.level;
        const rightMin = info.rightAssoc ? info.level : info.level + 1;
        this.printExpr(expr.left, leftMin);
        this.emit(expr.operator);
        this.printExpr(expr.right, rightMin);
        break;
      }
      case "UnaryExpr":
        this.emit(expr.operator);
        this.printExpr(expr.operand, UNARY_PRECEDENCE);
        break;
      case "TypeAssertionExpr":
        this.printExpr(expr.expr, ATOM_PRECEDENCE);
        this.emit("::");
        this.emitTypeSpan(expr.typeAnnotation);
        break;
      case "IfExpr":
        this.emit("if");
        this.printExpr(expr.cond, 0);
        this.emit("then");
        this.printExpr(expr.thenExpr, 0);
        for (const clause of expr.elseifs) {
          this.emit("elseif");
          this.printExpr(clause.cond, 0);
          this.emit("then");
          this.printExpr(clause.expr, 0);
        }
        this.emit("else");
        this.printExpr(expr.elseExpr, 0);
        break;
    }

    if (wrap) this.emit(")");
  }
}

export function print(chunk: Chunk, renameMap?: Map<number, string>): string {
  return new Printer(renameMap).print(chunk);
}
