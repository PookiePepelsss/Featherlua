import { bench, describe } from "vitest";
import { compressAggressive } from "../compress-aggressive";
import { compressSafe } from "../compress-safe";
import { corpusScenarios } from "./corpus-scenarios";

const source = corpusScenarios.map((item) => item.source).join("\n");

describe("compression throughput", () => {
  bench("safe corpus", () => {
    compressSafe(source);
  });
  bench("aggressive corpus with rollback", () => {
    compressAggressive(source);
  });
});
