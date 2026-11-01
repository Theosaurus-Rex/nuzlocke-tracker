/**
 * Assembles the Brilliant Diamond GameData from routes.ts, fights.ts and level-caps.ts. Shining
 * Pearl shares it, since the pair differ only in wild encounters and the legendary at Spear Pillar.
 */

import type { GameData } from "@/game/types";

import { fights } from "./fights";
import { levelCaps } from "./level-caps";
import { routes } from "./routes";

export const brilliantDiamond: GameData = {
  id: "brilliantdiamond",
  name: "Brilliant Diamond",
  generation: 8,
  // Worldwide release, per Bulbapedia's Pokémon Brilliant Diamond and Shining Pearl page.
  released: "2021-11-19",
  routes,
  fights,
  levelCaps,
};

export const shiningPearl: GameData = {
  ...brilliantDiamond,
  id: "shiningpearl",
  name: "Shining Pearl",
};
