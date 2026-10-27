/**
 * Black 2 and White 2 route order in traversal order. Shared by both versions. Bootstrapped from
 * domtronn/nuzlocke.data (routes/bl2.txt, routes/wh2.txt). Hand-owned now: edit directly, per
 * CLAUDE.md "Game data". The 23 post-game places and Floccesy Town are left out. Relic Passage,
 * Castelia Sewers and the Seaside Cave and Route 21 pair move to match the walkthrough.
 */

import type { RouteDef } from "@/game/types";

export const routes: RouteDef[] = [
  { id: "starter", name: "Starter", order: 1, region: "unova" },
  // Surf only. Upstream lists Super Rod fish, which are post-game.
  { id: "aspertia-city", name: "Aspertia City", order: 2, region: "unova" },
  { id: "route-19", name: "Route 19", order: 3, region: "unova" },
  { id: "route-20", name: "Route 20", order: 4, region: "unova" },
  { id: "floccesy-ranch", name: "Floccesy Ranch", order: 5, region: "unova" },
  // Surf only. Upstream lists Super Rod fish, which are post-game.
  { id: "virbank-city", name: "Virbank City", order: 6, region: "unova" },
  { id: "virbank-complex", name: "Virbank Complex", order: 7, region: "unova" },
  { id: "castelia-sewers", name: "Castelia Sewers", order: 8, region: "unova" },
  // The wild grass is the Empty Lot, reached through the Sewers.
  { id: "castelia-city", name: "Castelia City", order: 9, region: "unova" },
  { id: "route-4", name: "Route 4", order: 10, region: "unova" },
  { id: "desert-resort", name: "Desert Resort", order: 11, region: "unova" },
  { id: "relic-castle", name: "Relic Castle", order: 12, region: "unova" },
  { id: "route-16", name: "Route 16", order: 13, region: "unova" },
  { id: "lostlorn-forest", name: "Lostlorn Forest", order: 14, region: "unova" },
  { id: "route-5", name: "Route 5", order: 15, region: "unova" },
  { id: "driftveil-drawbridge", name: "Driftveil Drawbridge", order: 16, region: "unova" },
  // Only the Zorua gift from Rood. Upstream lists Surf and fishing Pokemon from Black and White.
  { id: "driftveil-city", name: "Driftveil City", order: 17, region: "unova", only: "gift" },
  { id: "relic-passage", name: "Relic Passage", order: 18, region: "unova" },
  { id: "route-6", name: "Route 6", order: 19, region: "unova" },
  { id: "mistralton-cave", name: "Mistralton Cave", order: 20, region: "unova" },
  { id: "chargestone-cave", name: "Chargestone Cave", order: 21, region: "unova" },
  { id: "route-7", name: "Route 7", order: 22, region: "unova" },
  { id: "celestial-tower", name: "Celestial Tower", order: 23, region: "unova" },
  { id: "strange-house", name: "Strange House", order: 24, region: "unova" },
  { id: "reversal-mountain", name: "Reversal Mountain", order: 25, region: "unova" },
  { id: "undella-town", name: "Undella Town", order: 26, region: "unova" },
  { id: "undella-bay", name: "Undella Bay", order: 27, region: "unova" },
  { id: "route-13", name: "Route 13", order: 28, region: "unova" },
  { id: "route-12", name: "Route 12", order: 29, region: "unova" },
  { id: "village-bridge", name: "Village Bridge", order: 30, region: "unova" },
  { id: "route-11", name: "Route 11", order: 31, region: "unova" },
  { id: "route-9", name: "Route 9", order: 32, region: "unova" },
  { id: "humilau-city", name: "Humilau City", order: 33, region: "unova" },
  { id: "route-22", name: "Route 22", order: 34, region: "unova" },
  { id: "route-21", name: "Route 21", order: 35, region: "unova" },
  { id: "seaside-cave", name: "Seaside Cave", order: 36, region: "unova" },
  { id: "giant-chasm", name: "Giant Chasm", order: 37, region: "unova" },
  { id: "route-23", name: "Route 23", order: 38, region: "unova" },
  { id: "victory-road", name: "Victory Road", order: 39, region: "unova" },
];
