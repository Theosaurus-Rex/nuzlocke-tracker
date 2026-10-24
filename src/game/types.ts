/**
 * Static game-data types: the shape of one game's route order and boss rosters.
 * Hand-authorable TypeScript, not JSON, so a missing level fails `pnpm build`. Species are plain
 * strings, so `scripts/check-game-data.ts` is what catches a typo'd one.
 */

import type { FightKind, GameId, LevelCapMilestone } from "@/domain/types";

/** One member of a boss's team. Levels are hand-entered. */
export interface BossMon {
  species: string;
  level: number;
}

export type Region = string;

export interface FightDef {
  /** Stable, game-scoped id, e.g. "gym-falkner". */
  id: string;
  name: string;
  kind: FightKind;
  /** Traversal order among this game's fights. Unique, not necessarily contiguous with routes. */
  order: number;
  grantsBadge: boolean;
  region: Region;
  /** The badge name for a fight that grants one. */
  badge: string | null;
  /** Number of the badge image in PokéAPI's sprite set. */
  badgeSprite: number | null;
  roster: BossMon[];
}

export interface RouteDef {
  /** Stable, game-scoped id, e.g. "route-29". */
  id: string;
  name: string;
  /** Traversal order among this game's routes. Unique and contiguous. */
  order: number;
  region: Region;
}

export interface GameData {
  id: GameId;
  name: string;
  /** The generation whose types and move stats this game's runs resolve against. */
  generation: number;
  routes: RouteDef[];
  fights: FightDef[];
  /** Level caps by progress, in order. Written by hand, no roster needed. */
  levelCaps: LevelCapMilestone[];
}

export const TYPES = [
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
  "unknown",
] as const;

export type Type = (typeof TYPES)[number];

export function isType(name: string): name is Type {
  return (TYPES as readonly string[]).includes(name);
}
