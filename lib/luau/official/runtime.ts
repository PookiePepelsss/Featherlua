import createLuauModule from "./luau-module.js";

export const OFFICIAL_LUAU_REVISION = "736e1d985f5a3315333e51f5b225b84a3fc3e6b6";
export const OFFICIAL_LUAU_WASM_SHA256 = "c3b4c08a083b9834ad1e2678a6e30a5933962bd50f2a2191e0861640a19d6ced";

export interface LuauModule {
  ccall(name: string, returnType: string | null, argTypes: string[], args: unknown[]): string | null;
}

export interface CompileResult {
  success: boolean;
  error?: string;
}

export interface ExecuteResult {
  success: boolean;
  output: string;
  error?: string;
}

export async function verifyOfficialLuauWasm(wasmBinary: Uint8Array) {
  const copy = Uint8Array.from(wasmBinary);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  const actual = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  if (actual !== OFFICIAL_LUAU_WASM_SHA256) {
    throw new Error("Official Luau compiler integrity check failed.");
  }
}

export async function createOfficialLuau(wasmBinary: Uint8Array): Promise<LuauModule> {
  return createLuauModule({
    wasmBinary,
    print: () => undefined,
    printErr: () => undefined,
  }) as Promise<LuauModule>;
}

export function compileWithOfficialLuau(module: LuauModule, source: string): CompileResult {
  const result = module.ccall(
    "luau_dump_bytecode",
    "string",
    ["string", "number", "number", "number", "number"],
    [source, 1, 1, 99, 0],
  );
  if (!result) return { success: false, error: "The compiler returned no result." };
  return JSON.parse(result) as CompileResult;
}

export function executeWithOfficialLuau(module: LuauModule, source: string): ExecuteResult {
  const result = module.ccall("luau_execute", "string", ["string"], [source]);
  if (!result) return { success: false, output: "", error: "The runtime returned no result." };
  return JSON.parse(result) as ExecuteResult;
}
