import type { Token } from "./tokens";

export interface Chunk {
  type: "Chunk";
  body: Stat[];
}

export type Stat =
  | LocalStat
  | LocalFunctionStat
  | FunctionDeclStat
  | AssignStat
  | CompoundAssignStat
  | CallStat
  | DoStat
  | WhileStat
  | RepeatStat
  | IfStat
  | NumericForStat
  | GenericForStat
  | ReturnStat
  | BreakStat
  | ContinueStat
  | TypeAliasStat;

export interface LocalStat {
  type: "LocalStat";
  names: LocalName[];
  init: Expr[];
}

export interface LocalFunctionStat {
  type: "LocalFunctionStat";
  name: string;
  symbolId?: number;
  func: FunctionExpr;
}

export interface FunctionDeclStat {
  type: "FunctionDeclStat";
  target: FunctionName;
  func: FunctionExpr;
}

export interface AssignStat {
  type: "AssignStat";
  targets: AssignTarget[];
  values: Expr[];
}

export type CompoundOp = "+=" | "-=" | "*=" | "/=" | "//=" | "%=" | "^=" | "..=";

export interface CompoundAssignStat {
  type: "CompoundAssignStat";
  operator: CompoundOp;
  target: AssignTarget;
  value: Expr;
}

export interface CallStat {
  type: "CallStat";
  call: CallExpr | MethodCallExpr;
}

export interface DoStat {
  type: "DoStat";
  body: Stat[];
}

export interface WhileStat {
  type: "WhileStat";
  cond: Expr;
  body: Stat[];
}

export interface RepeatStat {
  type: "RepeatStat";
  body: Stat[];
  cond: Expr;
}

export interface IfStat {
  type: "IfStat";
  clauses: { cond: Expr; body: Stat[] }[];
  elseBody?: Stat[];
}

export interface NumericForStat {
  type: "NumericForStat";
  varName: string;
  symbolId?: number;
  start: Expr;
  stop: Expr;
  step?: Expr;
  body: Stat[];
}

export interface GenericForStat {
  type: "GenericForStat";
  names: string[];
  symbolIds?: number[];
  exprs: Expr[];
  body: Stat[];
}

export interface ReturnStat {
  type: "ReturnStat";
  args: Expr[];
}

export interface BreakStat {
  type: "BreakStat";
}

export interface ContinueStat {
  type: "ContinueStat";
}

export interface TypeAliasStat {
  type: "TypeAliasStat";
  name: string;
  exported: boolean;
  generics?: TypeSpan;
  definition: TypeSpan;
}

export type AssignTarget = Identifier | IndexExpr | MemberExpr;

export interface LocalName {
  name: string;
  symbolId?: number;
  attrib?: "const" | "close";
  typeAnnotation?: TypeSpan;
  /** Set on locals synthesized by an optimization pass (e.g.
   * hoist-repeated-strings.ts) so constant-propagate.ts can leave them
   * alone -- propagating a literal back into every use site would
   * silently undo the hoist that created this declaration. */
  synthetic?: boolean;
}

export interface Param {
  name: string;
  symbolId?: number;
  typeAnnotation?: TypeSpan;
}

/** `a.b.c` (FunctionDeclStat target) or `a.b.c:d` (isMethod). `base` is the
 * resolvable leading identifier expression; `path` segments are plain
 * strings and are never renamed (they're member names, not locals). */
export interface FunctionName {
  base: Expr;
  path: string[];
  isMethod: boolean;
}

export type Expr =
  | NilExpr
  | TrueExpr
  | FalseExpr
  | VarargExpr
  | NumberExpr
  | StringExpr
  | InterpolatedStringExpr
  | Identifier
  | IndexExpr
  | MemberExpr
  | CallExpr
  | MethodCallExpr
  | FunctionExpr
  | TableExpr
  | BinaryExpr
  | UnaryExpr
  | TypeAssertionExpr
  | IfExpr
  | ParenExpr;

export interface NilExpr { type: "NilExpr" }
export interface TrueExpr { type: "TrueExpr" }
export interface FalseExpr { type: "FalseExpr" }
export interface VarargExpr { type: "VarargExpr" }

