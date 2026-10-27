/**
 * Assembles the X GameData from routes.ts, fights.ts and level-caps.ts. Y shares everything, so
 * only the id and name differ.
 */

import type { GameData } from "@/game/types";

import { fights } from "./fights";
import { levelCaps } from "./level-caps";
import { routes } from "./routes";

export const x: GameData = {
  id: "x",
  name: "X",
  generation: 6,
  // Worldwide release, per Bulbapedia's Pokémon X and Y Versions page.
  released: "2013-10-12",
  routes,
  fights,
  levelCaps,
};

export const y: GameData = {
  ...x,
  id: "y",
  name: "Y",
};
