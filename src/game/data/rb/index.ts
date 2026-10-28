/**
 * Assembles the Red GameData from routes.ts, fights.ts and level-caps.ts. Blue shares everything,
 * so only the id and name differ.
 */

import type { GameData } from "@/game/types";

import { fights } from "./fights";
import { levelCaps } from "./level-caps";
import { routes } from "./routes";

export const red: GameData = {
  id: "red",
  name: "Red",
  generation: 1,
  // Japan release, per Bulbapedia's Pokémon Red and Green Versions page.
  released: "1996-02-27",
  routes,
  fights,
  levelCaps,
};

export const blue: GameData = {
  ...red,
  id: "blue",
  name: "Blue",
};
