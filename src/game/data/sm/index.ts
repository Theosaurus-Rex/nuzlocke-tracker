/**
 * Assembles the Sun GameData from routes.ts, fights.ts and level-caps.ts. Moon shares everything
 * but the name of the Altar route.
 */

import type { GameData } from "@/game/types";

import { fights } from "./fights";
import { levelCaps } from "./level-caps";
import { moonRoutes, routes } from "./routes";

export const sun: GameData = {
  id: "sun",
  name: "Sun",
  generation: 7,
  // Japan release, per Bulbapedia's Pokémon Sun and Moon page.
  released: "2016-11-18",
  routes,
  fights,
  levelCaps,
};

export const moon: GameData = {
  ...sun,
  id: "moon",
  name: "Moon",
  routes: moonRoutes,
};
