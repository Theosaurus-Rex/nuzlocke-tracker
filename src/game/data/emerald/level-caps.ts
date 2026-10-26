/**
 * Emerald level caps by progress. Source: "Hardcore Nuzlocke Level Caps by Generation", Nuzlocke
 * University, https://nuzlockeuniversity.ca/2022/01/18/hardcore-nuzlocke-level-caps-by-generation/
 * Gyms are listed by badge count and every cap is above the one before. Steven is the "Meteor
 * Falls: Lv 78" line.
 */

import type { LevelCapMilestone } from "@/domain/types";

export const levelCaps: LevelCapMilestone[] = [
  { cap: 15, until: { badges: 1 } },
  { cap: 19, until: { badges: 2 } },
  { cap: 24, until: { badges: 3 } },
  { cap: 29, until: { badges: 4 } },
  { cap: 31, until: { badges: 5 } },
  { cap: 33, until: { badges: 6 } },
  { cap: 42, until: { badges: 7 } },
  { cap: 46, until: { badges: 8 } },
  { cap: 49, until: { fight: "elite-four-sidney" } },
  { cap: 51, until: { fight: "elite-four-phoebe" } },
  { cap: 53, until: { fight: "elite-four-glacia" } },
  { cap: 55, until: { fight: "elite-four-drake" } },
  { cap: 58, until: { fight: "champion-wallace" } },
  { cap: 78, until: { fight: "boss-steven-meteor-falls" } },
];
