import type { AggressiveOptions } from "./compress-aggressive";

export type CompressionMode = "safe" | "aggressive";

export interface CompressionRequest {
  id: number;
  source: string;
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
      rolledBack: string[];
    }
  | { id: number; ok: false; error: string };
