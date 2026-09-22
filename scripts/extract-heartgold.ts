/**
 * Generator for the HeartGold route order and boss rosters, from domtronn/nuzlocke.data.
 * One-shot bootstrapper: see README.md "Game data" for usage and docs/notes/scripts.md for
 * extracting a second game. Level caps are computed here, never read from source data.
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

/**
 * Refuses to overwrite already-seeded output: a stray re-run would silently discard hand
 * corrections. See README.md "Game data".
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
      'These files are hand-owned now (see CLAUDE.md "Game data"). Corrections belong in the\n' +
      "data itself, not in this generator. Re-running it here would silently overwrite every\n" +
      "hand correction with today's upstream values.\n\n" +
      "Pass --force if that is genuinely what you want, then run\n" +
      `  git diff ${outDir}\n` +
      "afterwards to review exactly what changed.",
  );
  process.exit(1);
}

/**
 * Overrides on top of the upstream roster data, keyed by league fight key then species.
 * Only matters if the game is ever re-bootstrapped from scratch. See docs/notes/scripts.md
 * for the sourcing behind each entry.
 */
const LEVEL_CORRECTIONS: Record<string, Record<string, number>> = {
  k6: { kabutops: 52 },
};

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

/** Fight kinds we keep. Mini-bosses and evil-team executives are dropped. */
const KEPT_KINDS: ReadonlySet<RawFightKind> = new Set(["gym-leader", "elite-four", "rival"]);

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

/** Upstream reuses the name "Silver" across all six rival fights. Disambiguate by key. */
function fightId(kind: OurFightKind, name: string, key: string): string {
  const base = `${KIND_ID_PREFIX[kind]}-${slug(name)}`;
  const digits = key.replace(/\D/g, "");
  return slug(name) === "silver" && digits !== "" ? `${base}-${digits}` : base;
}

function routeId(name: string): string {
  return slug(name);
}

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
 * HeartGold route order, Johto through Kanto. Bootstrapped from domtronn/nuzlocke.data
 * (https://github.com/domtronn/nuzlocke.data). Hand-owned now, see CLAUDE.md "Game data".
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
 * HeartGold boss rosters, bootstrapped from domtronn/nuzlocke.data
 * (https://github.com/domtronn/nuzlocke.data). Hand-owned now, see CLAUDE.md "Game data".
 * levelCap is computed from each fight's own roster, never hand-entered. Rivals have no cap.
 */

import type { FightDef } from "@/game/types";

export const fights: FightDef[] = [
${entries}
];
`;
}

function emitIndexModule(): string {
  return `/**
 * Assembles the HeartGold GameData from routes.ts and fights.ts. Hand-owned now, same as
 * the files it assembles.
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
