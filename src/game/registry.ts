/**
 * Registry of every game's static data, keyed by `GameId`.
 *
 * Adding a game is one new directory under `src/game/data/` plus one entry here. Nothing
 * outside `src/game/` may know where a game's data came from.
 */

import type { GameId } from "@/domain/types";

import { black2, white2 } from "@/game/data/b2w2";
import { black, white } from "@/game/data/bw";
import { diamond, pearl } from "@/game/data/dp";
import { emerald } from "@/game/data/emerald";
import { firered, leafgreen } from "@/game/data/frlg";
import { heartgold, soulsilver } from "@/game/data/heartgold";
import { platinum } from "@/game/data/platinum";
import { ruby, sapphire } from "@/game/data/rs";
import { x, y } from "@/game/data/xy";
import type { GameData } from "@/game/types";

export const GAMES: Record<GameId, GameData> = {
  heartgold,
  soulsilver,
  firered,
  leafgreen,
  emerald,
  ruby,
  sapphire,
  diamond,
  pearl,
  platinum,
  black,
  white,
  black2,
  white2,
  x,
  y,
};
