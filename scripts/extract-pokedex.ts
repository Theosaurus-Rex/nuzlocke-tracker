/**
 * Generator for the Gen 4 (National Dex 1-493) pokedex data: species, moves, abilities and
 * evolution links, for HeartGold/SoulSilver specifically.
 *
 * Source: PokeAPI (https://pokeapi.co/), free and unauthenticated. This script fetches ~2000
 * resources across species/moves/abilities/evolution-chains/items, so it is polite about it:
 * every response is cached to disk (see CACHE_DIR below) and re-read on rerun, and requests are
 * throttled to a modest concurrency rather than fired all at once.
 *
 * This script does NOT run at build or test time — the emitted modules under
 * src/game/data/pokedex/ are what ships (see CLAUDE.md "Why no backend" and the architectural
 * constraint this issue was scoped under: the app must never call PokeAPI at runtime). Run it
 * by hand:
 *
 *   POKEDEX_CACHE_DIR=/path/to/scratch/cache node scripts/extract-pokedex.ts
 *
 * If POKEDEX_CACHE_DIR is not set, it defaults to a directory under the OS temp dir. The cache
 * is never committed (see .gitignore) — only the generated src/game/data/pokedex/*.ts files are.
 *
 * ---------------------------------------------------------------------------------------------
 * THE TRAP: PokeAPI serves PRESENT-DAY values by default, not Gen 4 values.
 * ---------------------------------------------------------------------------------------------
 * This app is Gen 4 only (HeartGold/SoulSilver). Two fields need historical resolution:
 *
 * - Pokemon `types` / `past_types`: a `past_types` entry is tagged with a `generation` and
 *   means "the type was THIS, for this generation and every earlier one; it changes starting
 *   the next recorded generation (or the top-level current value, if this is the last entry)".
 *   Confirmed against Clefairy: past_types has one entry tagged generation-v (Normal), and
 *   Clefairy is genuinely Normal through Gen 5, Fairy from Gen 6 (Fairy didn't exist before
 *   then) — so "generation tag N, value V" = "V applies for generation <= N".
 *   To resolve Gen 4: take the earliest past_types entry with generation >= 4; if none, use
 *   the current top-level types.
 *
 * - Move `power`/`accuracy`/`pp`/`type` / `past_values`: a `past_values` entry is tagged with a
 *   `version_group` and means the OPPOSITE direction: "value V applied for every version group
 *   strictly BEFORE this tag; starting at this tag, the value has already changed to whatever
 *   the next entry (or the current top-level value) says." Confirmed against two known-history
 *   moves (see scratch notes / PR description): Bite (Normal pre-Gen 2, Dark from Gold/Silver
 *   itself onward — the tag's own version group already carries the new value) and Tackle
 *   (power 35/accuracy 95 through Gen 4, tagged at Black/White; power 40/accuracy 100 from
 *   Generation VII onward, tagged at Sun/Moon — both match Bulbapedia's documented history
 *   exactly under this rule).
 *   To resolve our target (HeartGold/SoulSilver, generation 4, version_group id looked up by
 *   name below): among past_values entries whose (generation, version_group id) is strictly
 *   AFTER heartgold-soulsilver, take the earliest one; for each field, if it's null there, keep
 *   walking later qualifying entries; if none ever specify it, use the current top-level value.
 *
 * NOTE: this direction genuinely differs between the two endpoints (generation-tagged
 * "up to and including" for past_types/past_abilities vs version-group-tagged "strictly
 * before" for moves' past_values) — do not assume they are the same rule.
 *
 * A known limitation this produces: a move whose stat changed at a version group that never
 * got its own past_values entry (i.e. PokeAPI recorded the boundary before and after but not
 * the specific mid-generation bump) will resolve to whichever recorded value brackets our
 * target. Vine Whip's PP is a case: Bulbapedia documents 10 (Gen 1-3) -> 15 (Gen 4-5) -> 25
 * (Gen 6+), but PokeAPI's move/22 only records a past_values boundary at diamond-pearl (pp: 10)
 * and at x-y (pp: null, i.e. "unchanged", falling through to the current top-level 25) — there
 * is no boundary entry for the Gen 4-specific bump to 15. Applying the rule above therefore
 * resolves our Gen 4 pp to 25, not the 15 Bulbapedia documents. Flagged in the PR report as a
 * PokeAPI data-granularity gap worth a spot-check/upstream note, not a bug in this script's
 * resolution logic (which is verified correct against Bite and Tackle above).
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(REPO_ROOT, "src/game/data/pokedex");
const CACHE_DIR = process.env.POKEDEX_CACHE_DIR ?? path.join(os.tmpdir(), "nuzlocke-pokeapi-cache");

const API_BASE = "https://pokeapi.co/api/v2";
const CONCURRENCY = 8;
const TARGET_GENERATION = 4;
const TARGET_VERSION_GROUP_NAME = "heartgold-soulsilver";

const SPECIES_COUNT = 493;
const MOVE_ID_MAX = 467; // National move dex 1-467 = every standard move that exists by Gen 4.

// ---------------------------------------------------------------------------
// Curated item list: held items, evolution items/stones, and a representative set of
// berries that matter for a Nuzlocke tracker in HGSS. Not exhaustive — PokeAPI has ~2000
// items and most (TMs, key items, mail, etc.) are out of scope. See CLAUDE.md: "Use
// judgement; completeness matters less than correctness."
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

/** Gen 4 introduced this per-move split; every move must resolve to exactly one of these. */
const DAMAGE_CLASSES = new Set(["physical", "special", "status"]);

