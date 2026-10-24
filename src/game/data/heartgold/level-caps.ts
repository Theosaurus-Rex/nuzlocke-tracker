/**
 * HeartGold level caps by progress. Source: "Hardcore Nuzlocke Level Caps by Generation",
 * Nuzlocke University, https://nuzlockeuniversity.ca/2022/01/18/hardcore-nuzlocke-level-caps-by-generation/
 * Kanto gyms can be done in any order, so their caps are listed lowest first, by badge count.
 */

import type { LevelCapMilestone } from "@/domain/types";

export const levelCaps: LevelCapMilestone[] = [
  { cap: 13, until: { badges: 1 } },
  { cap: 17, until: { badges: 2 } },
  { cap: 19, until: { badges: 3 } },
  { cap: 25, until: { badges: 4 } },
  { cap: 31, until: { badges: 5 } },
  { cap: 35, until: { badges: 6 } },
  // The source has 34 (Pryce's ace). Held at 35 so the cap never goes down.
  { cap: 35, until: { badges: 7 } },
  { cap: 41, until: { badges: 8 } },
  { cap: 42, until: { fight: "elite-four-will" } },
  { cap: 44, until: { fight: "elite-four-koga" } },
  { cap: 46, until: { fight: "elite-four-bruno" } },
  { cap: 47, until: { fight: "elite-four-karen" } },
  { cap: 50, until: { fight: "champion-lance" } },
  { cap: 50, until: { badges: 9 } },
  { cap: 53, until: { badges: 10 } },
  { cap: 54, until: { badges: 11 } },
  { cap: 54, until: { badges: 12 } },
  { cap: 55, until: { badges: 13 } },
  { cap: 56, until: { badges: 14 } },
  { cap: 59, until: { badges: 15 } },
  { cap: 60, until: { badges: 16 } },
  { cap: 88, until: { fight: "rival-red" } },
];
