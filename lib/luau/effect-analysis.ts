import type { Expr } from "./ast";

// Expressions in this set cannot call user code, invoke a metamethod,
// throw, allocate an observable object, or read the global environment.
// It is intentionally small: missing a merge costs a few bytes, while a
// false positive can change execution order.
export function isDefinitelyInert(expr: Expr): boolean {
  switch (expr.type) {
    case "NilExpr":
    case "TrueExpr":
    case "FalseExpr":
    case "NumberExpr":
    case "StringExpr":
      return true;
    case "Identifier":
      return expr.symbolId !== undefined;
    case "ParenExpr":
      return isDefinitelyInert(expr.expr);
    default:
      return false;
  }
}

function isDefinitelyValidTableKey(expr: Expr): boolean {
  return (
    expr.type === "TrueExpr" ||
    expr.type === "FalseExpr" ||
    expr.type === "NumberExpr" ||
    expr.type === "StringExpr"
  );
}

// Used only when deleting an unreferenced initializer. Table constructors
// are removable when every field expression is inert and every computed key
// is a literal that cannot be nil/NaN. Unresolved globals are excluded because
// an environment __index can run user code or throw on a read.
export function isRemovableInitializer(expr: Expr): boolean {
  if (isDefinitelyInert(expr)) return true;
  if (expr.type === "FunctionExpr") return true;
  if (expr.type !== "TableExpr") return false;

  return expr.fields.every((field) => {
    if (!isRemovableInitializer(field.value)) return false;
    return field.kind !== "computed" ||
      (isDefinitelyValidTableKey(field.key) && isDefinitelyInert(field.key));
  });
}
