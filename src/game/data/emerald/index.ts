/** Assembles the Emerald GameData from routes.ts, fights.ts and level-caps.ts. */

import type { GameData } from "@/game/types";

import { fights } from "./fights";
import { levelCaps } from "./level-caps";
import { routes } from "./routes";

export const emerald: GameData = {
  id: "emerald",
  name: "Emerald",
  generation: 3,
  // Japan release, per Bulbapedia's Pokémon Emerald page.
  released: "2004-09-16",
  routes,
  fights,
  levelCaps,
};
