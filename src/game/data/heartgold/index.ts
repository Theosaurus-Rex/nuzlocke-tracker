/**
 * Assembles the HeartGold GameData from routes.ts and fights.ts. SoulSilver shares it, since the
 * pair differ only in wild encounters. Bootstrapped by scripts/extract-heartgold.ts, hand-owned now.
 */

import type { GameData } from "@/game/types";

import { fights } from "./fights";
import { levelCaps } from "./level-caps";
import { routes } from "./routes";

export const heartgold: GameData = {
  id: "heartgold",
  name: "HeartGold",
  generation: 4,
  // Japan release, per Bulbapedia's Pokémon HeartGold and SoulSilver page.
  released: "2009-09-12",
  routes,
  fights,
  levelCaps,
};

export const soulsilver: GameData = { ...heartgold, id: "soulsilver", name: "SoulSilver" };
