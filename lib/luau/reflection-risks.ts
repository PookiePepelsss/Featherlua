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

// Looked up with names taken straight from the script, so this has to be a
// Map: a plain object answers `constructor`, `toString` and every other
// Object.prototype key with something that is not a risk list at all, and
// a script with a field called `constructor` crashed the compressor.
const REFLECTION_APIS = new Map<string, readonly ReflectionRisk[]>(Object.entries({
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
}));

const DEBUG_ONLY_APIS = new Map<string, readonly ReflectionRisk[]>(Object.entries({
  info: ["metadata"],
  getinfo: ["metadata"],
}));

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

export interface ReflectionUsage {
  risks: Set<ReflectionRisk>;
  apis: Set<string>;
}

export function detectReflectionUsage(chunk: Chunk): ReflectionUsage {
  const risks = new Set<ReflectionRisk>();
  const apis = new Set<string>();
  someBlock(chunk.body, (expr) => {
    const { name, debugMember } = reflectedName(expr);
    if (!name) return false;
    const directRisks = REFLECTION_APIS.get(name) ?? [];
    for (const risk of directRisks) risks.add(risk);
    if (directRisks.length) apis.add(debugMember ? `debug.${name}` : name);
    if (debugMember) {
      const debugRisks = DEBUG_ONLY_APIS.get(name) ?? [];
      for (const risk of debugRisks) risks.add(risk);
      if (debugRisks.length) apis.add(`debug.${name}`);
    }
    return false;
  });
  return { risks, apis };
}

export function detectReflectionRisks(chunk: Chunk): Set<ReflectionRisk> {
  return detectReflectionUsage(chunk).risks;
}
