export type LuaDialect = "luau" | "lua51" | "lua52" | "lua53" | "lua54" | "luajit";

export const DIALECTS: ReadonlyArray<{ value: LuaDialect; label: string }> = [
  { value: "luau", label: "Luau" },
  { value: "lua51", label: "Lua 5.1" },
  { value: "lua52", label: "Lua 5.2" },
  { value: "lua53", label: "Lua 5.3" },
  { value: "lua54", label: "Lua 5.4" },
  { value: "luajit", label: "LuaJIT 2.x" },
];

export function dialectLabel(dialect: LuaDialect): string {
  return DIALECTS.find((item) => item.value === dialect)?.label ?? dialect;
}
