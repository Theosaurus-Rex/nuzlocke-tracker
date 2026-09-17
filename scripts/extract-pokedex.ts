/**
 * Generator for the pokedex data: species, moves, abilities, items and evolution links across
 * every Pokemon generation (National Dex, currently 1-1025) plus hidden abilities (Gen 5+).
 *
 * Source: PokeAPI (https://pokeapi.co/), free and unauthenticated. This script fetches several
 * thousand resources across species/moves/abilities/evolution-chains/items/version-groups, so
 * it is polite about it: every response is cached to disk (see CACHE_DIR below) and re-read on
 * rerun, and requests are throttled to a modest concurrency rather than fired all at once.
 *
 * This script does NOT run at build or test time — the emitted modules under
 * src/game/data/pokedex/ are what ships (see CLAUDE.md "Why no backend" and the architectural
 * constraint this issue was scoped under: the app must never call PokeAPI at runtime). It is a
 * one-shot bootstrapper (see CLAUDE.md "Game data" — decided 2026-09-18): run it once to seed
 * this kind of data, by hand:
 *
 *   POKEDEX_CACHE_DIR=/path/to/scratch/cache node scripts/extract-pokedex.ts
 *
 * If POKEDEX_CACHE_DIR is not set, it defaults to a directory under the OS temp dir. The cache
 * is never committed (see .gitignore) — only the generated src/game/data/pokedex/*.ts files are.
 *
 * After that first seed, the emitted files are ours — hand-edit them directly for corrections,
 * trims or tuning, and note why in a comment beside the change. This script refuses to
 * overwrite a directory that already has output; see refuseIfAlreadyPopulated below and pass
 * --force only if you mean to re-seed from scratch.
 *
 * ---------------------------------------------------------------------------------------------
 * THE TRAP: PokeAPI serves PRESENT-DAY values by default, not the value for any particular gen.
 * ---------------------------------------------------------------------------------------------
 * Pickers are free-text across all generations (a randomiser or romhack can put anything
 * anywhere — see CLAUDE.md "Game data"), so this dataset does not collapse to one target
 * generation the way the original Gen 4-only extraction did. Instead, the FULL history is kept
 * in the emitted data and resolved at read time by src/game/pokedex.ts `pokedexFor(generation)`.
 * This file's job is just to get that history out of PokeAPI's two different tagging schemes and
 * into one consistent "valid through generation N" shape:
 *
 * - Pokemon `types` / `past_types`: a `past_types` entry is tagged with a `generation` and
 *   means "the type was THIS, for this generation and every earlier one; it changes starting
 *   the next recorded generation (or the top-level current value, if this is the last entry)".
 *   Confirmed against Clefairy: past_types has one entry tagged generation-v (Normal), and
 *   Clefairy is genuinely Normal through Gen 5, Fairy from Gen 6 (Fairy didn't exist before
 *   then) — so "generation tag N, value V" = "V applies for generation <= N". This is already
 *   the exact shape we want to emit (see PastTypes in ./types.ts): copy straight across as
 *   `{ throughGeneration: N, types: V }`, sorted ascending.
 *
 * - Move `power`/`accuracy`/`pp`/`type` / `past_values`: a `past_values` entry is tagged with a
 *   `version_group` and means the OPPOSITE direction: "value V applied for every version group
 *   strictly BEFORE this tag; starting at this tag, the value has already changed to whatever
 *   the next entry (or the current top-level value) says." To get this into the same
 *   "throughGeneration" shape as past_types, each entry is converted to
 *   `throughGeneration = generationOf(taggedVersionGroup) - 1` — i.e. "the old value is only
 *   GUARANTEED to hold through the generation before the tag's own". This deliberately collapses
 *   to whole-generation granularity: a change that happens strictly WITHIN a generation (at a
 *   version group that isn't that generation's first) gets rounded down to the previous
 *   generation's boundary. This is a known, accepted limitation — it does not affect any
 *   generation this dataset is tested against (see src/game/pokedex.test.ts), because the one
 *   move where PokeAPI records an intra-Gen4 tag (Vine Whip, tagged diamond-pearl — Gen 4's OWN
 *   first version group) never actually produces a different answer within Gen 4: the following
 *   x-y-tagged entry (throughGeneration 5) is what every Gen 4 target resolves through, exactly
 *   as the diamond-pearl tag (throughGeneration 3) predicts by falling one generation short of
 *   it. Resolution itself (src/game/pokedex.ts `pokedexFor`) mirrors past_types: per field, walk
 *   the sorted-ascending qualifying entries (`throughGeneration >= target`) and take the first
 *   non-null value, else fall back to the move's current top-level value.
 *
 * NOTE: this direction genuinely differs between the two endpoints (generation-tagged
 * "up to and including" for past_types vs version-group-tagged "strictly before" for moves'
 * past_values) — do not assume they are the same rule.
 *
 * Spot-checked against Bulbapedia (see src/game/pokedex.test.ts): Vine Whip (35 power / 15 pp
 * Gen 4-5, 45/25 Gen 6+), Tackle (35 power / 95 accuracy through Gen 4, 40/100 from Gen VII),
 * Bite (Normal pre-Gen 2, Dark from Gold/Silver on, power/accuracy/pp unchanged).
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(REPO_ROOT, "src/game/data/pokedex");
const CACHE_DIR = process.env.POKEDEX_CACHE_DIR ?? path.join(os.tmpdir(), "nuzlocke-pokeapi-cache");
const GENERATED_FILES = ["species.ts", "moves.ts", "abilities.ts", "items.ts"] as const;

const API_BASE = "https://pokeapi.co/api/v2";
const CONCURRENCY = 8;

// ---------------------------------------------------------------------------
// Guard against clobbering hand-owned data
// ---------------------------------------------------------------------------

/**
 * Refuses to write into a directory that already holds generated output.
 *
 * The committed files under src/game/data/ are hand-owned once seeded (CLAUDE.md "Game
 * data" — decided 2026-09-18): a generator is a one-shot bootstrapper, not something re-run
 * for data that already exists. Under the old "output is reproducible" model a stray re-run
 * was harmless; under this one it silently overwrites every hand correction with whatever
 * upstream says today. So refuse outright unless the caller explicitly forces it.
 */