/** The 17 types that exist in Gen 4. If anything outside this set is ever resolved, we abort. */
const GEN4_TYPES = new Set([
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
]);

/**
 * Move types only: the 17 real types plus PokeAPI's "unknown" ("???") placeholder, which is
 * genuinely correct for exactly one Gen 4 move — Curse (id 174) was typeless in Gen 2-4 and
 * only became Ghost-type in Gen 5 (confirmed against Bulbapedia). No species ever legitimately
 * has this type, so it is intentionally NOT in GEN4_TYPES above.
 */
const GEN4_MOVE_TYPES = new Set([...GEN4_TYPES, "unknown"]);

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

interface PokemonMoveEntry {
  move: NamedRef;
  version_group_details: {
    level_learned_at: number;
    version_group: NamedRef;
    move_learn_method: NamedRef;
  }[];
}

interface PokemonJson {
  id: number;
  name: string;
  types: { slot: number; type: NamedRef }[];
  past_types: { generation: NamedRef; types: { slot: number; type: NamedRef }[] }[];
  abilities: { is_hidden: boolean; slot: number; ability: NamedRef | null }[];
  past_abilities: {
    generation: NamedRef;
    abilities: { is_hidden: boolean; slot: number; ability: NamedRef | null }[];
  }[];
  stats: { base_stat: number; stat: NamedRef }[];
  moves: PokemonMoveEntry[];
}

interface SpeciesJson {
  id: number;
  name: string;
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

// ---------------------------------------------------------------------------
// Generation/version-group resolution helpers
// ---------------------------------------------------------------------------

/** generation.url looks like ".../generation/4/" — the resource id IS the generation number. */
function generationNumber(ref: NamedRef): number {
  return idFromUrl(ref.url);
}

function resolveGen4Types(pokemon: PokemonJson): string[] {
  const candidates = pokemon.past_types
    .map((entry) => ({ gen: generationNumber(entry.generation), types: entry.types }))
    .filter((entry) => entry.gen >= TARGET_GENERATION)
    .sort((a, b) => a.gen - b.gen);
  const chosen = candidates[0]?.types ?? pokemon.types;
  const names = [...chosen].sort((a, b) => a.slot - b.slot).map((t) => t.type.name);
  for (const name of names) {
    if (!GEN4_TYPES.has(name)) {
      throw new Error(
        `resolved a non-Gen4 type "${name}" for ${pokemon.name} (id ${String(pokemon.id)})`,
      );
    }
  }
  return names;
}

/**
 * Resolves the Gen 4 (HeartGold/SoulSilver) non-hidden abilities for a species.
 *
 * Hidden abilities do not exist in Gen 4 (introduced Gen 5) so they are excluded outright.
 * For the remaining (current) non-hidden slots, past_abilities can override per-slot: an
 * entry tagged generation >= 4 with a null ability means that slot did not exist yet at Gen 4
 * (excluded); a non-null ability there overrides the current one for that slot.
 */
function resolveGen4Abilities(pokemon: PokemonJson): string[] {
  const bySlot = new Map<number, string | null>();
  for (const a of pokemon.abilities) {
    if (a.is_hidden) continue;
    bySlot.set(a.slot, a.ability?.name ?? null);
  }

  // Earliest past_abilities entry with generation >= 4, if any, wins per-slot.
  const futureEntries = pokemon.past_abilities
    .map((entry) => ({ gen: generationNumber(entry.generation), abilities: entry.abilities }))
    .filter((entry) => entry.gen >= TARGET_GENERATION)
    .sort((a, b) => a.gen - b.gen);
  const override = futureEntries[0];
  if (override !== undefined) {
    for (const a of override.abilities) {
      if (a.is_hidden) continue;
      bySlot.set(a.slot, a.ability?.name ?? null);
    }
  }

  return [...bySlot.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, name]) => name)
    .filter((name): name is string => name !== null);
}

