import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

export interface Fixture {
  name: string;
  source: string;
}

export function loadFixtures(): Fixture[] {
  return readdirSync(FIXTURES_DIR)
    .filter((name) => name.endsWith(".luau"))
    .sort()
    .map((name) => ({ name, source: readFileSync(join(FIXTURES_DIR, name), "utf8") }));
}
