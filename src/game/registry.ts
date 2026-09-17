/**
 * Registry of every game's static data, keyed by `GameId`.
 *
 * Adding a game is one new directory under `src/game/data/` plus one entry here. Nothing
 * outside `src/game/` may know where a game's data came from.
 */

import type { GameId } from "@/domain/types";

import { heartgold } from "@/game/data/heartgold";
import type { GameData } from "@/game/types";

export const GAMES: Record<GameId, GameData> = {
  heartgold,
};
