/**
 * FireRed and LeafGreen route order, Kanto then the Sevii Islands, in traversal order.
 * Bootstrapped from domtronn/nuzlocke.data (routes/fr.txt). Hand-owned now: edit directly, per
 * CLAUDE.md "Game data".
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
  // Upstream spells Vermillion and Fuschia wrong. HeartGold keeps the upstream ids.
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
  // Hitmonlee or Hitmonchan gift only.
  { id: "saffron-city", name: "Saffron City", order: 27, region: "kanto", only: "gift" },
  // Not in upstream. Added for the Lapras gift.
  // Lapras gift only.
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
  { id: "one-island", name: "One Island", order: 43, region: "sevii" },
  // Not in upstream: every Sevii area with a catchable Pokemon is a route, down to Tanoby Ruins.
  { id: "kindle-road", name: "Kindle Road", order: 44, region: "sevii" },
  { id: "treasure-beach", name: "Treasure Beach", order: 45, region: "sevii" },
  // Upstream has Moltres on Victory Road. It is on Mt. Ember.
  { id: "mt-ember", name: "Mt. Ember", order: 46, region: "sevii" },
  { id: "cape-brink", name: "Cape Brink", order: 47, region: "sevii" },
  // Upstream has "Three Island". The only encounter there is at the port.
  { id: "three-isle-port", name: "Three Isle Port", order: 48, region: "sevii" },
  { id: "bond-bridge", name: "Bond Bridge", order: 49, region: "sevii" },
  { id: "berry-forest", name: "Berry Forest", order: 50, region: "sevii" },
  { id: "route-21", name: "Route 21", order: 51, region: "kanto" },
  { id: "route-23", name: "Route 23", order: 52, region: "kanto" },
  { id: "victory-road", name: "Victory Road", order: 53, region: "kanto" },
  { id: "four-island", name: "Four Island", order: 54, region: "sevii" },
  { id: "icefall-cave", name: "Icefall Cave", order: 55, region: "sevii" },
  { id: "five-island", name: "Five Island", order: 56, region: "sevii" },
  { id: "five-isle-meadow", name: "Five Isle Meadow", order: 57, region: "sevii" },
  { id: "memorial-pillar", name: "Memorial Pillar", order: 58, region: "sevii" },
  { id: "water-labyrinth", name: "Water Labyrinth", order: 59, region: "sevii" },
  { id: "resort-gorgeous", name: "Resort Gorgeous", order: 60, region: "sevii" },
  { id: "lost-cave", name: "Lost Cave", order: 61, region: "sevii" },
  { id: "water-path", name: "Water Path", order: 62, region: "sevii" },
  { id: "ruin-valley", name: "Ruin Valley", order: 63, region: "sevii" },
  { id: "green-path", name: "Green Path", order: 64, region: "sevii" },
  { id: "pattern-bush", name: "Pattern Bush", order: 65, region: "sevii" },
  { id: "outcast-island", name: "Outcast Island", order: 66, region: "sevii" },
  { id: "altering-cave", name: "Altering Cave", order: 67, region: "sevii" },
  { id: "trainer-tower", name: "Trainer Tower", order: 68, region: "sevii" },
  { id: "canyon-entrance", name: "Canyon Entrance", order: 69, region: "sevii" },
  { id: "sevault-canyon", name: "Sevault Canyon", order: 70, region: "sevii" },
  { id: "tanoby-ruins", name: "Tanoby Ruins", order: 71, region: "sevii" },
  { id: "cerulean-cave", name: "Cerulean Cave", order: 72, region: "kanto" },
];
