/**
 * FireRed and LeafGreen level caps by progress. Source: "Hardcore Nuzlocke Level Caps by
 * Generation", Nuzlocke University,
 * https://nuzlockeuniversity.ca/2022/01/18/hardcore-nuzlocke-level-caps-by-generation/
 * Gyms are listed by badge count. Giovanni is always last, and the middle three tie or rise.
 */

import type { LevelCapMilestone } from "@/domain/types";

export const levelCaps: LevelCapMilestone[] = [
  { cap: 14, until: { badges: 1 } },
  { cap: 21, until: { badges: 2 } },
  { cap: 24, until: { badges: 3 } },
  { cap: 29, until: { badges: 4 } },
  { cap: 43, until: { badges: 5 } },
  { cap: 43, until: { badges: 6 } },
  { cap: 47, until: { badges: 7 } },
  { cap: 50, until: { badges: 8 } },
  { cap: 54, until: { fight: "elite-four-lorelei" } },
  { cap: 56, until: { fight: "elite-four-bruno" } },
  { cap: 58, until: { fight: "elite-four-agatha" } },
  { cap: 60, until: { fight: "elite-four-lance" } },
  { cap: 63, until: { fight: "champion-blue" } },
];
