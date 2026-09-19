/**
 * Assembles the HeartGold GameData from routes.ts and fights.ts. Bootstrapped by
 * scripts/extract-heartgold.ts; hand-owned now, same as the two files it assembles.
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
