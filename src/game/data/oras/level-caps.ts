/**
 * Omega Ruby and Alpha Sapphire level caps by progress. Source: "Hardcore Nuzlocke Level Caps by
 * Generation", Nuzlocke University, https://nuzlockeuniversity.ca/2022/01/18/hardcore-nuzlocke-level-caps-by-generation/
 * Gyms are listed by badge count and equal each gym's ace. The Elite Four is a fixed order, so
 * each member has a cap of their own. The rematch rows are post-game and left out.
 */

import type { LevelCapMilestone } from "@/domain/types";

export const levelCaps: LevelCapMilestone[] = [
  { cap: 14, until: { badges: 1 } },
  { cap: 16, until: { badges: 2 } },
  { cap: 21, until: { badges: 3 } },
  { cap: 28, until: { badges: 4 } },
  { cap: 30, until: { badges: 5 } },
  { cap: 35, until: { badges: 6 } },
  { cap: 45, until: { badges: 7 } },
  { cap: 46, until: { badges: 8 } },
  { cap: 52, until: { fight: "elite-four-sidney" } },
  { cap: 53, until: { fight: "elite-four-phoebe" } },
  { cap: 54, until: { fight: "elite-four-glacia" } },
  { cap: 55, until: { fight: "elite-four-drake" } },
  { cap: 59, until: { fight: "champion-steven" } },
];
