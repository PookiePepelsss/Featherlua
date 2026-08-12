import { describe, expect, it } from "vitest";
import { compressAggressive } from "../compress-aggressive";
import { parse } from "../parser";

function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function program(seed: number) {
  const next = random(seed);
  const number = () => Math.floor(next() * 101) - 50;
  const operators = ["+", "-", "*", "%"];
  const lines = [`local value${seed}=${number()}`, `local total${seed}=${number()}`];
  for (let index = 0; index < 8; index += 1) {
    const operator = operators[Math.floor(next() * operators.length)];
    const target = next() > 0.5 ? `value${seed}` : `total${seed}`;
    lines.push(`${target}=${target}${operator}${Math.abs(number()) + 1}`);
  }
  lines.push(`if value${seed}>total${seed} then total${seed}=value${seed} else value${seed}=total${seed} end`);
  lines.push(`return value${seed},total${seed}`);
  return lines.join("\n");
}

describe("deterministic generated programs", () => {
  it("compresses and reparses 250 generated programs without growing them", { timeout: 120_000 }, () => {
    for (let seed = 1; seed <= 250; seed += 1) {
      const source = program(seed);
      const result = compressAggressive(source);
      expect(result.ok, `seed ${seed}`).toBe(true);
      if (!result.ok) continue;
      expect(() => parse(result.output), `seed ${seed}`).not.toThrow();
      expect(result.output.length, `seed ${seed}`).toBeLessThanOrEqual(source.length);
    }
  });
});
