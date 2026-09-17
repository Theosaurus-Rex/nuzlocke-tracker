/**
 * Generator for the HeartGold route order and boss rosters.
 *
 * Source: domtronn/nuzlocke.data (https://github.com/domtronn/nuzlocke.data), specifically
 * `routes/hg.txt` (the Johto-through-Kanto traversal order, with gym/rival/etc. fight anchors
 * interleaved) and `leagues/hgss.txt` (boss rosters, keyed by the same fight keys).
 *
 * Licence position (see CLAUDE.md "Game data"): this is NOT a vendoring of that repo. It is
 * cloned to a scratch location, read once by this script, and only the HeartGold subset is
 * emitted into typed modules of our own under `src/game/data/heartgold/`, each carrying a
 * header comment crediting the source. The upstream repo itself is never copied into this
 * project and is not a dependency.
 *
 * This script does NOT run at build or test time — the emitted modules are what ships. It is a
 * one-shot bootstrapper (see CLAUDE.md "Game data" — decided 2026-09-18): run it once to seed a
 * new game from the upstream source, pointing at a local clone of that repo:
 *
 *   node scripts/extract-heartgold.ts /path/to/local/clone/of/nuzlocke.data
 *
 * After that, the emitted files under src/game/data/heartgold/ are ours — hand-edit them
 * directly for corrections, trims or tuning, and note why in a comment beside the change. This
 * script refuses to overwrite a directory that already has output; see
 * refuseIfAlreadyPopulated below and pass --force only if you mean to re-seed from scratch.
 *
 * To extract a second game from the same upstream project, copy this script, point it at a
 * different `routes/<id>.txt` / `leagues/<id>.txt` pair, and re-derive `LEVEL_CORRECTIONS`
 * against an independent source (Bulbapedia/Serebii) — do not assume the upstream levels are
 * bug-free; see CLAUDE.md's note that Gen 2-5 data in the wild has had real bugs.
 *
 * Level caps are never read from the source data: they are computed here, from `roster`, for
 * every fight that grants a badge plus the Elite Four and Champion. Rivals get no cap.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(REPO_ROOT, "src/game/data/heartgold");
const GENERATED_FILES = ["routes.ts", "fights.ts", "index.ts"] as const;

const rawArgs = process.argv.slice(2);
const force = rawArgs.includes("--force");
const cloneRoot = rawArgs.find((arg) => arg !== "--force");
if (!cloneRoot) {
  console.error("usage: node scripts/extract-heartgold.ts <path-to-nuzlocke.data-clone> [--force]");
  process.exit(1);
}

const ROUTES_SRC = "routes/hg.txt";
const LEAGUE_SRC = "leagues/hgss.txt";

// ---------------------------------------------------------------------------
// Guard against clobbering hand-owned data
// ---------------------------------------------------------------------------

/**
 * Refuses to write into a directory that already holds generated output.
 *
 * The committed files under src/game/data/ are hand-owned once seeded (CLAUDE.md "Game
 * data" — decided 2026-09-18): a generator is a one-shot bootstrapper, not something re-run
 * for a game that already exists. Under the old "output is reproducible" model a stray re-run
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

// ---------------------------------------------------------------------------
// Known corrections against an independent source
// ---------------------------------------------------------------------------

/**
 * Overrides applied on top of the upstream roster data, keyed by league fight key then species.
 *
 * Brock's HGSS Kanto team (`k6`): nuzlocke.data lists Kabutops at level 54, but both
 * Bulbapedia (https://bulbapedia.bulbagarden.net/wiki/Brock, "Pokémon HeartGold and
 * SoulSilver" gym battle section) and Serebii (https://www.serebii.net/heartgoldsoulsilver/
 * gym.shtml) independently list it at level 52. Brock's ace (Onix, level 54) is unaffected
 * either way, so this does not change his level cap — but the roster itself was wrong.
 *
 * This table is still what a future bootstrap of this game would apply, but it is no longer
 * the source of truth: src/game/data/heartgold/fights.ts is, per CLAUDE.md "Game data" (decided
 * 2026-09-18). The same correction is recorded there, on Brock's entry, for anyone hand-editing
 * the data to actually see.
 */
const LEVEL_CORRECTIONS: Record<string, Record<string, number>> = {
  k6: { kabutops: 52 },
};

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

interface RawRoute {
  name: string;
  order: number;
  region: "johto" | "kanto";
}

