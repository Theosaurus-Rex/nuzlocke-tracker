/**
 * Hand-run check that every roster species in src/game/data/ is a real PokéAPI pokemon name.
 * Needs a network connection. See README.md "Game data". Exits non-zero on any unknown name.
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(REPO_ROOT, "src/game/data");
const POKEAPI_BASE = "https://pokeapi.co/api/v2";

const response = await fetch(`${POKEAPI_BASE}/pokemon?limit=100000`);
if (!response.ok) {
  console.error(`PokéAPI pokemon list failed: ${String(response.status)}`);
  process.exit(1);
}
const known = new Set(
  ((await response.json()) as { results: { name: string }[] }).results.map((entry) => entry.name),
);

const SPECIES = /species:\s*"([^"]*)"/g;
const unknown: string[] = [];
let checked = 0;

for (const game of readdirSync(DATA_DIR, { withFileTypes: true })) {
  if (!game.isDirectory()) continue;
  const file = path.join(DATA_DIR, game.name, "fights.ts");
  for (const match of readFileSync(file, "utf8").matchAll(SPECIES)) {
    checked += 1;
    const name = match[1] ?? "";
    if (!known.has(name)) unknown.push(`${game.name}: "${name}"`);
  }
}

if (unknown.length > 0) {
  console.error(`Unknown species:\n${unknown.map((line) => `  ${line}`).join("\n")}`);
  process.exit(1);
}
console.log(`All ${String(checked)} roster species are real PokéAPI names.`);
