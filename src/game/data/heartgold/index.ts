/**
 * Assembles the HeartGold GameData from routes.ts and fights.ts. SoulSilver shares it, since the
 * pair differ only in wild encounters. Bootstrapped by scripts/extract-heartgold.ts, hand-owned now.
 */

import type { GameData } from "@/game/types";

import { fights } from "./fights";
import { routes } from "./routes";

export const heartgold: GameData = {
  id: "heartgold",
  name: "HeartGold",
  generation: 4,
  routes,
  fights,
};

export const soulsilver: GameData = { ...heartgold, id: "soulsilver", name: "SoulSilver" };