type RawFightKind = "gym-leader" | "elite-four" | "rival" | "mini-boss" | "evil-team";

interface RawFightAnchor {
  key: string;
  kind: RawFightKind;
  name: string;
  order: number;
}

/** Fight kinds we keep. Mini-bosses and evil-team executives are out of scope for PER-6. */
const KEPT_KINDS: ReadonlySet<RawFightKind> = new Set(["gym-leader", "elite-four", "rival"]);

/** The route name at which the traversal crosses from Johto into Kanto. */
const KANTO_START_ROUTE = "Vermillion City";

function parseRoutesFile(text: string): { routes: RawRoute[]; fights: RawFightAnchor[] } {
  const routes: RawRoute[] = [];
  const fights: RawFightAnchor[] = [];
  let region: "johto" | "kanto" = "johto";
  let routeOrder = 0;
  let fightOrder = 0;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (line === "") continue;

    if (line.startsWith("--")) {
      const parts = line.slice(2).split("|");
      const key = parts[1];
      const kind = parts[2];
      const name = parts[3];
      if (key === undefined || kind === undefined || name === undefined) {
        throw new Error(`malformed fight anchor line in ${ROUTES_SRC}: ${line}`);
      }
      if (!KEPT_KINDS.has(kind as RawFightKind)) continue;
      fightOrder += 1;
      fights.push({ key, kind: kind as RawFightKind, name, order: fightOrder });
      continue;
    }

    const name = line.split("|")[0];
    if (name === undefined || name === "") {
      throw new Error(`malformed route line in ${ROUTES_SRC}: ${line}`);
    }
    if (name === KANTO_START_ROUTE) region = "kanto";
    routeOrder += 1;
    routes.push({ name, order: routeOrder, region });
  }

  return { routes, fights };
}

interface RawBossMon {
  species: string;
  level: number;
}

function parseLeagueFile(text: string): Map<string, RawBossMon[]> {
  const rosters = new Map<string, RawBossMon[]>();
  let currentKey: string | null = null;
  let currentRoster: RawBossMon[] = [];

  const flush = () => {
    if (currentKey !== null) rosters.set(currentKey, currentRoster);
  };

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();

    if (line.startsWith("--")) {
      flush();
      const parts = line.slice(2).split("|");
      const key = parts[0];
      if (key === undefined) {
        throw new Error(`malformed league header line in ${LEAGUE_SRC}: ${line}`);
      }
      currentKey = key;
      currentRoster = [];
      continue;
    }

    if (line === "" || line.startsWith("#")) continue;
    if (currentKey === null) continue; // file-level comment before the first header

    const parts = line.split("|");
    const species = parts[0];
    const levelText = parts[1];
    if (species === undefined || levelText === undefined) {
      throw new Error(`malformed roster line in ${LEAGUE_SRC} under ${currentKey}: ${line}`);
    }
    const level = Number(levelText);
    if (!Number.isInteger(level)) {
      throw new Error(`non-integer level in ${LEAGUE_SRC} under ${currentKey}: ${line}`);
    }
    const corrected = LEVEL_CORRECTIONS[currentKey]?.[species] ?? level;
    currentRoster.push({ species, level: corrected });
  }
  flush();

  return rosters;
}

// ---------------------------------------------------------------------------
// Mapping to our domain
// ---------------------------------------------------------------------------

type OurFightKind = "gym" | "elite_four" | "champion" | "rival";

function mapKind(anchor: RawFightAnchor): OurFightKind {
  switch (anchor.kind) {
    case "gym-leader":
      return "gym";
    case "elite-four":
      // Upstream files Lance under the same "elite-four" kind as Will/Koga/Bruno/Karen,
      // keyed "c" for "Champion Fight". Our domain distinguishes elite_four from champion.
      return anchor.key === "c" ? "champion" : "elite_four";
    case "rival":
      return "rival";
    default:
      throw new Error(`unexpected fight kind reaching mapKind: ${String(anchor.kind)}`);
  }
}

const KIND_ID_PREFIX: Record<OurFightKind, string> = {
  gym: "gym",
  elite_four: "elite-four",
  champion: "champion",
  rival: "rival",
};

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Upstream reuses the name "Silver" across all six rival fights; disambiguate by key. */
function fightId(kind: OurFightKind, name: string, key: string): string {
  const base = `${KIND_ID_PREFIX[kind]}-${slug(name)}`;
  const digits = key.replace(/\D/g, "");
  return slug(name) === "silver" && digits !== "" ? `${base}-${digits}` : base;
}

