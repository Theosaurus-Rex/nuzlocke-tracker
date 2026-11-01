/**
 * Brilliant Diamond and Shining Pearl level caps by progress. Nuzlocke University has no list for
 * them, and their gym and league aces match Diamond and Pearl, so its Diamond/Pearl table is used:
 * https://nuzlockeuniversity.ca/2022/01/18/hardcore-nuzlocke-level-caps-by-generation/
 * Badges 3 and 4 share a cap because Maylene and Crasher Wake both end on a level 30.
 */

import type { LevelCapMilestone } from "@/domain/types";

export const levelCaps: LevelCapMilestone[] = [
  { cap: 14, until: { badges: 1 } },
  { cap: 22, until: { badges: 2 } },
  { cap: 30, until: { badges: 3 } },
  { cap: 30, until: { badges: 4 } },
  { cap: 36, until: { badges: 5 } },
  { cap: 39, until: { badges: 6 } },
  { cap: 42, until: { badges: 7 } },
  { cap: 49, until: { badges: 8 } },
  { cap: 57, until: { fight: "elite-four-aaron" } },
  { cap: 59, until: { fight: "elite-four-bertha" } },
  { cap: 61, until: { fight: "elite-four-flint" } },
  { cap: 63, until: { fight: "elite-four-lucian" } },
  { cap: 66, until: { fight: "champion-cynthia" } },
];