/**
 * Core resolver: among `pastValues` entries chronologically after our target (Gen 4,
 * heartgold-soulsilver), returns the earliest one's value for `field` if non-null, else
 * `undefined` (meaning: nothing overrides the current top-level value).
 *
 * Kept scoped to MovePastValueEntry's own field shape (never MoveJson's) so the two "power"/
 * "type" etc. keys never have to reconcile two different declared types for the same key —
 * that mismatch (current `type` is never null; a past `type` entry can be) is what makes a
 * single MoveJson-typed generic fall over. Callers combine the result with `?? current`.
 */
function resolveMovePastField<K extends keyof MovePastValueEntry>(
  field: K,
  pastValues: MovePastValueEntry[],
  vgIdToGen: Map<number, number>,
  targetGen: number,
  targetVgId: number,
): MovePastValueEntry[K] | undefined {
  const qualifying = pastValues
    .map((entry) => {
      const vgId = idFromUrl(entry.version_group.url);
      const gen = vgIdToGen.get(vgId);
      if (gen === undefined) throw new Error(`unknown version group id ${String(vgId)}`);
      return { gen, vgId, value: entry[field] };
    })
    .filter(
      (entry) => entry.gen > targetGen || (entry.gen === targetGen && entry.vgId > targetVgId),
    )
    .sort((a, b) => a.gen - b.gen || a.vgId - b.vgId);

  for (const entry of qualifying) {
    if (entry.value !== null) return entry.value;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Emit helpers
// ---------------------------------------------------------------------------

function quote(value: string): string {
  return JSON.stringify(value);
}

const GENERATED_HEADER = (subject: string) => `/**
 * ${subject}
 *
 * Generated by scripts/extract-pokedex.ts from PokeAPI (https://pokeapi.co/). Do not
 * hand-edit — re-run the generator instead.
 *
 * Values are Gen 4 (HeartGold/SoulSilver) specific: PokeAPI serves present-day values by
 * default, so types/abilities/move stats are resolved from \`past_types\`/\`past_abilities\`/
 * \`past_values\` where Gen 4 differs from today. See the header comment in
 * scripts/extract-pokedex.ts for exactly how.
 */
`;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Cache: ${CACHE_DIR}`);
  mkdirSync(OUT_DIR, { recursive: true });

  // --- version groups: build version-group id -> generation number map ---
  const vgList = (await fetchJson(`${API_BASE}/version-group/?limit=100`)) as {
    results: NamedRef[];
  };
  const versionGroups = await mapPool(vgList.results, CONCURRENCY, async (ref) => {
    return (await fetchJson(ref.url)) as VersionGroupJson;
  });
  const vgIdToGen = new Map<number, number>(
    versionGroups.map((vg) => [vg.id, generationNumber(vg.generation)]),
  );
  const targetVg = versionGroups.find((vg) => vg.name === TARGET_VERSION_GROUP_NAME);
  if (targetVg === undefined) {
    throw new Error(`could not find version group "${TARGET_VERSION_GROUP_NAME}"`);
  }
  const targetVgId = targetVg.id;
  console.log(
    `Target version group: ${targetVg.name} (id ${String(targetVgId)}, gen ${String(TARGET_GENERATION)})`,
  );

  // --- species: fetch /pokemon/{id} and /pokemon-species/{id} for 1..493 ---
  const speciesIds = Array.from({ length: SPECIES_COUNT }, (_, i) => i + 1);
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
    if (id <= SPECIES_COUNT) {
      evolvesFrom.set(id, parentId);
      if (parentId !== null && parentId <= SPECIES_COUNT) {
        evolvesTo.set(parentId, [...(evolvesTo.get(parentId) ?? []), id]);
      }
    }
    for (const child of node.evolves_to) {
      walkChain(child, id <= SPECIES_COUNT ? id : parentId);
    }
  }
  for (const chain of chainJsons) {
    walkChain(chain.chain, null);
  }

  // --- build species.ts entries ---
  const referencedAbilityNames = new Set<string>();
  const speciesEntries = speciesIds.map((id, i) => {
    const p = pokemonJsons[i];
    if (p === undefined) throw new Error(`missing pokemon json for id ${String(id)}`);
    const types = resolveGen4Types(p);
    const abilities = resolveGen4Abilities(p);
    for (const a of abilities) referencedAbilityNames.add(a);
    const statByName = new Map(p.stats.map((s) => [s.stat.name, s.base_stat]));
    const stat = (name: string): number => {
      const value = statByName.get(name);
      if (value === undefined) throw new Error(`missing stat "${name}" for ${p.name}`);
      return value;
    };
    return {
      id,
      name: p.name,
      types,
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

  // --- moves: fetch 1..467 ---
  const moveIds = Array.from({ length: MOVE_ID_MAX }, (_, i) => i + 1);
  const moveJsons = await mapPool(moveIds, CONCURRENCY, async (id) => {
    return (await fetchJson(`${API_BASE}/move/${String(id)}`)) as MoveJson;
  });

  const moveEntries = moveJsons.map((m, i) => {
    const id = moveIds[i];
    if (m?.id !== id) throw new Error(`move id mismatch at index ${String(i)}`);
    if (generationNumber(m.generation) > TARGET_GENERATION) {
      throw new Error(`move "${m.name}" (id ${String(m.id)}) was introduced after Gen 4`);
    }
    const type =
      resolveMovePastField("type", m.past_values, vgIdToGen, TARGET_GENERATION, targetVgId) ??
      m.type;
    if (!GEN4_MOVE_TYPES.has(type.name)) {
      throw new Error(
        `resolved a non-Gen4 type "${type.name}" for move ${m.name} (id ${String(m.id)})`,
      );
    }
    const pp =
      resolveMovePastField("pp", m.past_values, vgIdToGen, TARGET_GENERATION, targetVgId) ?? m.pp;
    if (pp === null) throw new Error(`move ${m.name} (id ${String(m.id)}) resolved to a null pp`);
    if (!DAMAGE_CLASSES.has(m.damage_class.name)) {
      throw new Error(
        `unexpected damage class "${m.damage_class.name}" for move ${m.name} (id ${String(m.id)})`,
      );
    }
    return {
      id: m.id,
      name: m.name,
      type: type.name,
      damageClass: m.damage_class.name,
      power:
        resolveMovePastField("power", m.past_values, vgIdToGen, TARGET_GENERATION, targetVgId) ??
        m.power,
      accuracy:
        resolveMovePastField("accuracy", m.past_values, vgIdToGen, TARGET_GENERATION, targetVgId) ??
        m.accuracy,
      pp,
    };
  });
  const moveNameToId = new Map(moveEntries.map((m) => [m.name, m.id]));

  // --- abilities: fetch every ability referenced by a species ---
  const abilityJsons = await mapPool([...referencedAbilityNames], CONCURRENCY, async (name) => {
    return (await fetchJson(`${API_BASE}/ability/${name}`)) as AbilityJson;
  });
  const abilityEntries = abilityJsons
    .map((a) => {
      const en = a.effect_entries.find((e) => e.language.name === "en");
      return {
        id: a.id,
        name: a.name,
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

  // --- learnsets: HGSS-only version_group_details from each species' moves list ---
  const learnsetEntries = speciesIds.map((id, i) => {
    const p = pokemonJsons[i];
    if (p === undefined) throw new Error(`missing pokemon json for id ${String(id)}`);
    const rows: { moveId: number; method: string; level: number | null }[] = [];
    for (const entry of p.moves) {
      const moveId = moveNameToId.get(entry.move.name);
      if (moveId === undefined) continue; // move introduced after Gen 4 — not in our move table
      for (const vgd of entry.version_group_details) {
        if (vgd.version_group.name !== TARGET_VERSION_GROUP_NAME) continue;
        rows.push({
          moveId,
          method: vgd.move_learn_method.name,
          level: vgd.move_learn_method.name === "level-up" ? vgd.level_learned_at : null,
        });
      }
    }
    // De-dupe identical (move, method, level) triples — HGSS sometimes lists a method twice
    // across egg-move chains.
    const seen = new Set<string>();
    const deduped = rows.filter((r) => {
      const key = `${String(r.moveId)}:${r.method}:${String(r.level)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return { id, moves: deduped.toSorted((a, b) => a.moveId - b.moveId) };
  });

  // ---------------------------------------------------------------------------
  // Write files
  // ---------------------------------------------------------------------------

  writeFileSync(
    path.join(OUT_DIR, "species.ts"),
    GENERATED_HEADER(
      "Gen 4 species: national dex 1-493, types/abilities as of HeartGold/SoulSilver.",
    ) +
      `
import type { BaseStats, Gen4Type } from "./types";

export interface SpeciesDef {
  id: number;
  name: string;
  types: Gen4Type[];
  /** Non-hidden abilities legal in Gen 4 (hidden abilities do not exist until Gen 5). */
  abilities: string[];
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
    types: [${s.types.map(quote).join(", ")}],
    abilities: [${s.abilities.map(quote).join(", ")}],
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
    GENERATED_HEADER("Gen 4 moves: national move dex 1-467, stats as of HeartGold/SoulSilver.") +
      `
import type { DamageClass, Gen4Type } from "./types";

export interface MoveDef {
  id: number;
  name: string;
  type: Gen4Type;
  damageClass: DamageClass;
  power: number | null;
  accuracy: number | null;
  pp: number;
}

export const moves: MoveDef[] = [
${moveEntries
  .map(
    (m) => `  {
    id: ${String(m.id)},
    name: ${quote(m.name)},
    type: ${quote(m.type)},
    damageClass: ${quote(m.damageClass)},
    power: ${m.power === null ? "null" : String(m.power)},
    accuracy: ${m.accuracy === null ? "null" : String(m.accuracy)},
    pp: ${String(m.pp)},
  },`,
  )
  .join("\n")}
];
`,
  );

  writeFileSync(
    path.join(OUT_DIR, "abilities.ts"),
    GENERATED_HEADER("Abilities referenced by at least one Gen 4 species (non-hidden only).") +
      `
export interface AbilityDef {
  id: number;
  name: string;
  shortEffect: string;
}

export const abilities: AbilityDef[] = [
${abilityEntries
  .map(
    (a) =>
      `  { id: ${String(a.id)}, name: ${quote(a.name)}, shortEffect: ${quote(a.shortEffect)} },`,
  )
  .join("\n")}
];
`,
  );

  writeFileSync(
    path.join(OUT_DIR, "items.ts"),
    GENERATED_HEADER(
      "Curated held items, evolution items/stones and berries relevant to an HGSS Nuzlocke tracker.\n * See scripts/extract-pokedex.ts CURATED_ITEM_SLUGS for the list and why each is included.",
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

  writeFileSync(
    path.join(OUT_DIR, "learnsets.ts"),
    `/**
 * Gen 4 (HeartGold/SoulSilver) learnsets: which moves each species can learn, by which method.
 *
 * Generated by scripts/extract-pokedex.ts from PokeAPI (https://pokeapi.co/). Do not hand-edit.
 *
 * Deliberately kept free of any import (not even from ./types) so it can be code-split or
 * lazily loaded later without pulling in the rest of the pokedex — see the module-size report
 * in the PR this landed in.
 */

export type LearnMethod =
  | "level-up"
  | "machine"
  | "egg"
  | "tutor"
  /** HGSS-specific: a Pichu hatched from a Volt-Tackle-eligible parent holding a Light Ball. */
  | "light-ball-egg"
  /** Rotom's appliance forms (introduced Platinum) each grant a signature move on form change. */
  | "form-change";

export interface LearnsetEntry {
  moveId: number;
  method: LearnMethod;
  /** Only set for method "level-up"; 0 means "known from the start / on evolution". */
  level: number | null;
}

export const learnsets: Record<number, LearnsetEntry[]> = {
${learnsetEntries
  .map(
    (e) =>
      `  ${String(e.id)}: [${e.moves.length === 0 ? "" : `\n${e.moves.map((m) => `    { moveId: ${String(m.moveId)}, method: ${quote(m.method)}, level: ${m.level === null ? "null" : String(m.level)} },`).join("\n")}\n  `}],`,
  )
  .join("\n")}
};
`,
  );

  const totalLearnsetMoves = learnsetEntries.reduce((sum, e) => sum + e.moves.length, 0);
  console.log(`Wrote ${String(speciesEntries.length)} species to ${OUT_DIR}/species.ts`);
  console.log(`Wrote ${String(moveEntries.length)} moves to ${OUT_DIR}/moves.ts`);
  console.log(`Wrote ${String(abilityEntries.length)} abilities to ${OUT_DIR}/abilities.ts`);
  console.log(`Wrote ${String(itemEntries.length)} items to ${OUT_DIR}/items.ts`);
  console.log(
    `Wrote learnsets for ${String(learnsetEntries.length)} species (${String(totalLearnsetMoves)} total move rows) to ${OUT_DIR}/learnsets.ts`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
