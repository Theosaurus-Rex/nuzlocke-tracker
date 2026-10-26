/** Assembles the Platinum GameData from routes.ts, fights.ts and level-caps.ts. */

import type { GameData } from "@/game/types";

import { fights } from "./fights";
import { levelCaps } from "./level-caps";
import { routes } from "./routes";

export const platinum: GameData = {
  id: "platinum",
  name: "Platinum",
  generation: 4,
  // Japan release, per Bulbapedia's Pokémon Platinum Version page.
  released: "2008-09-13",
  routes,
  fights,
  levelCaps,
};
