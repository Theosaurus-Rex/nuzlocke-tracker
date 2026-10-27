/**
 * X and Y level caps by progress. Source: "Hardcore Nuzlocke Level Caps by Generation",
 * Nuzlocke University, https://nuzlockeuniversity.ca/2022/01/18/hardcore-nuzlocke-level-caps-by-generation/
 * Gyms are listed by badge count and equal each gym's ace. The Elite Four can be fought in any
 * order, so each member holds the cap at 65 until all four are cleared. The rematch rows are
 * post-game and left out.
 */

import type { LevelCapMilestone } from "@/domain/types";

export const levelCaps: LevelCapMilestone[] = [
  { cap: 12, until: { badges: 1 } },
  { cap: 25, until: { badges: 2 } },
  { cap: 32, until: { badges: 3 } },
  { cap: 34, until: { badges: 4 } },
  { cap: 37, until: { badges: 5 } },
  { cap: 42, until: { badges: 6 } },
  { cap: 48, until: { badges: 7 } },
  { cap: 59, until: { badges: 8 } },
  { cap: 65, until: { fight: "elite-four-malva" } },
  { cap: 65, until: { fight: "elite-four-siebold" } },
  { cap: 65, until: { fight: "elite-four-wikstrom" } },
  { cap: 65, until: { fight: "elite-four-drasna" } },
  { cap: 68, until: { fight: "champion-diantha" } },
];
