import type { Expr, Stat } from "./ast";
import type { ResolvedProgram } from "./scope-resolver";
import { collectNames, forEachStat, someBlock } from "./ast-search";
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

// Luau gives each function 200 registers, and locals are not the only
// thing competing for them: every expression under evaluation needs
// temporaries from the same pool. Filling all 200 with named locals leaves
// nothing to compute with, so synthesized declarations stop well short and
// leave the rest as headroom.
export const LOCAL_REGISTER_LIMIT = 200;
export const SYNTHESIZED_LOCAL_CEILING = 180;

// The most locals alive at once inside a function, which is what has to
// fit in its register file. Registers are freed when a block ends, so
// sibling blocks take the larger of the two rather than the sum, while a
// nested block adds to whatever is live around it. Nested functions get
// their own file and are not counted here.
export function functionLocalCount(stats: Stat[]): number {
  let live = 0;
  let peak = 0;
  for (const stat of stats) {
    switch (stat.type) {
      case "LocalStat":
        live += stat.names.length;
        break;
      case "LocalFunctionStat":
        live += 1;
        break;
      case "NumericForStat":
        peak = Math.max(peak, live + 1 + functionLocalCount(stat.body));
        break;
      case "GenericForStat":
        peak = Math.max(peak, live + stat.names.length + functionLocalCount(stat.body));
        break;
      case "DoStat":
      case "WhileStat":
      case "RepeatStat":
        peak = Math.max(peak, live + functionLocalCount(stat.body));
        break;
      case "IfStat": {
        let branch = 0;
        for (const clause of stat.clauses) branch = Math.max(branch, functionLocalCount(clause.body));
        if (stat.elseBody) branch = Math.max(branch, functionLocalCount(stat.elseBody));
        peak = Math.max(peak, live + branch);
        break;
      }
      default:
        break;
    }
    peak = Math.max(peak, live);
  }
  return peak;
}

export function chunkLocalBudget(body: Stat[]): number {
  return Math.max(0, SYNTHESIZED_LOCAL_CEILING - functionLocalCount(body));
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
  // Direct handles on the global table: anything reached through these can
  // replace a global by name without ever assigning to it in this chunk.
  "_G",
  "shared",
  // A metatable on the environment makes a global's value a function call,
  // so reading it once at the top is not the same as reading it each time.
  "getrawmetatable",
  "setrawmetatable",
  "newcclosure",
  "checkcaller",
]);

function touchesEnvironment(body: Stat[]): boolean {
  return someBlock(
    body,
    (e) =>
      (e.type === "Identifier" && ENVIRONMENT_APIS.has(e.name)) ||
      (e.type === "MemberExpr" && ENVIRONMENT_APIS.has(e.name)),
  );
}

export function aliasGlobals(resolved: ResolvedProgram, willRename: boolean): boolean {
  if (detectReflectionRisks(resolved.chunk).size > 0) return false;
  if (touchesEnvironment(resolved.chunk.body)) return false;

  // Reads are counted with one expression sweep; pairing forEachStat with
  // someStat here counted anything inside a nested function once per level
  // of nesting, and the inflated counts bought aliases that grew the output.
  const reads = new Map<string, number>();
  someBlock(resolved.chunk.body, (e) => {
    if (e.type === "Identifier" && e.isGlobal) reads.set(e.name, (reads.get(e.name) ?? 0) + 1);
    return false;
  });
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
  someBlock(resolved.chunk.body, (e) => {
    rewrite(e, aliases);
    return false;
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
