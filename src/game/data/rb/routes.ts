/**
 * Red and Blue route order in traversal order. Shared by both versions. Bootstrapped from
 * domtronn/nuzlocke.data (routes/red.txt, routes/blue.txt) and checked against pret/pokered at
 * commit 171e2c204f9c1ff8e577ca387a4bbb009e130843. Hand-owned now: edit directly, per CLAUDE.md
 * "Game data". Cerulean Cave is post-game and left out.
 */

import type { RouteDef } from "@/game/types";

export const routes: RouteDef[] = [
  { id: "starter", name: "Starter", order: 1, region: "kanto" },
  { id: "pallet-town", name: "Pallet Town", order: 2, region: "kanto" },
  { id: "route-1", name: "Route 1", order: 3, region: "kanto" },
  { id: "viridian-city", name: "Viridian City", order: 4, region: "kanto" },
  { id: "route-22", name: "Route 22", order: 5, region: "kanto" },
  { id: "route-2", name: "Route 2", order: 6, region: "kanto" },
  { id: "viridian-forest", name: "Viridian Forest", order: 7, region: "kanto" },
  { id: "route-3", name: "Route 3", order: 8, region: "kanto" },
  { id: "route-4", name: "Route 4", order: 9, region: "kanto" },
  { id: "mt-moon", name: "Mt. Moon", order: 10, region: "kanto" },
  { id: "cerulean-city", name: "Cerulean City", order: 11, region: "kanto" },
  { id: "route-24", name: "Route 24", order: 12, region: "kanto" },
  { id: "route-25", name: "Route 25", order: 13, region: "kanto" },
  { id: "route-5", name: "Route 5", order: 14, region: "kanto" },
  { id: "route-6", name: "Route 6", order: 15, region: "kanto" },
  { id: "vermilion-city", name: "Vermilion City", order: 16, region: "kanto" },
  { id: "route-11", name: "Route 11", order: 17, region: "kanto" },
  { id: "digletts-cave", name: "Diglett's Cave", order: 18, region: "kanto" },
  { id: "route-9", name: "Route 9", order: 19, region: "kanto" },
  { id: "route-10", name: "Route 10", order: 20, region: "kanto" },
  { id: "rock-tunnel", name: "Rock Tunnel", order: 21, region: "kanto" },
  { id: "pokemon-tower", name: "Pokémon Tower", order: 22, region: "kanto" },
  { id: "route-12", name: "Route 12", order: 23, region: "kanto" },
  { id: "route-8", name: "Route 8", order: 24, region: "kanto" },
  { id: "route-7", name: "Route 7", order: 25, region: "kanto" },
  { id: "celadon-city", name: "Celadon City", order: 26, region: "kanto" },
  { id: "saffron-city", name: "Saffron City", order: 27, region: "kanto", only: "gift" },
  { id: "silph-co", name: "Silph Co.", order: 28, region: "kanto", only: "gift" },
  { id: "route-16", name: "Route 16", order: 29, region: "kanto" },
  { id: "route-17", name: "Route 17", order: 30, region: "kanto" },
  { id: "route-18", name: "Route 18", order: 31, region: "kanto" },
  { id: "fuchsia-city", name: "Fuchsia City", order: 32, region: "kanto" },
  { id: "safari-zone", name: "Safari Zone", order: 33, region: "kanto" },
  { id: "route-15", name: "Route 15", order: 34, region: "kanto" },
  { id: "route-14", name: "Route 14", order: 35, region: "kanto" },
  { id: "route-13", name: "Route 13", order: 36, region: "kanto" },
  { id: "power-plant", name: "Power Plant", order: 37, region: "kanto" },
  { id: "route-19", name: "Route 19", order: 38, region: "kanto" },
  { id: "route-20", name: "Route 20", order: 39, region: "kanto" },
  { id: "seafoam-islands", name: "Seafoam Islands", order: 40, region: "kanto" },
  { id: "cinnabar-island", name: "Cinnabar Island", order: 41, region: "kanto" },
  { id: "pokemon-mansion", name: "Pokémon Mansion", order: 42, region: "kanto" },
  { id: "route-21", name: "Route 21", order: 43, region: "kanto" },
  { id: "route-23", name: "Route 23", order: 44, region: "kanto" },
  { id: "victory-road", name: "Victory Road", order: 45, region: "kanto" },
];
