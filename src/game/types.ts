/**
 * Static game-data types: the shape of one game's route order and boss rosters.
 *
 * These are hand-authorable TypeScript modules, not JSON — a typo'd species or a missing level
 * fails `pnpm build`, and authoring a new game gets autocomplete. See
 * docs/superpowers/specs/2026-09-17-nuzlocke-scaffold-design.md section 3: `src/game/` holds
 * static game data, kept separate from `src/domain/` (entity types) and `src/storage/`.
 *
 * `GameId` and `FightKind` live in `@/domain/types` and are reused here, not redefined.
 */

import type { FightKind, GameId } from "@/domain/types";

/** One member of a boss's team. Levels are hand-entered from the roster; caps are derived from them. */
export interface BossMon {
  species: string;
  level: number;
}

export interface FightDef {
  /** Stable, game-scoped id, e.g. "gym-falkner". */
  id: string;
  name: string;
  kind: FightKind;
  /** Traversal order among this game's fights; unique, not necessarily contiguous with routes. */
  order: number;
  grantsBadge: boolean;
  /**
   * The ace's level for any fight that grants a badge, plus Elite Four and Champion fights.
   * `null` for rivals: rivals are worth tracking, but their caps are debatable, so none is
   * asserted. Always derived from `roster` — never hand-entered beside it.
   */
  levelCap: number | null;
  roster: BossMon[];
}

export interface RouteDef {
  /** Stable, game-scoped id, e.g. "route-29". */
  id: string;
  name: string;
  /** Traversal order among this game's routes; unique and contiguous. */
  order: number;
  region: "johto" | "kanto";
}

export interface GameData {
  id: GameId;
  name: string;
  /** Which generation's pokedex data (types, move stats) this game resolves against — see
   * `pokedexFor` in @/game/pokedex. */
  generation: number;
  routes: RouteDef[];
  fights: FightDef[];
}
