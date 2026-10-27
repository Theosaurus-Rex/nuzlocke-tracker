/**
 * Yellow level caps by progress. Source: "Hardcore Nuzlocke Level Caps by Generation",
 * Nuzlocke University, https://nuzlockeuniversity.ca/2022/01/18/hardcore-nuzlocke-level-caps-by-generation/
 * Gyms are listed by badge count and equal each gym's ace. The Elite Four is a fixed order, so
 * each member has a cap of their own.
 */

import type { LevelCapMilestone } from "@/domain/types";

export const levelCaps: LevelCapMilestone[] = [
  { cap: 12, until: { badges: 1 } },
  { cap: 21, until: { badges: 2 } },
  { cap: 28, until: { badges: 3 } },
  { cap: 32, until: { badges: 4 } },
  { cap: 50, until: { badges: 5 } },
  { cap: 50, until: { badges: 6 } },
  { cap: 54, until: { badges: 7 } },
  { cap: 55, until: { badges: 8 } },
  { cap: 56, until: { fight: "elite-four-lorelei" } },
  { cap: 58, until: { fight: "elite-four-bruno" } },
  { cap: 60, until: { fight: "elite-four-agatha" } },
  { cap: 62, until: { fight: "elite-four-lance" } },
  { cap: 65, until: { fight: "champion-blue" } },
];
