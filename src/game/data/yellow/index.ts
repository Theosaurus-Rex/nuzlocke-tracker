/** Assembles the Yellow GameData from routes.ts, fights.ts and level-caps.ts. */

import type { GameData } from "@/game/types";

import { fights } from "./fights";
import { levelCaps } from "./level-caps";
import { routes } from "./routes";

export const yellow: GameData = {
  id: "yellow",
  name: "Yellow",
  generation: 1,
  // North America release, per Bulbapedia's Pokémon Yellow Version page.
  released: "1999-10-18",
  routes,
  fights,
  levelCaps,
};
