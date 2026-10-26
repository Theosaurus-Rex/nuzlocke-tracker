/**
 * Black and White level caps by progress. Source: "Hardcore Nuzlocke Level Caps by Generation",
 * Nuzlocke University, https://nuzlockeuniversity.ca/2022/01/18/hardcore-nuzlocke-level-caps-by-generation/
 * Gyms are listed by badge count and equal each gym's ace. The Elite Four can be fought in any
 * order, so each member holds the cap at 50 until all four are cleared. N and Ghetsis follow. N's
 * Castle fight has the same id in both versions, so one table serves both.
 */

import type { LevelCapMilestone } from "@/domain/types";

export const levelCaps: LevelCapMilestone[] = [
  { cap: 14, until: { badges: 1 } },
  { cap: 20, until: { badges: 2 } },
  { cap: 23, until: { badges: 3 } },
  { cap: 27, until: { badges: 4 } },
  { cap: 31, until: { badges: 5 } },
  { cap: 35, until: { badges: 6 } },
  { cap: 39, until: { badges: 7 } },
  { cap: 43, until: { badges: 8 } },
  { cap: 50, until: { fight: "elite-four-shauntal" } },
  { cap: 50, until: { fight: "elite-four-grimsley" } },
  { cap: 50, until: { fight: "elite-four-caitlin" } },
  { cap: 50, until: { fight: "elite-four-marshal" } },
  { cap: 52, until: { fight: "boss-n-castle" } },
  { cap: 54, until: { fight: "boss-ghetsis-n-castle" } },
];
