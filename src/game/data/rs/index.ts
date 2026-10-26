/**
 * Assembles the Ruby GameData from routes.ts, fights.ts and level-caps.ts. Sapphire shares
 * everything but the six villain fights.
 */

import type { GameData } from "@/game/types";

import { rubyFights, sapphireFights } from "./fights";
import { levelCaps } from "./level-caps";
import { routes } from "./routes";

export const ruby: GameData = {
  id: "ruby",
  name: "Ruby",
  generation: 3,
  // Japan release, per Bulbapedia's Pokémon Ruby and Sapphire page.
  released: "2002-11-21",
  routes,
  fights: rubyFights,
  levelCaps,
};

export const sapphire: GameData = {
  ...ruby,
  id: "sapphire",
  name: "Sapphire",
  fights: sapphireFights,
};
