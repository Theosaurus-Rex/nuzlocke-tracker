/**
 * Sun and Moon route order in traversal order, as the Bulbapedia walkthrough runs. Shared by both
 * versions. Bootstrapped from domtronn/nuzlocke.data (routes/sun.txt, routes/moon.txt). Hand-owned
 * now: edit directly, per CLAUDE.md "Game data". Post-game places, Ultra Beasts and the Zygarde
 * and fossil side quests are left out. Route 1 comes before Hau'oli Outskirts, as in the walkthrough.
 */

import type { RouteDef } from "@/game/types";

export const routes: RouteDef[] = [
  { id: "starter", name: "Starter", order: 1, region: "melemele" },
  { id: "route-1", name: "Route 1", order: 2, region: "melemele" },
  { id: "hauoli-outskirts", name: "Hau'oli Outskirts", order: 3, region: "melemele" },
  { id: "trainers-school", name: "Trainers' School", order: 4, region: "melemele" },
  { id: "hauoli-city", name: "Hau'oli City", order: 5, region: "melemele" },
  { id: "route-2", name: "Route 2", order: 6, region: "melemele" },
  { id: "hauoli-cemetery", name: "Hau'oli Cemetery", order: 7, region: "melemele" },
  { id: "verdant-cavern", name: "Verdant Cavern", order: 8, region: "melemele" },
  { id: "route-3", name: "Route 3", order: 9, region: "melemele" },
  { id: "melemele-meadow", name: "Melemele Meadow", order: 10, region: "melemele" },
  { id: "seaward-cave", name: "Seaward Cave", order: 11, region: "melemele" },
  { id: "kalae-bay", name: "Kala'e Bay", order: 12, region: "melemele" },
  { id: "ten-carat-hill", name: "Ten Carat Hill", order: 13, region: "melemele" },
  { id: "route-4", name: "Route 4", order: 14, region: "akala" },
  { id: "paniola-town", name: "Paniola Town", order: 15, region: "akala" },
  { id: "paniola-ranch", name: "Paniola Ranch", order: 16, region: "akala" },
  { id: "route-5", name: "Route 5", order: 17, region: "akala" },
  { id: "brooklet-hill", name: "Brooklet Hill", order: 18, region: "akala" },
  { id: "route-6", name: "Route 6", order: 19, region: "akala" },
  { id: "route-7", name: "Route 7", order: 20, region: "akala" },
  { id: "wela-volcano-park", name: "Wela Volcano Park", order: 21, region: "akala" },
  { id: "melemele-sea", name: "Melemele Sea", order: 22, region: "akala" },
  { id: "route-8", name: "Route 8", order: 23, region: "akala" },
  { id: "lush-jungle", name: "Lush Jungle", order: 24, region: "akala" },
  { id: "digletts-tunnel", name: "Diglett's Tunnel", order: 25, region: "akala" },
  { id: "route-9", name: "Route 9", order: 26, region: "akala" },
  { id: "konikoni-city", name: "Konikoni City", order: 27, region: "akala", only: "gift" },
  { id: "memorial-hill", name: "Memorial Hill", order: 28, region: "akala" },
  { id: "akala-outskirts", name: "Akala Outskirts", order: 29, region: "akala" },
  { id: "hano-beach", name: "Hano Beach", order: 30, region: "akala" },
  { id: "malie-city", name: "Malie City", order: 31, region: "ula'ula" },
  { id: "malie-garden", name: "Malie Garden", order: 32, region: "ula'ula" },
  { id: "route-10", name: "Route 10", order: 33, region: "ula'ula" },
  { id: "mount-hokulani", name: "Mount Hokulani", order: 34, region: "ula'ula" },
  { id: "route-11", name: "Route 11", order: 35, region: "ula'ula" },
  { id: "route-12", name: "Route 12", order: 36, region: "ula'ula" },
  { id: "blush-mountain", name: "Blush Mountain", order: 37, region: "ula'ula" },
  { id: "secluded-shore", name: "Secluded Shore", order: 38, region: "ula'ula" },
  { id: "route-13", name: "Route 13", order: 39, region: "ula'ula" },
  { id: "tapu-village", name: "Tapu Village", order: 40, region: "ula'ula" },
  { id: "route-15", name: "Route 15", order: 41, region: "ula'ula" },
  { id: "route-14", name: "Route 14", order: 42, region: "ula'ula" },
  { id: "thrifty-megamart", name: "Thrifty Megamart", order: 43, region: "ula'ula" },
  { id: "route-16", name: "Route 16", order: 44, region: "ula'ula" },
  { id: "ulaula-meadow", name: "Ula'ula Meadow", order: 45, region: "ula'ula" },
  { id: "route-17", name: "Route 17", order: 46, region: "ula'ula" },
  { id: "seafolk-village", name: "Seafolk Village", order: 47, region: "poni" },
  { id: "poni-wilds", name: "Poni Wilds", order: 48, region: "poni" },
  { id: "ancient-poni-path", name: "Ancient Poni Path", order: 49, region: "poni" },
  { id: "poni-breaker-coast", name: "Poni Breaker Coast", order: 50, region: "poni" },
  { id: "exeggutor-island", name: "Exeggutor Island", order: 51, region: "poni" },
  { id: "vast-poni-canyon", name: "Vast Poni Canyon", order: 52, region: "poni" },
  {
    id: "altar-of-the-sunne",
    name: "Altar of the Sunne",
    order: 53,
    region: "poni",
    only: "static",
  },
  { id: "mount-lanakila", name: "Mount Lanakila", order: 54, region: "poni" },
];

export const moonRoutes: RouteDef[] = routes.map((route) =>
  route.id === "altar-of-the-sunne" ? { ...route, name: "Altar of the Moone" } : route,
);
