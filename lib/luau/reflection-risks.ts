import type { Chunk, Expr } from "./ast";
import { someBlock } from "./ast-search";

export type ReflectionRisk =
  | "bindings"
  | "constants"
  | "prototypes"
  | "stack"
  | "metadata"
  | "bytecode"
  | "broad";

const REFLECTION_APIS: Record<string, readonly ReflectionRisk[]> = {
  getgc: ["broad"],
  getreg: ["broad"],
  getregistry: ["broad"],
  getupvalue: ["bindings"],
  getupvalues: ["bindings"],
  setupvalue: ["bindings"],
  getlocal: ["bindings", "stack"],
  setlocal: ["bindings", "stack"],
  getconstants: ["constants"],
  getconstant: ["constants"],
  setconstant: ["constants"],
  getproto: ["prototypes"],
  getprotos: ["prototypes"],
  setproto: ["prototypes"],
  getstack: ["stack"],
  setstack: ["stack"],
  getscriptbytecode: ["bytecode"],
  dumpstring: ["bytecode"],
};

const DEBUG_ONLY_APIS: Record<string, readonly ReflectionRisk[]> = {
  info: ["metadata"],
  getinfo: ["metadata"],
};

function stringKey(expr: Expr): string | undefined {
  if (expr.type !== "StringExpr") return undefined;
  const match = /^(?:"([A-Za-z_][A-Za-z0-9_]*)"|'([A-Za-z_][A-Za-z0-9_]*)')$/.exec(expr.raw);
  return match?.[1] ?? match?.[2];
}

function reflectedName(expr: Expr): { name?: string; debugMember: boolean } {
  if (expr.type === "Identifier") return { name: expr.name, debugMember: false };
  if (expr.type === "MemberExpr") {
    return {
      name: expr.name,
      debugMember: expr.object.type === "Identifier" && expr.object.name === "debug",
    };
  }
  if (expr.type === "MethodCallExpr") {
    return {
      name: expr.method,
      debugMember: expr.object.type === "Identifier" && expr.object.name === "debug",
    };
  }
  if (expr.type === "IndexExpr") {
    return {
      name: stringKey(expr.index),
      debugMember: expr.object.type === "Identifier" && expr.object.name === "debug",
    };
  }
  return { debugMember: false };
}

export function detectReflectionRisks(chunk: Chunk): Set<ReflectionRisk> {
  const risks = new Set<ReflectionRisk>();
  someBlock(chunk.body, (expr) => {
    const { name, debugMember } = reflectedName(expr);
    if (!name) return false;
    for (const risk of REFLECTION_APIS[name] ?? []) risks.add(risk);
    if (debugMember) {
      for (const risk of DEBUG_ONLY_APIS[name] ?? []) risks.add(risk);
    }
    return false;
  });
  return risks;
}
