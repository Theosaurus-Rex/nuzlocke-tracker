/**
 * Sword and Shield route order in traversal order. Shared by both versions. Bootstrapped from
 * domtronn/nuzlocke.data (routes/sw.txt, routes/sh.txt). Hand-owned now: edit directly, per
 * CLAUDE.md "Game data". The Wild Area is one route per named area. The two lake areas that need
 * Rotom Bike Water Mode sit after Route 9. Slumbering Weald is last because nothing can be caught
 * there until the second visit. Max Raid dens, Wedgehurst, the DLC and post-game places are left
 * out. Steamdrift Way, Circhester Bay and Outer Spikemuth are split from the routes upstream
 * merges them into.
 */

import type { RouteDef } from "@/game/types";

export const routes: RouteDef[] = [
  { id: "starter", name: "Starter", order: 1, region: "galar" },
  { id: "route-1", name: "Route 1", order: 2, region: "galar" },
  { id: "route-2", name: "Route 2", order: 3, region: "galar" },
  { id: "rolling-fields", name: "Rolling Fields", order: 4, region: "galar" },
  { id: "dappled-grove", name: "Dappled Grove", order: 5, region: "galar" },
  { id: "west-lake-axewell", name: "West Lake Axewell", order: 6, region: "galar" },
  { id: "watchtower-ruins", name: "Watchtower Ruins", order: 7, region: "galar" },
  { id: "east-lake-axewell", name: "East Lake Axewell", order: 8, region: "galar" },
  { id: "south-lake-miloch", name: "South Lake Miloch", order: 9, region: "galar" },
  { id: "giants-seat", name: "Giant's Seat", order: 10, region: "galar" },
  { id: "north-lake-miloch", name: "North Lake Miloch", order: 11, region: "galar" },
  { id: "motostoke", name: "Motostoke", order: 12, region: "galar" },
  { id: "route-3", name: "Route 3", order: 13, region: "galar" },
  { id: "galar-mine", name: "Galar Mine", order: 14, region: "galar" },
  { id: "route-4", name: "Route 4", order: 15, region: "galar" },
  { id: "turffield", name: "Turffield", order: 16, region: "galar", only: "gift" },
  { id: "route-5", name: "Route 5", order: 17, region: "galar" },
  { id: "hulbury", name: "Hulbury", order: 18, region: "galar" },
  { id: "galar-mine-no-2", name: "Galar Mine No. 2", order: 19, region: "galar" },
  { id: "motostoke-outskirts", name: "Motostoke Outskirts", order: 20, region: "galar" },
  { id: "motostoke-riverbank", name: "Motostoke Riverbank", order: 21, region: "galar" },
  { id: "bridge-field", name: "Bridge Field", order: 22, region: "galar" },
  { id: "stony-wilderness", name: "Stony Wilderness", order: 23, region: "galar" },
  { id: "dusty-bowl", name: "Dusty Bowl", order: 24, region: "galar" },
  { id: "giants-cap", name: "Giant's Cap", order: 25, region: "galar" },
  { id: "giants-mirror", name: "Giant's Mirror", order: 26, region: "galar" },
  { id: "hammerlocke-hills", name: "Hammerlocke Hills", order: 27, region: "galar" },
  { id: "hammerlocke", name: "Hammerlocke", order: 28, region: "galar", only: "gift" },
  { id: "route-6", name: "Route 6", order: 29, region: "galar" },
  { id: "stow-on-side", name: "Stow-on-Side", order: 30, region: "galar", only: "gift" },
  { id: "glimwood-tangle", name: "Glimwood Tangle", order: 31, region: "galar" },
  { id: "ballonlea", name: "Ballonlea", order: 32, region: "galar", only: "gift" },
  { id: "route-7", name: "Route 7", order: 33, region: "galar" },
  { id: "route-8", name: "Route 8", order: 34, region: "galar" },
  { id: "steamdrift-way", name: "Steamdrift Way", order: 35, region: "galar" },
  { id: "circhester", name: "Circhester", order: 36, region: "galar", only: "gift" },
  { id: "route-9", name: "Route 9", order: 37, region: "galar" },
  { id: "circhester-bay", name: "Circhester Bay", order: 38, region: "galar" },
  { id: "outer-spikemuth", name: "Outer Spikemuth", order: 39, region: "galar" },
  { id: "spikemuth", name: "Spikemuth", order: 40, region: "galar", only: "gift" },
  { id: "lake-of-outrage", name: "Lake of Outrage", order: 41, region: "galar" },
  { id: "axews-eye", name: "Axew's Eye", order: 42, region: "galar" },
  { id: "route-10", name: "Route 10", order: 43, region: "galar" },
  { id: "wyndon", name: "Wyndon", order: 44, region: "galar", only: "gift" },
  { id: "slumbering-weald", name: "Slumbering Weald", order: 45, region: "galar" },
  { id: "energy-plant", name: "Energy Plant", order: 46, region: "galar", only: "static" },
];
