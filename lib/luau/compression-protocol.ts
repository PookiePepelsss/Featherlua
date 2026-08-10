import type { AggressiveOptions } from "./compress-aggressive";
import type { HotPath } from "./hot-paths";

export type CompressionMode = "safe" | "medium" | "aggressive";

export interface CompressionRequest {
  id: number;
  source: string;
  mode: CompressionMode;
  options: AggressiveOptions;
  /** Apply a verified repair and carry on, rather than only offering it. */
  autoRepair: boolean;
}

export type CompressionResponse =
  | {
      id: number;
      ok: true;
      output: string;
      warning?: string;
      durationMs: number;
      rolledBack: string[];
      /** Places the script itself could be quicker. Advice, never applied. */
      hotPaths: HotPath[];
      /** Set when Auto Repair changed the script before compressing it. */
      repaired?: { description: string; line: number; source: string };
    }
  | {
      id: number;
      ok: false;
      error: string;
      /** A single unambiguous edit that makes the script parse and compile,
       * offered rather than applied so the change stays the author's. */
      repair?: { description: string; line: number; fixed: string };
    };
