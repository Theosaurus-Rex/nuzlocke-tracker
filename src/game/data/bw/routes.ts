/**
 * Black and White route order in traversal order. Shared by both versions. Bootstrapped from
 * domtronn/nuzlocke.data (routes/bl.txt, routes/wh.txt). Hand-owned now: edit directly, per
 * CLAUDE.md "Game data". Post-game places are left out, and so is Castelia City, whose only item
 * is an event gift. Virizion is part of Pinwheel Forest. Celestial Tower and Mistralton Cave
 * move to match the walkthrough.
 */

import type { RouteDef } from "@/game/types";

export const routes: RouteDef[] = [
  { id: "starter", name: "Starter", order: 1, region: "unova" },
  { id: "route-1", name: "Route 1", order: 2, region: "unova" },
  { id: "route-2", name: "Route 2", order: 3, region: "unova" },
  { id: "striaton-city", name: "Striaton City", order: 4, region: "unova" },
  { id: "dreamyard", name: "Dreamyard", order: 5, region: "unova" },
  { id: "route-3", name: "Route 3", order: 6, region: "unova" },
  { id: "wellspring-cave", name: "Wellspring Cave", order: 7, region: "unova" },
  // Tirtouga or Archen fossil revival, plus the Petilil and Cottonee trade. No wild Pokemon.
  { id: "nacrene-city", name: "Nacrene City", order: 8, region: "unova", only: "gift" },
  { id: "pinwheel-forest", name: "Pinwheel Forest", order: 9, region: "unova" },
  { id: "route-4", name: "Route 4", order: 10, region: "unova" },
  { id: "desert-resort", name: "Desert Resort", order: 11, region: "unova" },
  { id: "relic-castle", name: "Relic Castle", order: 12, region: "unova" },
  { id: "route-5", name: "Route 5", order: 13, region: "unova" },
  { id: "driftveil-drawbridge", name: "Driftveil Drawbridge", order: 14, region: "unova" },
  { id: "driftveil-city", name: "Driftveil City", order: 15, region: "unova" },
  { id: "cold-storage", name: "Cold Storage", order: 16, region: "unova" },
  { id: "route-6", name: "Route 6", order: 17, region: "unova" },
  { id: "chargestone-cave", name: "Chargestone Cave", order: 18, region: "unova" },
  { id: "route-7", name: "Route 7", order: 19, region: "unova" },
  { id: "celestial-tower", name: "Celestial Tower", order: 20, region: "unova" },
  { id: "route-17", name: "Route 17", order: 21, region: "unova" },
  { id: "route-18", name: "Route 18", order: 22, region: "unova" },
  { id: "p2-laboratory", name: "P2 Laboratory", order: 23, region: "unova" },
  { id: "mistralton-cave", name: "Mistralton Cave", order: 24, region: "unova" },
  { id: "twist-mountain", name: "Twist Mountain", order: 25, region: "unova" },
  { id: "icirrus-city", name: "Icirrus City", order: 26, region: "unova" },
  { id: "dragonspiral-tower", name: "Dragonspiral Tower", order: 27, region: "unova" },
  { id: "route-8", name: "Route 8", order: 28, region: "unova" },
  { id: "moor-of-icirrus", name: "Moor of Icirrus", order: 29, region: "unova" },
  { id: "route-9", name: "Route 9", order: 30, region: "unova" },
  { id: "route-10", name: "Route 10", order: 31, region: "unova" },
  { id: "victory-road", name: "Victory Road", order: 32, region: "unova" },
  // Reshiram in Black or Zekrom in White, a required catch. Not in upstream as a route.
  { id: "n-castle", name: "N's Castle", order: 33, region: "unova", only: "static" },
];
