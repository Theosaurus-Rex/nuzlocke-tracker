/**
 * Assembles the Ultra Sun GameData from routes.ts, fights.ts and level-caps.ts. Ultra Moon shares
 * all of it.
 */

import type { GameData } from "@/game/types";

import { fights } from "./fights";
import { levelCaps } from "./level-caps";
import { routes } from "./routes";

export const ultraSun: GameData = {
  id: "ultrasun",
  name: "Ultra Sun",
  generation: 7,
  // Japan release, per Bulbapedia's Pokémon Ultra Sun and Ultra Moon page.
  released: "2017-11-17",
  routes,
  fights,
  levelCaps,
};

export const ultraMoon: GameData = {
  ...ultraSun,
  id: "ultramoon",
  name: "Ultra Moon",
};
