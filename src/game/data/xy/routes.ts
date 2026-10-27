/**
 * X and Y route order in traversal order. Shared by both versions. Bootstrapped from
 * domtronn/nuzlocke.data (routes/xy.txt). Hand-owned now: edit directly, per CLAUDE.md "Game data".
 * Aquacorde Town, Battle Chateau, the second Route 22, Sea Spirit's Den and Friend Safari are left
 * out. Santalune City, Snowbelle City and the three gift and static places are added.
 */

import type { RouteDef } from "@/game/types";

export const routes: RouteDef[] = [
  { id: "starter", name: "Starter", order: 1, region: "kalos" },
  { id: "route-2", name: "Route 2", order: 2, region: "kalos" },
  { id: "santalune-forest", name: "Santalune Forest", order: 3, region: "kalos" },
  { id: "route-3", name: "Route 3", order: 4, region: "kalos" },
  // Only the Farfetch'd trade for a Bunnelby. Upstream has no row for it.
  { id: "santalune-city", name: "Santalune City", order: 5, region: "kalos", only: "gift" },
  // Reached from Santalune City at once, so it sits early as upstream has it.
  { id: "route-22", name: "Route 22", order: 6, region: "kalos" },
  { id: "route-4", name: "Route 4", order: 7, region: "kalos" },
  // Only the Kanto starter from Sycamore.
  { id: "lumiose-city", name: "Lumiose City", order: 8, region: "kalos", only: "gift" },
  { id: "route-5", name: "Route 5", order: 9, region: "kalos" },
  { id: "route-7", name: "Route 7", order: 10, region: "kalos" },
  { id: "route-6", name: "Route 6", order: 11, region: "kalos" },
  // Fishing only, from the courtyard pond.
  { id: "parfum-palace", name: "Parfum Palace", order: 12, region: "kalos" },
  { id: "connecting-cave", name: "Connecting Cave", order: 13, region: "kalos" },
  { id: "route-8", name: "Route 8", order: 14, region: "kalos" },
  { id: "ambrette-town", name: "Ambrette Town", order: 15, region: "kalos" },
  { id: "route-9", name: "Route 9", order: 16, region: "kalos" },
  { id: "glittering-cave", name: "Glittering Cave", order: 17, region: "kalos" },
  { id: "cyllage-city", name: "Cyllage City", order: 18, region: "kalos" },
  { id: "route-10", name: "Route 10", order: 19, region: "kalos" },
  { id: "route-11", name: "Route 11", order: 20, region: "kalos" },
  { id: "reflection-cave", name: "Reflection Cave", order: 21, region: "kalos" },
  { id: "shalour-city", name: "Shalour City", order: 22, region: "kalos" },
  // Only the Lucario gift. Upstream calls it Tower of Mystery.
  { id: "tower-of-mastery", name: "Tower of Mastery", order: 23, region: "kalos", only: "gift" },
  { id: "route-12", name: "Route 12", order: 24, region: "kalos" },
  { id: "azure-bay", name: "Azure Bay", order: 25, region: "kalos" },
  { id: "route-13", name: "Route 13", order: 26, region: "kalos" },
  { id: "route-14", name: "Route 14", order: 27, region: "kalos" },
  { id: "laverre-city", name: "Laverre City", order: 28, region: "kalos" },
  { id: "route-15", name: "Route 15", order: 29, region: "kalos" },
  { id: "lost-hotel", name: "Lost Hotel", order: 30, region: "kalos" },
  { id: "route-16", name: "Route 16", order: 31, region: "kalos" },
  { id: "frost-cavern", name: "Frost Cavern", order: 32, region: "kalos" },
  { id: "route-17", name: "Route 17", order: 33, region: "kalos" },
  // Xerneas in X and Yveltal in Y, a required catch.
  {
    id: "team-flare-secret-hq",
    name: "Team Flare Secret HQ",
    order: 34,
    region: "kalos",
    only: "static",
  },
  { id: "route-18", name: "Route 18", order: 35, region: "kalos" },
  // Open from Route 18. Only Zygarde's chamber is post-game.
  { id: "terminus-cave", name: "Terminus Cave", order: 36, region: "kalos" },
  { id: "couriway-town", name: "Couriway Town", order: 37, region: "kalos" },
  { id: "route-19", name: "Route 19", order: 38, region: "kalos" },
  // Only the Bisharp trade for a Jigglypuff. Upstream has no row for it.
  { id: "snowbelle-city", name: "Snowbelle City", order: 39, region: "kalos", only: "gift" },
  { id: "route-20", name: "Route 20", order: 40, region: "kalos" },
  { id: "pokemon-village", name: "Pokémon Village", order: 41, region: "kalos" },
  { id: "route-21", name: "Route 21", order: 42, region: "kalos" },
  { id: "victory-road", name: "Victory Road", order: 43, region: "kalos" },
];
