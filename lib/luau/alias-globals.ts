import type { Expr, Stat } from "./ast";
import type { ResolvedProgram } from "./scope-resolver";
import { collectNames, forEachStat, someStat } from "./ast-search";
import { detectReflectionRisks } from "./reflection-risks";

// `local p=print` then `p(x)` pays for itself once a global is read often
// enough. Off by default: the alias captures whatever the global held when
// the chunk started, so anything that replaces the global later, or reaches
// it through the environment (getfenv, hookfunction, getgenv), sees the
// change while the aliased call sites do not.
const DECL_OVERHEAD = 7; // `local ` plus `=`

function assumedNameLength(willRename: boolean) {
  return willRename ? 2 : 8; // `__gNN` once the counter reaches two digits
}

function worthAliasing(name: string, count: number, willRename: boolean) {
  const len = assumedNameLength(willRename);
  return count * len + (DECL_OVERHEAD + len + name.length) < count * name.length;
}

// Luau gives each function 200 local registers. Synthesized declarations
// have to fit in what the chunk has not already spent, or the output stops
// compiling on exactly the large scripts this pass is meant to help.
export const LOCAL_REGISTER_LIMIT = 200;

export function chunkLocalBudget(body: Stat[]): number {
  let used = 0;
  for (const stat of body) {
    if (stat.type === "LocalStat") used += stat.names.length;
    else if (stat.type === "LocalFunctionStat") used += 1;
  }
  return Math.max(0, LOCAL_REGISTER_LIMIT - used);
}

// reflection-risks.ts covers the debug/bytecode APIs. The hazard specific
// to aliasing is different: anything that can read or replace the global
// environment after the chunk starts would be observed by an un-aliased
// call site and missed by an aliased one.
const ENVIRONMENT_APIS = new Set([
  "getfenv",
  "setfenv",
  "getgenv",
  "getrenv",
  "gettenv",
  "hookfunction",
  "hookmetamethod",
  "replaceclosure",
  "setreadonly",
  "loadstring",
  "require",
]);

function touchesEnvironment(body: Stat[]): boolean {
  let found = false;
  forEachStat(body, (stat) => {
    someStat(stat, (e) => {
      if (e.type === "Identifier" && ENVIRONMENT_APIS.has(e.name)) found = true;
      else if (e.type === "MemberExpr" && ENVIRONMENT_APIS.has(e.name)) found = true;
      return false;
    });
  });
  return found;
}

export function aliasGlobals(resolved: ResolvedProgram, willRename: boolean): boolean {
  if (detectReflectionRisks(resolved.chunk).size > 0) return false;
  if (touchesEnvironment(resolved.chunk.body)) return false;

  const reads = new Map<string, number>();
  const assigned = new Set<string>();
  forEachStat(resolved.chunk.body, (stat) => {
    if (stat.type === "AssignStat") {
      for (const t of stat.targets) if (t.type === "Identifier" && t.isGlobal) assigned.add(t.name);
    } else if (stat.type === "CompoundAssignStat") {
      if (stat.target.type === "Identifier" && stat.target.isGlobal) assigned.add(stat.target.name);
    } else if (stat.type === "FunctionDeclStat") {
      const base = stat.target.base;
      if (base.type === "Identifier" && base.isGlobal && stat.target.path.length === 0) assigned.add(base.name);
    }
    someStat(stat, (e) => {
      if (e.type === "Identifier" && e.isGlobal) reads.set(e.name, (reads.get(e.name) ?? 0) + 1);
      return false;
    });
  });

  const chosen = [...reads]
    .filter(([name, count]) => !assigned.has(name) && worthAliasing(name, count, willRename))
    .sort((a, b) => b[1] * b[0].length - a[1] * a[0].length)
    .slice(0, chunkLocalBudget(resolved.chunk.body));
  if (!chosen.length) return false;

  const taken = collectNames(resolved.chunk.body);
  const aliases = new Map<string, string>();
  let counter = 0;
  for (const [name] of chosen) {
    let candidate: string;
    do {
      counter += 1;
      candidate = `__g${counter}`;
    } while (taken.has(candidate));
    taken.add(candidate);
    aliases.set(name, candidate);
  }

  // Assignment targets never reach this rewrite: a global that is assigned
  // anywhere was excluded above, so every remaining occurrence is a read.
  forEachStat(resolved.chunk.body, (stat) => {
    someStat(stat, (e) => {
      rewrite(e, aliases);
      return false;
    });
  });

  const decls: Stat[] = [...aliases].map(([name, alias]) => ({
    type: "LocalStat",
    names: [{ name: alias, synthetic: true }],
    init: [{ type: "Identifier", name, isGlobal: true } as Expr],
  }));
  resolved.chunk.body = [...decls, ...resolved.chunk.body];
  return true;
}

function rewrite(expr: Expr, aliases: Map<string, string>) {
  if (expr.type !== "Identifier" || !expr.isGlobal) return;
  const alias = aliases.get(expr.name);
  if (!alias) return;
  expr.name = alias;
  expr.isGlobal = undefined;
}
