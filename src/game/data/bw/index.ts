/**
 * Assembles the Black GameData from routes.ts, fights.ts and level-caps.ts. White shares
 * everything but Drayden's gym, which is Iris, and the dragon N leads with.
 */

import type { GameData } from "@/game/types";

import { blackFights, whiteFights } from "./fights";
import { levelCaps } from "./level-caps";
import { routes } from "./routes";

export const black: GameData = {
  id: "black",
  name: "Black",
  generation: 5,
  // Japan release, per Bulbapedia's Pokémon Black and White Versions page.
  released: "2010-09-18",
  routes,
  fights: blackFights,
  levelCaps,
};

export const white: GameData = {
  ...black,
  id: "white",
  name: "White",
  fights: whiteFights,
};
