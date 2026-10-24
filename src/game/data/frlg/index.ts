/**
 * Assembles the FireRed GameData from routes.ts and fights.ts. LeafGreen shares it, since the pair
 * differ only in wild encounters, which the app does not store.
 */

import type { GameData } from "@/game/types";

import { fights } from "./fights";
import { levelCaps } from "./level-caps";
import { routes } from "./routes";

export const firered: GameData = {
  id: "firered",
  name: "FireRed",
  generation: 3,
  routes,
  fights,
  levelCaps,
};

export const leafgreen: GameData = { ...firered, id: "leafgreen", name: "LeafGreen" };
