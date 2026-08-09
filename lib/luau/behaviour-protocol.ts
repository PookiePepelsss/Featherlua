export interface BehaviourRequest {
  id: number;
  original: string;
  compressed: string;
}

export type BehaviourResponse =
  | {
      id: number;
      /** Both ran to completion and printed the same thing. */
      verdict: "same";
      /** How many recorded calls and prints were compared. */
      lines: number;
    }
  | { id: number; verdict: "differs"; detail: string }
  | {
      id: number;
      /** Neither run got far enough to compare, so this proves nothing. */
      verdict: "inconclusive";
      detail: string;
    };
