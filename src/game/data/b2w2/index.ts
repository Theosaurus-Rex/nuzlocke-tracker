/**
 * Assembles the Black 2 GameData from routes.ts, fights.ts and level-caps.ts. White 2 shares
 * everything but the fused Kyurem at the Giant Chasm.
 */

import type { GameData } from "@/game/types";

import { black2Fights, white2Fights } from "./fights";
import { levelCaps } from "./level-caps";
import { routes } from "./routes";

export const black2: GameData = {
  id: "black2",
  name: "Black 2",
  generation: 5,
  // Japan release, per Bulbapedia's Pokémon Black 2 and White 2 Versions page.
  released: "2012-06-23",
  routes,
  fights: black2Fights,
  levelCaps,
};

export const white2: GameData = {
  ...black2,
  id: "white2",
  name: "White 2",
  fights: white2Fights,
};
