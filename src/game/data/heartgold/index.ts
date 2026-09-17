/**
 * Assembles the HeartGold GameData. Generated alongside routes.ts and fights.ts by
 * scripts/extract-heartgold.ts — do not hand-edit.
 */

import type { GameData } from "@/game/types";

import { fights } from "./fights";
import { routes } from "./routes";

export const heartgold: GameData = {
  id: "heartgold",
  name: "HeartGold",
  generation: 4,
  routes,
  fights,
};
