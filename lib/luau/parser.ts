import { ParseError } from "./errors";
import { tokenize } from "./lexer";
import type { Token, TokenKind } from "./tokens";
import type {
  AssignTarget, BinOp, Chunk, CompoundOp, Expr, FunctionExpr, LocalName, Param, Stat, TableField, TypeSpan,
} from "./ast";

export interface ParseResult {
  chunk: Chunk;
  protectedComments: string[];
}

const COMPOUND_OPS = new Set<string>(["+=", "-=", "*=", "/=", "//=", "%=", "^=", "..="]);

// Between level 6 (*, /, //, %) and level 8 (^): lets a unary operand's
// recursive parse greedily consume a following `^` (so `-x^2` = `-(x^2)`)
// while still stopping before looser binops. Exported so printer.ts can
// compute matching paren-necessity decisions without a second, potentially
// drifting copy of this number.
export const UNARY_PRECEDENCE = 7;

// level: precedence (higher binds tighter); rightAssoc: right-associative.
// Exported for printer.ts (see UNARY_PRECEDENCE above).
export const BINOP_INFO: Record<string, { level: number; rightAssoc: boolean }> = {
  or: { level: 1, rightAssoc: false },
  and: { level: 2, rightAssoc: false },
  "<": { level: 3, rightAssoc: false },
  ">": { level: 3, rightAssoc: false },
  "<=": { level: 3, rightAssoc: false },
  ">=": { level: 3, rightAssoc: false },
  "~=": { level: 3, rightAssoc: false },
  "==": { level: 3, rightAssoc: false },
  "..": { level: 4, rightAssoc: true },
  "+": { level: 5, rightAssoc: false },
  "-": { level: 5, rightAssoc: false },
  "*": { level: 6, rightAssoc: false },
  "/": { level: 6, rightAssoc: false },
  "//": { level: 6, rightAssoc: false },
  "%": { level: 6, rightAssoc: false },
  "^": { level: 8, rightAssoc: true },
};

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private current(): Token {
    return this.tokens[this.pos];
  }

  private peek(offset: number): Token {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)];
  }

  private advance(): Token {
    const tok = this.tokens[this.pos];
    if (this.pos < this.tokens.length - 1) this.pos += 1;
    return tok;
  }

  private is(kind: TokenKind, text?: string): boolean {
    const tok = this.current();
    return tok.kind === kind && (text === undefined || tok.text === text);
  }

  private atKeyword(word: string): boolean {
    return this.is("Keyword", word);
  }

  private atSymbol(sym: string): boolean {
    return this.is("Symbol", sym);
  }

  private atName(word?: string): boolean {
    return this.is("Name", word);
  }

  private fail(message: string, at?: Token): never {
    const tok = at ?? this.current();
    throw new ParseError(message, tok.line, tok.col, tok.start);
  }

  private expectSymbol(sym: string): Token {
    if (!this.atSymbol(sym)) this.fail(`Expected '${sym}'`);
    return this.advance();
  }

  private expectKeyword(word: string): Token {
    if (!this.atKeyword(word)) this.fail(`Expected '${word}'`);
    return this.advance();
  }

  private expectNameText(): string {
    if (!this.is("Name")) this.fail("Expected a name");
    return this.advance().text;
  }

  // === entry point ===

  parseChunk(): Chunk {
    const body = this.parseBlock();
    if (!this.is("Eof")) this.fail(`Unexpected token '${this.current().text}'`);
    return { type: "Chunk", body };
  }

  // === statements ===

  private isBlockEnd(): boolean {
    const tok = this.current();
    if (tok.kind === "Eof") return true;
    return tok.kind === "Keyword" && (tok.text === "end" || tok.text === "else" || tok.text === "elseif" || tok.text === "until");
  }

  private parseBlock(): Stat[] {
    const stats: Stat[] = [];
    while (!this.isBlockEnd()) {
      if (this.atSymbol(";")) {
        this.advance();
        continue;
      }
      if (this.atKeyword("return")) {
        stats.push(this.parseReturnStat());
        break;
      }
      const stat = this.parseStatement();
      stats.push(stat);
      // Luau requires `break` and `continue` to end their block, exactly as
      // `return` does. Enforcing it here is what stops an optimization pass
      // from emitting a block that Luau's own compiler would reject: the
      // re-parse self-check only catches what this parser refuses.
      if (stat.type === "BreakStat" || stat.type === "ContinueStat") {
        this.skipSemicolons();
        if (!this.isBlockEnd()) {
          const tok = this.peek(0);
          throw new ParseError(
            `'${stat.type === "BreakStat" ? "break" : "continue"}' must be the last statement in its block`,
            tok.line,
            tok.col,
            tok.start,
          );
        }
        break;
      }
    }
    return stats;
  }

  private skipSemicolons() {
    while (this.atSymbol(";")) this.advance();
  }

  // A bare `continue`/`type`/`export` Name is a soft keyword only in this
  // position; if the next token could continue it as a real expression
  // (suffix, call, assignment, comparison), it's a plain identifier instead.
  private looksLikeContinuation(tok: Token): boolean {
    if (tok.kind === "String" || tok.kind === "LongString" || tok.kind === "InterpStringSegment") return true;
    if (tok.kind !== "Symbol") return false;
    return tok.text === "." || tok.text === "[" || tok.text === ":" || tok.text === "(" ||
      tok.text === "," || tok.text === "=" || tok.text === "{" || COMPOUND_OPS.has(tok.text);
  }

  private parseStatement(): Stat {
    if (this.atKeyword("local")) return this.parseLocalOrLocalFunction();
    if (this.atKeyword("if")) return this.parseIfStat();
    if (this.atKeyword("while")) return this.parseWhileStat();
    if (this.atKeyword("repeat")) return this.parseRepeatStat();
    if (this.atKeyword("do")) {
      this.advance();
      const body = this.parseBlock();
      this.expectKeyword("end");
      return { type: "DoStat", body };
    }
    if (this.atKeyword("for")) return this.parseForStat();
    if (this.atKeyword("function")) return this.parseFunctionDeclStat();
    if (this.atKeyword("break")) {
      this.advance();
      return { type: "BreakStat" };
    }
    if (this.atKeyword("goto")) {
      this.advance();
      return { type: "GotoStat", label: this.expectNameText() };
    }
    if (this.atSymbol("::")) {
      this.advance();
      const name = this.expectNameText();
      this.expectSymbol("::");
      return { type: "LabelStat", name };
    }
    if (this.atName("continue") && !this.looksLikeContinuation(this.peek(1))) {
      this.advance();
      return { type: "ContinueStat" };
    }
    if (this.atName("type") && this.peek(1).kind === "Name") {
      return this.parseTypeAliasStat(false);
    }
    if (this.atName("export") && this.peek(1).kind === "Name" && this.peek(1).text === "type" && this.peek(2).kind === "Name") {
      this.advance();
      return this.parseTypeAliasStat(true);
    }
    return this.parseExprStatement();
  }

  private parseReturnStat(): Stat {
    this.advance();
    const args = this.isBlockEnd() || this.atSymbol(";") ? [] : this.parseExprList();
    if (this.atSymbol(";")) this.advance();
    return { type: "ReturnStat", args };
  }

  private parseLocalOrLocalFunction(): Stat {
    this.advance();
    if (this.atKeyword("function")) {
      this.advance();
      const name = this.expectNameText();
      const func = this.parseFunctionBody(false);
      return { type: "LocalFunctionStat", name, func };
    }
    const names = this.parseLocalNameList();
    let init: Expr[] = [];
    if (this.atSymbol("=")) {
      this.advance();
      init = this.parseExprList();
    }
    return { type: "LocalStat", names, init };
  }

  private parseLocalNameList(): LocalName[] {
    const names: LocalName[] = [];
    for (;;) {
      const name = this.expectNameText();
      let attrib: "const" | "close" | undefined;
      let typeAnnotation: TypeSpan | undefined;
      for (;;) {
        if (this.atSymbol("<") && attrib === undefined) {
          this.advance();
          attrib = this.expectNameText() as "const" | "close";
          this.expectSymbol(">");
          continue;
        }
        if (this.atSymbol(":") && typeAnnotation === undefined) {
          this.advance();
          typeAnnotation = this.parseTypeSpan();
          continue;
        }
        break;
      }
      names.push({ name, attrib, typeAnnotation });
      if (this.atSymbol(",")) {
        this.advance();
        continue;
      }
      break;
    }
    return names;
  }

  private parseIfStat(): Stat {
    this.advance();
    const clauses: { cond: Expr; body: Stat[] }[] = [];
    const cond = this.parseExpr();
    this.expectKeyword("then");
    clauses.push({ cond, body: this.parseBlock() });
    while (this.atKeyword("elseif")) {
      this.advance();
      const c = this.parseExpr();
      this.expectKeyword("then");
      clauses.push({ cond: c, body: this.parseBlock() });
    }
    let elseBody: Stat[] | undefined;
    if (this.atKeyword("else")) {
      this.advance();
      elseBody = this.parseBlock();
    }
    this.expectKeyword("end");
    return { type: "IfStat", clauses, elseBody };
  }

  private parseWhileStat(): Stat {
    const line = this.current().line;
    this.advance();
    const cond = this.parseExpr();
    this.expectKeyword("do");
    const body = this.parseBlock();
    this.expectKeyword("end");
    return { type: "WhileStat", cond, body, line };
  }

  private parseRepeatStat(): Stat {
    const line = this.current().line;
    this.advance();
    const body = this.parseBlock();
    this.expectKeyword("until");
    const cond = this.parseExpr();
    return { type: "RepeatStat", body, cond, line };
  }

  private parseForStat(): Stat {
    const line = this.current().line;
    this.advance();
    const firstName = this.expectNameText();
    if (this.atSymbol("=")) {
      this.advance();
      const start = this.parseExpr();
      this.expectSymbol(",");
      const stop = this.parseExpr();
      let step: Expr | undefined;
      if (this.atSymbol(",")) {
        this.advance();
        step = this.parseExpr();
      }
      this.expectKeyword("do");
      const body = this.parseBlock();
      this.expectKeyword("end");
      return { type: "NumericForStat", varName: firstName, start, stop, step, body, line };
    }
    const names = [firstName];
    while (this.atSymbol(",")) {
      this.advance();
      names.push(this.expectNameText());
    }
    this.expectKeyword("in");
    const exprs = this.parseExprList();
    this.expectKeyword("do");
    const body = this.parseBlock();
    this.expectKeyword("end");
    return { type: "GenericForStat", names, exprs, body, line };
  }

  private parseFunctionDeclStat(): Stat {
    this.advance();
    const base: Expr = { type: "Identifier", name: this.expectNameText() };
    const path: string[] = [];
    let isMethod = false;
    while (this.atSymbol(".")) {
      this.advance();
      path.push(this.expectNameText());
    }
    if (this.atSymbol(":")) {
      this.advance();
      path.push(this.expectNameText());
      isMethod = true;
    }
    const func = this.parseFunctionBody(isMethod);
    return { type: "FunctionDeclStat", target: { base, path, isMethod }, func };
  }

  private parseFunctionBody(implicitSelf: boolean): FunctionExpr {
    let generics: TypeSpan | undefined;
    if (this.atSymbol("<")) generics = this.parseAngleBracketSpan();
    this.expectSymbol("(");
    const params: Param[] = [];
    let hasVararg = false;
    let varargType: TypeSpan | undefined;
    if (!this.atSymbol(")")) {
      for (;;) {
        if (this.atSymbol("...")) {
          this.advance();
          hasVararg = true;
          if (this.atSymbol(":")) {
            this.advance();
            varargType = this.parseTypeSpan();
          }
          break;
        }
        const name = this.expectNameText();
        let typeAnnotation: TypeSpan | undefined;
        if (this.atSymbol(":")) {
          this.advance();
          typeAnnotation = this.parseTypeSpan();
        }
        params.push({ name, typeAnnotation });
        if (this.atSymbol(",")) {
          this.advance();
          continue;
        }
        break;
      }
    }
    this.expectSymbol(")");
    let returnType: TypeSpan | undefined;
    if (this.atSymbol(":")) {
      this.advance();
      returnType = this.parseTypeSpan();
    }
    const body = this.parseBlock();
    this.expectKeyword("end");
    return { type: "FunctionExpr", params, hasVararg, varargType, implicitSelf, generics, returnType, body };
  }

  private parseTypeAliasStat(exported: boolean): Stat {
    this.advance(); // 'type'
    const name = this.expectNameText();
    let generics: TypeSpan | undefined;
    if (this.atSymbol("<")) generics = this.parseAngleBracketSpan();
    this.expectSymbol("=");
    const definition = this.parseTypeSpan();
    return { type: "TypeAliasStat", name, exported, generics, definition };
  }

  private toAssignTarget(expr: Expr): AssignTarget {
    if (expr.type === "Identifier" || expr.type === "IndexExpr" || expr.type === "MemberExpr") return expr;
    this.fail("Cannot assign to this expression");
  }

  private parseExprStatement(): Stat {
    const first = this.parseSuffixedExpr();
    if (this.atSymbol(",") || this.atSymbol("=") || (this.current().kind === "Symbol" && COMPOUND_OPS.has(this.current().text))) {
      const targets: AssignTarget[] = [this.toAssignTarget(first)];
      while (this.atSymbol(",")) {
        this.advance();
        targets.push(this.toAssignTarget(this.parseSuffixedExpr()));
      }
      if (this.current().kind === "Symbol" && COMPOUND_OPS.has(this.current().text)) {
        if (targets.length > 1) this.fail("Compound assignment cannot have multiple targets");
        const operator = this.advance().text as CompoundOp;
        const value = this.parseExpr();
        return { type: "CompoundAssignStat", operator, target: targets[0], value };
      }
      this.expectSymbol("=");
      const values = this.parseExprList();
      return { type: "AssignStat", targets, values };
    }
    if (first.type === "CallExpr" || first.type === "MethodCallExpr") {
      return { type: "CallStat", call: first };
    }
    this.fail("Syntax error: expression is not a statement");
  }

  // === expressions ===

  private parseExprList(): Expr[] {
    const exprs = [this.parseExpr()];
    while (this.atSymbol(",")) {
      this.advance();
      exprs.push(this.parseExpr());
    }
    return exprs;
  }

  parseExpr(minPrec = 1): Expr {
    let left = this.parseUnary();
    for (;;) {
      const tok = this.current();
      const key = tok.kind === "Keyword" || tok.kind === "Symbol" ? tok.text : undefined;
      const info = key !== undefined ? BINOP_INFO[key] : undefined;
      if (!info || info.level < minPrec) break;
      this.advance();
      const nextMinPrec = info.rightAssoc ? info.level : info.level + 1;
      const right = this.parseExpr(nextMinPrec);
      left = { type: "BinaryExpr", operator: key as BinOp, left, right };
    }
    return left;
  }

  // Unary binds looser than `^` but tighter than every other binop: its
  // operand recurses at UNARY_PRECEDENCE (7), which is high enough that the
  // generic loop above still consumes a following `^` (level 8) before
  // returning, but low enough to stop before `*`/`/`/etc (level 6, already
  // below minPrec so a bare `-x*y` still splits into `(-x)*y` -- wait: `*`
  // is level 6 < 7, so the loop breaks before consuming it, leaving `*y` for
  // the OUTER call, giving `(-x)*y`, matching real Lua semantics.
  private parseUnary(): Expr {
    const tok = this.current();
    const isUnop = (tok.kind === "Keyword" && tok.text === "not") ||
      (tok.kind === "Symbol" && (tok.text === "-" || tok.text === "#"));
    if (isUnop) {
      this.advance();
      const operand = this.parseExpr(UNARY_PRECEDENCE);
      return { type: "UnaryExpr", operator: tok.text as "-" | "not" | "#", operand };
    }
    return this.parseAsExpr();
  }

  // asexp ::= simpleexp ['::' Type] -- a single, non-repeatable annotation.
  private parseAsExpr(): Expr {
    const expr = this.parseSimpleExpr();
    if (this.atSymbol("::")) {
      this.advance();
      const typeAnnotation = this.parseTypeSpan();
      return { type: "TypeAssertionExpr", expr, typeAnnotation };
    }
    return expr;
  }

  private parseSimpleExpr(): Expr {
    const tok = this.current();
    if (tok.kind === "Number") {
      this.advance();
      return { type: "NumberExpr", raw: tok.text };
    }
    if (tok.kind === "String" || tok.kind === "LongString") {
      this.advance();
      return { type: "StringExpr", raw: tok.text };
    }
    if (tok.kind === "InterpStringSegment") return this.parseInterpolatedString();
    if (this.atKeyword("nil")) {
      this.advance();
      return { type: "NilExpr" };
    }
    if (this.atKeyword("true")) {
      this.advance();
      return { type: "TrueExpr" };
    }
    if (this.atKeyword("false")) {
      this.advance();
      return { type: "FalseExpr" };
    }
    if (this.atSymbol("...")) {
      this.advance();
      return { type: "VarargExpr" };
    }
    if (this.atSymbol("{")) return this.parseTableExpr();
    if (this.atKeyword("function")) {
      this.advance();
      return this.parseFunctionBody(false);
    }
    if (this.atKeyword("if")) return this.parseIfExpr();
    return this.parseSuffixedExpr();
  }

  private parseIfExpr(): Expr {
    this.advance();
    const cond = this.parseExpr();
    this.expectKeyword("then");
    const thenExpr = this.parseExpr();
    const elseifs: { cond: Expr; expr: Expr }[] = [];
    while (this.atKeyword("elseif")) {
      this.advance();
      const c = this.parseExpr();
      this.expectKeyword("then");
      const e = this.parseExpr();
      elseifs.push({ cond: c, expr: e });
    }
    this.expectKeyword("else");
    const elseExpr = this.parseExpr();
    return { type: "IfExpr", cond, thenExpr, elseifs, elseExpr };
  }

  private parseInterpolatedString(): Expr {
    if (this.current().kind !== "InterpStringSegment") this.fail("Expected interpolated string segment");
    let seg = this.advance();
    const parts: (string | Expr)[] = [seg.text];
    while (!seg.isLast) {
      parts.push(this.parseExpr());
      if (this.current().kind !== "InterpStringSegment") this.fail("Malformed interpolated string");
      seg = this.advance();
      parts.push(seg.text);
    }
    return { type: "InterpolatedStringExpr", parts };
  }

  private parseTableExpr(): Expr {
    this.advance();
    const fields: TableField[] = [];
    while (!this.atSymbol("}")) {
      if (this.atSymbol("[")) {
        this.advance();
        const key = this.parseExpr();
        this.expectSymbol("]");
        this.expectSymbol("=");
        const value = this.parseExpr();
        fields.push({ kind: "computed", key, value });
      } else if (this.current().kind === "Name" && this.peek(1).kind === "Symbol" && this.peek(1).text === "=") {
        const name = this.advance().text;
        this.advance(); // '='
        const value = this.parseExpr();
        fields.push({ kind: "named", name, value });
      } else {
        fields.push({ kind: "item", value: this.parseExpr() });
      }
      if (this.atSymbol(",") || this.atSymbol(";")) {
        this.advance();
        continue;
      }
      break;
    }
    this.expectSymbol("}");
    return { type: "TableExpr", fields };
  }

  private isCallArgsStart(): boolean {
    const tok = this.current();
    if (tok.kind === "Symbol" && (tok.text === "(" || tok.text === "{")) return true;
    if (tok.kind === "String" || tok.kind === "LongString") return true;
    // Only a genuinely NEW interpolated string (isFirst) can start call-sugar
    // args like `f\`hi\``. A non-first segment is the continuation/closing
    // piece of an interpolation we're already inside parsing -- treating it
    // as call args here would wrongly swallow the enclosing string's tail.
    return tok.kind === "InterpStringSegment" && tok.isFirst === true;
  }

  private parseCallArgs(): Expr[] {
    if (this.atSymbol("(")) {
      this.advance();
      const args = this.atSymbol(")") ? [] : this.parseExprList();
      this.expectSymbol(")");
      return args;
    }
    if (this.atSymbol("{")) return [this.parseTableExpr()];
    const tok = this.current();
    if (tok.kind === "String" || tok.kind === "LongString") {
      this.advance();
      return [{ type: "StringExpr", raw: tok.text }];
    }
    if (tok.kind === "InterpStringSegment") return [this.parseInterpolatedString()];
    this.fail("Expected call arguments");
  }

  private parseSuffixedExpr(): Expr {
    let primary: Expr;
    if (this.atSymbol("(")) {
      this.advance();
      const inner = this.parseExpr();
      this.expectSymbol(")");
      primary = { type: "ParenExpr", expr: inner };
    } else {
      primary = { type: "Identifier", name: this.expectNameText() };
    }
    for (;;) {
      if (this.atSymbol(".")) {
        this.advance();
        primary = { type: "MemberExpr", object: primary, name: this.expectNameText() };
        continue;
      }
      if (this.atSymbol("[")) {
        this.advance();
        const index = this.parseExpr();
        this.expectSymbol("]");
        primary = { type: "IndexExpr", object: primary, index };
        continue;
      }
      if (this.atSymbol(":")) {
        this.advance();
        const method = this.expectNameText();
        const args = this.parseCallArgs();
        primary = { type: "MethodCallExpr", object: primary, method, args };
        continue;
      }
      if (this.isCallArgsStart()) {
        const args = this.parseCallArgs();
        primary = { type: "CallExpr", callee: primary, args };
        continue;
      }
      break;
    }
    return primary;
  }

  // === opaque type spans ===

  private consumeBalanced(open: string, close: string) {
    let depth = 0;
    do {
      if (this.atSymbol(open)) depth += 1;
      else if (this.atSymbol(close)) depth -= 1;
      if (this.is("Eof")) this.fail(`Unbalanced '${open}' in type annotation`);
      this.advance();
    } while (depth > 0);
  }

  private parseTypeSpanAtom() {
    if (this.atSymbol("(")) {
      this.consumeBalanced("(", ")");
      return;
    }
    if (this.atSymbol("{")) {
      this.consumeBalanced("{", "}");
      return;
    }
    if (this.atSymbol("...")) {
      this.advance();
      this.parseTypeSpanAtom();
      return;
    }
    const tok = this.current();
    if (tok.kind === "Name") {
      this.advance();
      while (this.atSymbol(".")) {
        this.advance();
        if (this.current().kind === "Name") this.advance();
        else this.fail("Expected a name in type path");
      }
      if (this.atSymbol("(")) this.consumeBalanced("(", ")");
      if (this.atSymbol("<")) this.consumeBalanced("<", ">");
      return;
    }
    if (tok.kind === "Keyword" || tok.kind === "Number" || tok.kind === "String" || tok.kind === "LongString") {
      this.advance();
      return;
    }
    this.fail("Expected a type", tok);
  }

  private parseTypeSpan(): TypeSpan {
    const startIdx = this.pos;
    this.parseTypeSpanAtom();
    for (;;) {
      if (this.atSymbol("?")) {
        this.advance();
        continue;
      }
      if (this.atSymbol("|") || this.atSymbol("&")) {
        this.advance();
        this.parseTypeSpanAtom();
        continue;
      }
      if (this.atSymbol("->")) {
        this.advance();
        this.parseTypeSpanAtom();
        continue;
      }
      break;
    }
    return { type: "TypeSpan", tokens: this.tokens.slice(startIdx, this.pos) };
  }

  private parseAngleBracketSpan(): TypeSpan {
    const startIdx = this.pos;
    this.consumeBalanced("<", ">");
    return { type: "TypeSpan", tokens: this.tokens.slice(startIdx, this.pos) };
  }
}

export function parse(source: string): ParseResult {
  const { tokens, protectedComments } = tokenize(source);
  const parser = new Parser(tokens);
  const chunk = parser.parseChunk();
  return { chunk, protectedComments };
}
