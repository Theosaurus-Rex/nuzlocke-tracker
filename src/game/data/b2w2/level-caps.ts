/**
 * Black 2 and White 2 level caps by progress. Source: "Hardcore Nuzlocke Level Caps by Generation",
 * Nuzlocke University, https://nuzlockeuniversity.ca/2022/01/18/hardcore-nuzlocke-level-caps-by-generation/
 * Gyms are listed by badge count and equal each gym's ace. The Elite Four can be fought in any
 * order, so each member holds the cap at 58 until all four are cleared. The rematch rows are
 * post-game and left out.
 */

import type { LevelCapMilestone } from "@/domain/types";

export const levelCaps: LevelCapMilestone[] = [
  { cap: 13, until: { badges: 1 } },
  { cap: 18, until: { badges: 2 } },
  { cap: 24, until: { badges: 3 } },
  { cap: 30, until: { badges: 4 } },
  { cap: 33, until: { badges: 5 } },
  { cap: 39, until: { badges: 6 } },
  { cap: 48, until: { badges: 7 } },
  { cap: 51, until: { badges: 8 } },
  { cap: 58, until: { fight: "elite-four-shauntal" } },
  { cap: 58, until: { fight: "elite-four-grimsley" } },
  { cap: 58, until: { fight: "elite-four-caitlin" } },
  { cap: 58, until: { fight: "elite-four-marshal" } },
  { cap: 59, until: { fight: "champion-iris" } },
];
