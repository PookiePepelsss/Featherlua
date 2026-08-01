import type { Expr } from "./ast";

// Keep this deliberately conservative; it gates evaluation-order changes.
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
