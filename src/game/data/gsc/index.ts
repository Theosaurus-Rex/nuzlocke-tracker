/**
 * Assembles the Gold GameData from routes.ts, fights.ts and level-caps.ts. Silver shares
 * everything. Crystal adds the Power Plant route and its own release date.
 */

import type { GameData } from "@/game/types";

import { fights } from "./fights";
import { levelCaps } from "./level-caps";
import { crystalRoutes, routes } from "./routes";

export const gold: GameData = {
  id: "gold",
  name: "Gold",
  generation: 2,
  // Japan release, per Bulbapedia's Pokémon Gold and Silver Versions page.
  released: "1999-11-21",
  routes,
  fights,
  levelCaps,
};

export const silver: GameData = {
  ...gold,
  id: "silver",
  name: "Silver",
};

export const crystal: GameData = {
  ...gold,
  id: "crystal",
  name: "Crystal",
  // Japan release, per Bulbapedia's Pokémon Crystal Version page.
  released: "2000-12-14",
  routes: crystalRoutes,
};
