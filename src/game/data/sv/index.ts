/**
 * Assembles the Scarlet GameData from routes.ts, fights.ts and level-caps.ts. Violet shares all
 * three. The two versions differ only in the Quaking Earth Titan and the Zero Lab professor,
 * which have the same ace and are one fight each.
 */

import type { GameData } from "@/game/types";

import { fights } from "./fights";
import { levelCaps } from "./level-caps";
import { routes } from "./routes";

export const scarlet: GameData = {
  id: "scarlet",
  name: "Scarlet",
  generation: 9,
  released: "2022-11-18",
  league: "Paldea League",
  routes,
  fights,
  levelCaps,
};

export const violet: GameData = {
  ...scarlet,
  id: "violet",
  name: "Violet",
};
