import type { AggressiveOptions } from "./compress-aggressive";
import type { LuaDialect } from "./dialects";

export type CompressionMode = "safe" | "aggressive";

export interface CompressionRequest {
  id: number;
  source: string;
  dialect: LuaDialect;
  mode: CompressionMode;
  options: AggressiveOptions;
}

export type CompressionResponse =
  | {
      id: number;
      ok: true;
      output: string;
      warning?: string;
      durationMs: number;
      validation: "official-luau" | "lexical";
      rolledBack: string[];
    }
  | { id: number; ok: false; error: string };
