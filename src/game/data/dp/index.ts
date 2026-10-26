/**
 * Assembles the Diamond GameData from routes.ts, fights.ts and level-caps.ts. Pearl shares it,
 * since the pair differ only in wild encounters and the legendary at Spear Pillar.
 */

import type { GameData } from "@/game/types";

import { fights } from "./fights";
import { levelCaps } from "./level-caps";
import { routes } from "./routes";

export const diamond: GameData = {
  id: "diamond",
  name: "Diamond",
  generation: 4,
  // Japan release, per Bulbapedia's Pokémon Diamond and Pearl Versions page.
  released: "2006-09-28",
  routes,
  fights,
  levelCaps,
};

export const pearl: GameData = { ...diamond, id: "pearl", name: "Pearl" };
