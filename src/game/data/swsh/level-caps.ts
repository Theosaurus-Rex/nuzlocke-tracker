/**
 * Sword and Shield level caps by progress. Source: "Hardcore Nuzlocke Level Caps by Generation",
 * Nuzlocke University, https://nuzlockeuniversity.ca/2022/01/18/hardcore-nuzlocke-level-caps-by-generation/
 * Gyms are listed by badge count and equal each gym's ace. The Champion Cup is a fixed order, so
 * each duel has a cap of its own. Both versions share the table.
 */

import type { LevelCapMilestone } from "@/domain/types";

export const levelCaps: LevelCapMilestone[] = [
  { cap: 20, until: { badges: 1 } },
  { cap: 24, until: { badges: 2 } },
  { cap: 27, until: { badges: 3 } },
  { cap: 36, until: { badges: 4 } },
  { cap: 38, until: { badges: 5 } },
  { cap: 42, until: { badges: 6 } },
  { cap: 46, until: { badges: 7 } },
  { cap: 48, until: { badges: 8 } },
  { cap: 49, until: { fight: "elite-four-marnie" } },
  { cap: 49, until: { fight: "elite-four-hop" } },
  { cap: 53, until: { fight: "elite-four-bede" } },
  { cap: 53, until: { fight: "elite-four-nessa" } },
  { cap: 54, until: { fight: "elite-four-bea-allister" } },
  { cap: 55, until: { fight: "elite-four-raihan" } },
  { cap: 65, until: { fight: "champion-leon" } },
];
