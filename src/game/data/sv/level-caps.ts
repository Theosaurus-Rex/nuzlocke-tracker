/**
 * Scarlet and Violet level caps by path. Source: "Hardcore Nuzlocke Level Caps by Generation",
 * Nuzlocke University, https://nuzlockeuniversity.ca/2022/01/18/hardcore-nuzlocke-level-caps-by-generation/
 * The Titan caps use each Titan's own level, where the source lists Arven's partner levels.
 */

import type { LevelCapMilestone } from "@/domain/types";

export const levelCaps: LevelCapMilestone[] = [
  { cap: 15, until: { badges: 1 }, path: "Gyms" },
  { cap: 17, until: { badges: 2 }, path: "Gyms" },
  { cap: 24, until: { badges: 3 }, path: "Gyms" },
  { cap: 30, until: { badges: 4 }, path: "Gyms" },
  { cap: 36, until: { badges: 5 }, path: "Gyms" },
  { cap: 42, until: { badges: 6 }, path: "Gyms" },
  { cap: 45, until: { badges: 7 }, path: "Gyms" },
  { cap: 48, until: { badges: 8 }, path: "Gyms" },
  { cap: 58, until: { fight: "elite-four-rika" }, path: "Gyms" },
  { cap: 59, until: { fight: "elite-four-poppy" }, path: "Gyms" },
  { cap: 60, until: { fight: "elite-four-larry" }, path: "Gyms" },
  { cap: 61, until: { fight: "elite-four-hassel" }, path: "Gyms" },
  { cap: 62, until: { fight: "champion-geeta" }, path: "Gyms" },
  { cap: 66, until: { fight: "rival-nemona-6" }, path: "Gyms" },
  { cap: 16, until: { fight: "boss-klawf" }, path: "Titans" },
  { cap: 20, until: { fight: "boss-bombirdier" }, path: "Titans" },
  { cap: 29, until: { fight: "boss-orthworm" }, path: "Titans" },
  { cap: 45, until: { fight: "boss-great-tusk-iron-treads" }, path: "Titans" },
  { cap: 57, until: { fight: "boss-dondozo-tatsugiri" }, path: "Titans" },
  { cap: 63, until: { fight: "rival-arven-2" }, path: "Titans" },
  { cap: 21, until: { fight: "boss-giacomo" }, path: "Team Star" },
  { cap: 27, until: { fight: "boss-mela" }, path: "Team Star" },
  { cap: 33, until: { fight: "boss-atticus" }, path: "Team Star" },
  { cap: 51, until: { fight: "boss-ortega" }, path: "Team Star" },
  { cap: 56, until: { fight: "boss-eri" }, path: "Team Star" },
  { cap: 61, until: { fight: "boss-clavell" }, path: "Team Star" },
  { cap: 63, until: { fight: "boss-penny" }, path: "Team Star" },
  { cap: 67, until: { fight: "boss-ai-sada-turo" } },
];