function routeId(name: string): string {
  return slug(name);
}

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------

function quote(value: string): string {
  return JSON.stringify(value);
}

function emitRoutesModule(routes: RawRoute[]): string {
  const entries = routes
    .map(
      (r) =>
        `  { id: ${quote(routeId(r.name))}, name: ${quote(r.name)}, order: ${r.order}, region: ${quote(r.region)} },`,
    )
    .join("\n");

  return `/**
 * HeartGold route order, Johto through Kanto, in traversal order.
 *
 * Bootstrapped by scripts/extract-heartgold.ts from domtronn/nuzlocke.data
 * (https://github.com/domtronn/nuzlocke.data), file \`${ROUTES_SRC}\`. This file is hand-owned
 * now (CLAUDE.md "Game data") — edit it directly and note why in a comment beside the change.
 */

import type { RouteDef } from "@/game/types";

export const routes: RouteDef[] = [
${entries}
];
`;
}

interface BuiltFight {
  id: string;
  name: string;
  kind: OurFightKind;
  order: number;
  grantsBadge: boolean;
  levelCap: number | null;
  roster: RawBossMon[];
}

function emitFightsModule(fights: BuiltFight[]): string {
  const entries = fights
    .map((f) => {
      const roster = f.roster
        .map((m) => `      { species: ${quote(m.species)}, level: ${m.level} },`)
        .join("\n");
      return `  {
    id: ${quote(f.id)},
    name: ${quote(f.name)},
    kind: ${quote(f.kind)},
    order: ${f.order},
    grantsBadge: ${f.grantsBadge},
    levelCap: ${f.levelCap ?? "null"},
    roster: [
${roster}
    ],
  },`;
    })
    .join("\n");

  return `/**
 * HeartGold boss rosters: gyms, Elite Four, Champion, and rivals.
 *
 * Bootstrapped by scripts/extract-heartgold.ts from domtronn/nuzlocke.data
 * (https://github.com/domtronn/nuzlocke.data), files \`${ROUTES_SRC}\` (fight order and names)
 * and \`${LEAGUE_SRC}\` (rosters). This file is hand-owned now (CLAUDE.md "Game data") — edit it
 * directly and note why in a comment beside the change.
 *
 * \`levelCap\` is computed from each fight's own \`roster\` (the ace's level), never
 * hand-entered. Rivals carry no cap.
 */

import type { FightDef } from "@/game/types";

export const fights: FightDef[] = [
${entries}
];
`;
}

function emitIndexModule(): string {
  return `/**
 * Assembles the HeartGold GameData. Bootstrapped alongside routes.ts and fights.ts by
 * scripts/extract-heartgold.ts. This file is hand-owned now (CLAUDE.md "Game data").
 */

import type { GameData } from "@/game/types";

import { fights } from "./fights";
import { routes } from "./routes";

export const heartgold: GameData = {
  id: "heartgold",
  name: "HeartGold",
  routes,
  fights,
};
`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(cloneRootArg: string) {
  refuseIfAlreadyPopulated(OUT_DIR, GENERATED_FILES, force);

  const routesText = readFileSync(path.join(cloneRootArg, ROUTES_SRC), "utf8");
  const leagueText = readFileSync(path.join(cloneRootArg, LEAGUE_SRC), "utf8");

  const { routes, fights: anchors } = parseRoutesFile(routesText);
  const rosters = parseLeagueFile(leagueText);

  const fights: BuiltFight[] = anchors.map((anchor) => {
    const roster = rosters.get(anchor.key);
    if (roster === undefined || roster.length === 0) {
      throw new Error(`no roster found for fight key "${anchor.key}" (${anchor.name})`);
    }
    const kind = mapKind(anchor);
    const grantsBadge = kind === "gym";
    const levelCap = kind === "rival" ? null : Math.max(...roster.map((m) => m.level));
    return {
      id: fightId(kind, anchor.name, anchor.key),
      name: anchor.name,
      kind,
      order: anchor.order,
      grantsBadge,
      levelCap,
      roster,
    };
  });

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, "routes.ts"), emitRoutesModule(routes));
  writeFileSync(path.join(OUT_DIR, "fights.ts"), emitFightsModule(fights));
  writeFileSync(path.join(OUT_DIR, "index.ts"), emitIndexModule());

  console.log(`Wrote ${routes.length} routes and ${fights.length} fights to ${OUT_DIR}`);
}

main(cloneRoot);
