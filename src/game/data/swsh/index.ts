/**
 * Assembles the Sword GameData from routes.ts, fights.ts and level-caps.ts. Shield shares the
 * routes and caps and differs in three fights.
 */

import type { GameData } from "@/game/types";

import { shieldFights, swordFights } from "./fights";
import { levelCaps } from "./level-caps";
import { routes } from "./routes";

export const sword: GameData = {
  id: "sword",
  name: "Sword",
  generation: 8,
  // Worldwide release, per Bulbapedia's Pokémon Sword and Shield page.
  released: "2019-11-15",
  league: "Champion Cup",
  routes,
  fights: swordFights,
  levelCaps,
};

export const shield: GameData = {
  ...sword,
  id: "shield",
  name: "Shield",
  fights: shieldFights,
};
