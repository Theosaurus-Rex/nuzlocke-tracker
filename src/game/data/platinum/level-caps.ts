/**
 * Platinum level caps by progress. Source: "Hardcore Nuzlocke Level Caps by Generation",
 * Nuzlocke University, https://nuzlockeuniversity.ca/2022/01/18/hardcore-nuzlocke-level-caps-by-generation/
 * Gyms are listed by badge count and equal each gym's ace. The Distortion World and the other
 * boss fights have no cap.
 */

import type { LevelCapMilestone } from "@/domain/types";

export const levelCaps: LevelCapMilestone[] = [
  { cap: 14, until: { badges: 1 } },
  { cap: 22, until: { badges: 2 } },
  { cap: 26, until: { badges: 3 } },
  { cap: 32, until: { badges: 4 } },
  { cap: 37, until: { badges: 5 } },
  { cap: 41, until: { badges: 6 } },
  { cap: 44, until: { badges: 7 } },
  { cap: 50, until: { badges: 8 } },
  { cap: 53, until: { fight: "elite-four-aaron" } },
  { cap: 55, until: { fight: "elite-four-bertha" } },
  { cap: 57, until: { fight: "elite-four-flint" } },
  { cap: 59, until: { fight: "elite-four-lucian" } },
  { cap: 62, until: { fight: "champion-cynthia" } },
];