function refuseIfAlreadyPopulated(
  outDir: string,
  expectedFiles: readonly string[],
  forceOverride: boolean,
): void {
  if (forceOverride) return;
  const alreadyPopulated = expectedFiles.some((name) => existsSync(path.join(outDir, name)));
  if (!alreadyPopulated) return;

  console.error(
    `Refusing to write: ${outDir} already contains generated files.\n\n` +
      'These files are hand-owned now (see CLAUDE.md "Game data") — corrections belong in the\n' +
      "data itself, not in this generator. Re-running it here would silently overwrite every\n" +
      "hand correction with today's upstream values.\n\n" +
      "Pass --force if that is genuinely what you want, then run\n" +
      `  git diff ${outDir}\n` +
      "afterwards to review exactly what changed.",
  );
  process.exit(1);
}

/**
 * Shadow moves (Pokemon Colosseum/XD) are assigned ids >= 10000 by PokeAPI and are not part of
 * the National Move Dex numbering (which runs contiguously from 1). They are a console-spinoff
 * mechanic, out of scope for a mainline-game Nuzlocke tracker, and are excluded outright.
 */
const SHADOW_MOVE_ID_FLOOR = 10000;

// ---------------------------------------------------------------------------
// Curated item list: held items, evolution items/stones, and a representative set of berries
// across every generation that matter for a Nuzlocke tracker. Not exhaustive — PokeAPI has
// ~2000 items and most (TMs, key items, mail, etc.) are out of scope. Mega stones, Z-crystals
// and Dynamax-related items are deliberately excluded: those mechanics don't exist outside the
// generations that introduced them, unlike a held item or evolution stone a randomiser can hand
// out anywhere. See CLAUDE.md: "Use judgement; completeness matters less than correctness."
// ---------------------------------------------------------------------------
const CURATED_ITEM_SLUGS: readonly string[] = [
  // Evolution items and stones
  "fire-stone",
  "water-stone",
  "thunder-stone",
  "leaf-stone",
  "moon-stone",
  "sun-stone",
  "shiny-stone",
  "dusk-stone",
  "dawn-stone",
  "ice-stone",
  "oval-stone",
  "everstone",
  "up-grade",
  "dubious-disc",
  "protector",
  "electirizer",
  "magmarizer",
  "reaper-cloth",
  "razor-claw",
  "razor-fang",
  "deep-sea-tooth",
  "deep-sea-scale",
  "metal-coat",
  "kings-rock",
  "dragon-scale",
  // Held battle items
  "leftovers",
  "choice-band",
  "choice-specs",
  "choice-scarf",
  "life-orb",
  "focus-sash",
  "expert-belt",
  "quick-claw",
  "bright-powder",
  "wide-lens",
  "zoom-lens",
  "muscle-band",
  "wise-glasses",
  "metronome",
  "shell-bell",
  "black-sludge",
  "soul-dew",
  "light-ball",
  "thick-club",
  "metal-powder",
  "lucky-egg",
  "stick",
  "toxic-orb",
  "flame-orb",
  "iron-ball",
  "sticky-barb",
  "eviolite",
  "rocky-helmet",
  "assault-vest",
  "weakness-policy",
  "air-balloon",
  "safety-goggles",
  "mental-herb",
  "white-herb",
  "big-root",
  "float-stone",
  "red-card",
  // Berries
  "oran-berry",
  "sitrus-berry",
  "lum-berry",
  "chesto-berry",
  "pecha-berry",
  "persim-berry",
  "leppa-berry",
  "salac-berry",
  "petaya-berry",
  "liechi-berry",
  "custap-berry",
  "starf-berry",
  "figy-berry",
];