export interface NumberExpr {
  type: "NumberExpr";
  raw: string;
}

/** Quoted (`'...'`/`"..."`) or long-bracket (`[[...]]`) string, verbatim. */
export interface StringExpr {
  type: "StringExpr";
  raw: string;
}

/** `parts[0]` and `parts[last]` are always the leading/trailing string
 * segments (possibly empty); they alternate string/Expr. */
export interface InterpolatedStringExpr {
  type: "InterpolatedStringExpr";
  parts: (string | Expr)[];
}

export interface Identifier {
  type: "Identifier";
  name: string;
  symbolId?: number;
  isGlobal?: boolean;
}

/** `object[index]` */
export interface IndexExpr {
  type: "IndexExpr";
  object: Expr;
  index: Expr;
}

/** `object.name` -- `name` is never renamed. */
export interface MemberExpr {
  type: "MemberExpr";
  object: Expr;
  name: string;
}

export interface CallExpr {
  type: "CallExpr";
  callee: Expr;
  args: Expr[];
}

/** `object:method(args)` -- `method` is never renamed. */
export interface MethodCallExpr {
  type: "MethodCallExpr";
  object: Expr;
  method: string;
  args: Expr[];
}

export interface FunctionExpr {
  type: "FunctionExpr";
  params: Param[];
  hasVararg: boolean;
  /** Type annotation on `...` itself, e.g. `function f(...: number)`. */
  varargType?: TypeSpan;
  implicitSelf: boolean;
  /** Set by scope-resolver when implicitSelf is true: the synthesized `self`
   * symbol's id, so references to `self` in the body resolve like any other
   * declared local. Never assigned a rename (Luau's `:` call sugar always
   * binds the literal name `self`; there's no way to call it anything else
   * while still using colon-call syntax), but still needs a declaration
   * anchor for scope resolution and alpha-equivalence comparison. */
  selfSymbolId?: number;
  generics?: TypeSpan;
  returnType?: TypeSpan;
  body: Stat[];
}

export type TableField =
  | { kind: "item"; value: Expr }
  | { kind: "named"; name: string; value: Expr }
  | { kind: "computed"; key: Expr; value: Expr };

export interface TableExpr {
  type: "TableExpr";
  fields: TableField[];
}

export type BinOp =
  | "or" | "and"
  | "<" | ">" | "<=" | ">=" | "~=" | "=="
  | ".."
  | "+" | "-"
  | "*" | "/" | "//" | "%"
  | "^";

export interface BinaryExpr {
  type: "BinaryExpr";
  operator: BinOp;
  left: Expr;
  right: Expr;
}

export interface UnaryExpr {
  type: "UnaryExpr";
  operator: "-" | "not" | "#";
  operand: Expr;
}

/** `expr :: Type` -- per Luau's grammar (`asexp ::= simpleexp ['::' Type]`)
 * this is a single, non-repeatable annotation directly on a simpleexp,
 * binding tighter than unary and all binary operators. To double-assert,
 * source must use explicit parens: `(x :: number) :: string`. */
export interface TypeAssertionExpr {
  type: "TypeAssertionExpr";
  expr: Expr;
  typeAnnotation: TypeSpan;
}

export interface IfExpr {
  type: "IfExpr";
  cond: Expr;
  thenExpr: Expr;
  elseifs: { cond: Expr; expr: Expr }[];
  elseExpr: Expr;
}

/** `(expr)` -- NOT cosmetic. Truncates a multi-value expression (a call or
 * `...`) to exactly one value, which is semantically observable. The
 * printer must always emit real parens for this node. */
export interface ParenExpr {
  type: "ParenExpr";
  expr: Expr;
}

/** Opaque, verbatim-reprinted type annotation. Never parsed into a typed
 * AST, never touched by renaming (type annotations are erased at runtime
 * in Luau, so this has no behavioral effect -- see plan for the accepted
 * limitation this implies for `typeof(x)` references). */
export interface TypeSpan {
  type: "TypeSpan";
  tokens: Token[];
}
