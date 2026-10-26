/** Assembles the Emerald GameData from routes.ts, fights.ts and level-caps.ts. */

import type { GameData } from "@/game/types";

import { fights } from "./fights";
import { levelCaps } from "./level-caps";
import { routes } from "./routes";

export const emerald: GameData = {
  id: "emerald",
  name: "Emerald",
  generation: 3,
  routes,
  fights,
  levelCaps,
};