/** The 18 real elemental types (excludes "unknown", which is move-only — see ./types.ts). */
const ALL_TYPES = new Set([
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
]);

/** Move types only: the 18 real types plus PokeAPI's "unknown" ("???") placeholder (Curse). */
const MOVE_TYPES = new Set([...ALL_TYPES, "unknown"]);

/** Every move must resolve to exactly one of these. */
const DAMAGE_CLASSES = new Set(["physical", "special", "status"]);

// ---------------------------------------------------------------------------
// Cached, throttled fetch
// ---------------------------------------------------------------------------

function cacheKeyFor(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/[^a-zA-Z0-9]+/g, "_") + ".json";
}

async function fetchJson(url: string): Promise<unknown> {
  const cachePath = path.join(CACHE_DIR, cacheKeyFor(url));
  if (existsSync(cachePath)) {
    return JSON.parse(readFileSync(cachePath, "utf8")) as unknown;
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${String(res.status)} for ${url}`);
      const text = await res.text();
      mkdirSync(CACHE_DIR, { recursive: true });
      writeFileSync(cachePath, text);
      return JSON.parse(text) as unknown;
    } catch (err) {
      lastError = err;
      await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
    }
  }
  throw new Error(`failed to fetch ${url}: ${String(lastError)}`);
}

/** Runs `fn` over `items` with at most `limit` in flight at once. */
async function mapPool<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    for (;;) {
      const i = next;
      next += 1;
      if (i >= items.length) return;
      const item = items[i];
      if (item === undefined) continue;
      results[i] = await fn(item, i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

function idFromUrl(url: string): number {
  const match = /\/(\d+)\/?$/.exec(url);
  if (match?.[1] === undefined) throw new Error(`could not extract id from url: ${url}`);
  return Number(match[1]);
}

// ---------------------------------------------------------------------------
// Minimal shapes of the PokeAPI JSON we read. Only the fields we use.
// ---------------------------------------------------------------------------

interface NamedRef {
  name: string;
  url: string;
}

interface PokemonAbilityEntry {
  is_hidden: boolean;
  slot: number;
  ability: NamedRef | null;
}

interface PokemonJson {
  id: number;
  name: string;
  types: { slot: number; type: NamedRef }[];
  past_types: { generation: NamedRef; types: { slot: number; type: NamedRef }[] }[];
  abilities: PokemonAbilityEntry[];
  stats: { base_stat: number; stat: NamedRef }[];
}

interface SpeciesJson {
  id: number;
  name: string;
  generation: NamedRef;
  evolution_chain: NamedRef;
}

interface EvolutionChainNode {
  species: NamedRef;
  evolves_to: EvolutionChainNode[];
}

interface EvolutionChainJson {
  chain: EvolutionChainNode;
}

interface MovePastValueEntry {
  version_group: NamedRef;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  type: NamedRef | null;
}

interface MoveJson {
  id: number;
  name: string;
  generation: NamedRef;
  type: NamedRef;
  damage_class: NamedRef;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  past_values: MovePastValueEntry[];
}

interface AbilityJson {
  id: number;
  name: string;
  generation: NamedRef;
  effect_entries: { effect: string; short_effect: string; language: NamedRef }[];
}

interface ItemJson {
  id: number;
  name: string;
  category: NamedRef;
  effect_entries: { short_effect: string; language: NamedRef }[];
}

interface VersionGroupJson {
  id: number;
  name: string;
  generation: NamedRef;
}

interface NamedApiResourceList {
  count: number;
  results: NamedRef[];
}

// ---------------------------------------------------------------------------
// Generation resolution helpers
// ---------------------------------------------------------------------------

/** generation.url looks like ".../generation/4/" — the resource id IS the generation number. */
function generationNumber(ref: NamedRef): number {
  return idFromUrl(ref.url);
}

/** Sorted ascending by throughGeneration, one entry per past_types tag — see header comment. */
function pastTypesOf(pokemon: PokemonJson): { throughGeneration: number; types: string[] }[] {
  return pokemon.past_types
    .map((entry) => ({
      throughGeneration: generationNumber(entry.generation),
      types: entry.types.toSorted((a, b) => a.slot - b.slot).map((t) => t.type.name),
    }))
    .toSorted((a, b) => a.throughGeneration - b.throughGeneration);
}

function currentTypesOf(pokemon: PokemonJson): string[] {
  return pokemon.types.toSorted((a, b) => a.slot - b.slot).map((t) => t.type.name);
}

/** All non-null ability slots, hidden included (marked, not dropped) — see header comment. */
function abilitiesOf(pokemon: PokemonJson): { name: string; isHidden: boolean }[] {
  const withAbility = pokemon.abilities.filter(
    (a): a is PokemonAbilityEntry & { ability: NamedRef } => a.ability !== null,
  );
  return withAbility
    .toSorted((a, b) => a.slot - b.slot)
    .map((a) => ({ name: a.ability.name, isHidden: a.is_hidden }));
}

/**
 * Converts one move's past_values (version-group-tagged, "applies strictly before this tag")
 * into the "throughGeneration" shape (generation-tagged, "applies through this generation
 * inclusive") that past_types already uses natively. See the header comment for the direction
 * flip and the accepted whole-generation-granularity limitation.
 */
function pastValuesOf(
  move: MoveJson,
  vgIdToGen: Map<number, number>,
): {
  throughGeneration: number;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  type: string | null;
}[] {
  return move.past_values
    .map((entry) => {
      const vgId = idFromUrl(entry.version_group.url);
      const gen = vgIdToGen.get(vgId);
      if (gen === undefined) throw new Error(`unknown version group id ${String(vgId)}`);
      return {
        throughGeneration: gen - 1,
        power: entry.power,
        accuracy: entry.accuracy,
        pp: entry.pp,
        type: entry.type === null ? null : entry.type.name,
      };
    })
    .toSorted((a, b) => a.throughGeneration - b.throughGeneration);
}

// ---------------------------------------------------------------------------
// Emit helpers
// ---------------------------------------------------------------------------

function quote(value: string): string {
  return JSON.stringify(value);
}

function quoteOrNull(value: string | null): string {
  return value === null ? "null" : quote(value);
}

function numberOrNull(value: number | null): string {
  return value === null ? "null" : String(value);
}

const GENERATED_HEADER = (subject: string) => `/**
 * ${subject}
 *
 * Bootstrapped by scripts/extract-pokedex.ts from PokeAPI (https://pokeapi.co/). This file is
 * hand-owned now (CLAUDE.md "Game data") — edit it directly and note why in a comment beside
 * the change.
 *
 * Spans every generation. Types and move stats are stored as present-day (current) values plus
 * a history (\`pastTypes\` / \`pastValues\`); resolve against a specific generation with
 * \`pokedexFor(generation)\` in src/game/pokedex.ts, never by reading these fields directly. See
 * ./types.ts for the resolution rule and scripts/extract-pokedex.ts for how the history is
 * derived.
 */
`;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const force = process.argv.slice(2).includes("--force");
  refuseIfAlreadyPopulated(OUT_DIR, GENERATED_FILES, force);

  console.log(`Cache: ${CACHE_DIR}`);
  mkdirSync(OUT_DIR, { recursive: true });

  // --- version groups: build version-group id -> generation number map ---
  const vgList = (await fetchJson(`${API_BASE}/version-group/?limit=100`)) as NamedApiResourceList;
  const versionGroups = await mapPool(vgList.results, CONCURRENCY, async (ref) => {
    return (await fetchJson(ref.url)) as VersionGroupJson;
  });
  const vgIdToGen = new Map<number, number>(
    versionGroups.map((vg) => [vg.id, generationNumber(vg.generation)]),
  );

  // --- species: discover the authoritative id range, then fetch /pokemon/{id} and
  // /pokemon-species/{id} for every one of them ---
  const speciesList = (await fetchJson(
    `${API_BASE}/pokemon-species/?limit=2000`,
  )) as NamedApiResourceList;
  const speciesIds = speciesList.results.map((r) => idFromUrl(r.url)).toSorted((a, b) => a - b);
  const maxSpeciesId = speciesIds[speciesIds.length - 1];
  if (maxSpeciesId === undefined) throw new Error("pokemon-species list was empty");
  if (speciesIds.length !== maxSpeciesId) {
    throw new Error(
      `expected species ids 1..${String(maxSpeciesId)} contiguous, got ${String(speciesIds.length)} ids`,
    );
  }
  console.log(`Species: ${String(speciesIds.length)} (national dex 1-${String(maxSpeciesId)})`);

  const pokemonJsons = await mapPool(speciesIds, CONCURRENCY, async (id) => {
    return (await fetchJson(`${API_BASE}/pokemon/${String(id)}`)) as PokemonJson;
  });
  const speciesJsons = await mapPool(speciesIds, CONCURRENCY, async (id) => {
    return (await fetchJson(`${API_BASE}/pokemon-species/${String(id)}`)) as SpeciesJson;
  });

  for (const [i, id] of speciesIds.entries()) {
    const p = pokemonJsons[i];
    const s = speciesJsons[i];
    if (p === undefined || s === undefined || p.id !== id || s.id !== id) {
      throw new Error(`species id mismatch at index ${String(i)} (expected ${String(id)})`);
    }
  }

  // --- evolution chains: dedupe by URL, then walk each chain's tree ---
  const chainUrls = [...new Set(speciesJsons.map((s) => s.evolution_chain.url))];
  const chainJsons = await mapPool(chainUrls, CONCURRENCY, async (url) => {
    return (await fetchJson(url)) as EvolutionChainJson;
  });

  const evolvesFrom = new Map<number, number | null>();
  const evolvesTo = new Map<number, number[]>();

  function walkChain(node: EvolutionChainNode, parentId: number | null) {
    const id = idFromUrl(node.species.url);
    if (id <= maxSpeciesId) {
      evolvesFrom.set(id, parentId);
      if (parentId !== null && parentId <= maxSpeciesId) {
        evolvesTo.set(parentId, [...(evolvesTo.get(parentId) ?? []), id]);
      }
    }
    for (const child of node.evolves_to) {
      walkChain(child, id <= maxSpeciesId ? id : parentId);
    }
  }
  for (const chain of chainJsons) {
    walkChain(chain.chain, null);
  }

  // --- build species.ts entries ---
  const referencedAbilityNames = new Set<string>();
  const speciesEntries = speciesIds.map((id, i) => {
    const p = pokemonJsons[i];
    const s = speciesJsons[i];
    if (p === undefined || s === undefined) throw new Error(`missing json for id ${String(id)}`);

    const types = currentTypesOf(p);
    const pastTypes = pastTypesOf(p);
    for (const name of [...types, ...pastTypes.flatMap((t) => t.types)]) {
      if (!ALL_TYPES.has(name)) {
        throw new Error(`unexpected type "${name}" for ${p.name} (id ${String(p.id)})`);
      }
    }

    const abilities = abilitiesOf(p);
    for (const a of abilities) referencedAbilityNames.add(a.name);

    const statByName = new Map(p.stats.map((st) => [st.stat.name, st.base_stat]));
    const stat = (name: string): number => {
      const value = statByName.get(name);
      if (value === undefined) throw new Error(`missing stat "${name}" for ${p.name}`);
      return value;
    };

    return {
      id,
      name: p.name,
      introducedInGeneration: generationNumber(s.generation),
      types,
      pastTypes,
      abilities,
      baseStats: {
        hp: stat("hp"),
        attack: stat("attack"),
        defense: stat("defense"),
        specialAttack: stat("special-attack"),
        specialDefense: stat("special-defense"),
        speed: stat("speed"),
      },
      evolvesFrom: evolvesFrom.get(id) ?? null,
      evolvesTo: (evolvesTo.get(id) ?? []).toSorted((a, b) => a - b),
    };
  });

  // --- moves: discover the authoritative id range (excluding the Shadow-move block), then
  // fetch /move/{id} for every one of them ---
  const moveList = (await fetchJson(`${API_BASE}/move/?limit=1000`)) as NamedApiResourceList;
  const allMoveIds = moveList.results.map((r) => idFromUrl(r.url));
  const moveIds = allMoveIds.filter((id) => id < SHADOW_MOVE_ID_FLOOR).toSorted((a, b) => a - b);
  const shadowMoveCount = allMoveIds.length - moveIds.length;
  const maxMoveId = moveIds[moveIds.length - 1];
  if (maxMoveId === undefined) throw new Error("move list was empty");
  if (moveIds.length !== maxMoveId) {
    throw new Error(
      `expected move ids 1..${String(maxMoveId)} contiguous, got ${String(moveIds.length)} ids`,
    );
  }
  console.log(
    `Moves: ${String(moveIds.length)} (national move dex 1-${String(maxMoveId)}), excluded ${String(shadowMoveCount)} Shadow moves`,
  );

  const moveJsons = await mapPool(moveIds, CONCURRENCY, async (id) => {
    return (await fetchJson(`${API_BASE}/move/${String(id)}`)) as MoveJson;
  });

  const moveEntries = moveJsons.map((m, i) => {
    const id = moveIds[i];
    if (m?.id !== id) throw new Error(`move id mismatch at index ${String(i)}`);
    if (!MOVE_TYPES.has(m.type.name)) {
      throw new Error(`unexpected type "${m.type.name}" for move ${m.name} (id ${String(m.id)})`);
    }
    if (!DAMAGE_CLASSES.has(m.damage_class.name)) {
      throw new Error(
        `unexpected damage class "${m.damage_class.name}" for move ${m.name} (id ${String(m.id)})`,
      );
    }
    if (m.pp === null) throw new Error(`move ${m.name} (id ${String(m.id)}) has a null pp`);

    const pastValues = pastValuesOf(m, vgIdToGen);
    for (const pv of pastValues) {
      if (pv.type !== null && !MOVE_TYPES.has(pv.type)) {
        throw new Error(
          `unexpected past type "${pv.type}" for move ${m.name} (id ${String(m.id)})`,
        );
      }
    }

    return {
      id: m.id,
      name: m.name,
      introducedInGeneration: generationNumber(m.generation),
      type: m.type.name,
      damageClass: m.damage_class.name,
      power: m.power,
      accuracy: m.accuracy,
      pp: m.pp,
      pastValues,
    };
  });

  // --- abilities: fetch every ability referenced by at least one species (hidden included) ---
  const abilityJsons = await mapPool([...referencedAbilityNames], CONCURRENCY, async (name) => {
    return (await fetchJson(`${API_BASE}/ability/${name}`)) as AbilityJson;
  });
  const abilityEntries = abilityJsons
    .map((a) => {
      const en = a.effect_entries.find((e) => e.language.name === "en");
      return {
        id: a.id,
        name: a.name,
        introducedInGeneration: generationNumber(a.generation),
        shortEffect: en?.short_effect.replace(/\s+/g, " ").trim() ?? "",
      };
    })
    .toSorted((a, b) => a.id - b.id);

  // --- items: curated list ---
  const itemJsons = await mapPool(CURATED_ITEM_SLUGS, CONCURRENCY, async (slug) => {
    return (await fetchJson(`${API_BASE}/item/${slug}`)) as ItemJson;
  });
  const itemEntries = itemJsons
    .map((it) => {
      const en = it.effect_entries.find((e) => e.language.name === "en");
      return {
        id: it.id,
        name: it.name,
        category: it.category.name,
        shortEffect: en?.short_effect.replace(/\s+/g, " ").trim() ?? "",
      };
    })
    .toSorted((a, b) => a.id - b.id);

  // ---------------------------------------------------------------------------
  // Write files
  // ---------------------------------------------------------------------------

  writeFileSync(
    path.join(OUT_DIR, "species.ts"),
    GENERATED_HEADER(`Species: national dex 1-${String(maxSpeciesId)}.`) +
      `
import type { BaseStats, PastTypes, Type } from "./types";

export interface AbilitySlot {
  name: string;
  isHidden: boolean;
}

export interface SpeciesDef {
  id: number;
  name: string;
  /** The generation this species was first introduced in (national dex debut). */
  introducedInGeneration: number;
  /** Present-day (current) types. Resolve via pokedexFor(generation).typesOf(id) instead of
   * reading this directly unless you specifically want the current value. */
  types: Type[];
  /** Historical typings, ascending by throughGeneration. Empty if it never changed. */
  pastTypes: PastTypes[];
  /** Every non-past ability slot, hidden included (hidden abilities exist from Gen 5 on). */
  abilities: AbilitySlot[];
  baseStats: BaseStats;
  evolvesFrom: number | null;
  evolvesTo: number[];
}

export const species: SpeciesDef[] = [
${speciesEntries
  .map(
    (s) => `  {
    id: ${String(s.id)},
    name: ${quote(s.name)},
    introducedInGeneration: ${String(s.introducedInGeneration)},
    types: [${s.types.map(quote).join(", ")}],
    pastTypes: [${s.pastTypes.length === 0 ? "" : `\n${s.pastTypes.map((pt) => `      { throughGeneration: ${String(pt.throughGeneration)}, types: [${pt.types.map(quote).join(", ")}] },`).join("\n")}\n    `}],
    abilities: [${s.abilities.length === 0 ? "" : `\n${s.abilities.map((a) => `      { name: ${quote(a.name)}, isHidden: ${String(a.isHidden)} },`).join("\n")}\n    `}],
    baseStats: {
      hp: ${String(s.baseStats.hp)},
      attack: ${String(s.baseStats.attack)},
      defense: ${String(s.baseStats.defense)},
      specialAttack: ${String(s.baseStats.specialAttack)},
      specialDefense: ${String(s.baseStats.specialDefense)},
      speed: ${String(s.baseStats.speed)},
    },
    evolvesFrom: ${s.evolvesFrom === null ? "null" : String(s.evolvesFrom)},
    evolvesTo: [${s.evolvesTo.join(", ")}],
  },`,
  )
  .join("\n")}
];
`,
  );

  writeFileSync(
    path.join(OUT_DIR, "moves.ts"),
    GENERATED_HEADER(`Moves: national move dex 1-${String(maxMoveId)}.`) +
      `
import type { DamageClass, PastMoveValue, Type } from "./types";

export interface MoveDef {
  id: number;
  name: string;
  /** The generation this move was first introduced in. */
  introducedInGeneration: number;
  /** Present-day (current) values. Resolve via pokedexFor(generation).statsOf(id) instead of
   * reading these directly unless you specifically want the current value. */
  type: Type;
  damageClass: DamageClass;
  power: number | null;
  accuracy: number | null;
  pp: number;
  /** Historical stat snapshots, ascending by throughGeneration. Empty if never changed. */
  pastValues: PastMoveValue[];
}

export const moves: MoveDef[] = [
${moveEntries
  .map(
    (m) => `  {
    id: ${String(m.id)},
    name: ${quote(m.name)},
    introducedInGeneration: ${String(m.introducedInGeneration)},
    type: ${quote(m.type)},
    damageClass: ${quote(m.damageClass)},
    power: ${numberOrNull(m.power)},
    accuracy: ${numberOrNull(m.accuracy)},
    pp: ${String(m.pp)},
    pastValues: [${m.pastValues.length === 0 ? "" : `\n${m.pastValues.map((pv) => `      { throughGeneration: ${String(pv.throughGeneration)}, power: ${numberOrNull(pv.power)}, accuracy: ${numberOrNull(pv.accuracy)}, pp: ${numberOrNull(pv.pp)}, type: ${quoteOrNull(pv.type)} },`).join("\n")}\n    `}],
  },`,
  )
  .join("\n")}
];
`,
  );

  writeFileSync(
    path.join(OUT_DIR, "abilities.ts"),
    GENERATED_HEADER("Abilities referenced by at least one species (hidden abilities included).") +
      `
export interface AbilityDef {
  id: number;
  name: string;
  /** The generation this ability was first introduced in. */
  introducedInGeneration: number;
  shortEffect: string;
}

export const abilities: AbilityDef[] = [
${abilityEntries
  .map(
    (a) =>
      `  { id: ${String(a.id)}, name: ${quote(a.name)}, introducedInGeneration: ${String(a.introducedInGeneration)}, shortEffect: ${quote(a.shortEffect)} },`,
  )
  .join("\n")}
];
`,
  );

  writeFileSync(
    path.join(OUT_DIR, "items.ts"),
    GENERATED_HEADER(
      "Curated held items, evolution items/stones and berries across every generation, relevant to a Nuzlocke tracker.\n * See scripts/extract-pokedex.ts CURATED_ITEM_SLUGS for the list and why each is included.",
    ) +
      `
export interface ItemDef {
  id: number;
  name: string;
  category: string;
  shortEffect: string;
}

export const items: ItemDef[] = [
${itemEntries
  .map(
    (it) =>
      `  { id: ${String(it.id)}, name: ${quote(it.name)}, category: ${quote(it.category)}, shortEffect: ${quote(it.shortEffect)} },`,
  )
  .join("\n")}
];
`,
  );

  // learnsets.ts is no longer generated (see CLAUDE.md "Game data": moveset editing is
  // free-text over every move, so a species' legal learnset is not stored). Remove a stale
  // copy if one is left over from before this generator stopped writing it.
  const staleLearnsets = path.join(OUT_DIR, "learnsets.ts");
  if (existsSync(staleLearnsets)) rmSync(staleLearnsets);

  console.log(`Wrote ${String(speciesEntries.length)} species to ${OUT_DIR}/species.ts`);
  console.log(`Wrote ${String(moveEntries.length)} moves to ${OUT_DIR}/moves.ts`);
  console.log(`Wrote ${String(abilityEntries.length)} abilities to ${OUT_DIR}/abilities.ts`);
  console.log(`Wrote ${String(itemEntries.length)} items to ${OUT_DIR}/items.ts`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
