/**
 * Platinum routes in traversal order. Bootstrapped from domtronn/nuzlocke.data (routes/pt.txt,
 * not the stale routes/plat.txt) and checked against the pret/pokeplatinum decompilation's wild
 * tables and scripts. Hand-owned now: edit directly, per CLAUDE.md "Game data". Post-game places
 * are left out, so the story ends at the Pokémon League. Spear Pillar is not a route, since
 * nothing can be caught there before then. Mesprit roams, so it has no route.
 */

import type { RouteDef } from "@/game/types";

export const routes: RouteDef[] = [
  { id: "starter", name: "Starter", order: 1, region: "sinnoh" },
  { id: "twinleaf-town", name: "Twinleaf Town", order: 2, region: "sinnoh" },
  { id: "route-201", name: "Route 201", order: 3, region: "sinnoh" },
  { id: "lake-verity", name: "Lake Verity", order: 4, region: "sinnoh" },
  { id: "route-202", name: "Route 202", order: 5, region: "sinnoh" },
  { id: "route-203", name: "Route 203", order: 6, region: "sinnoh" },
  { id: "oreburgh-gate", name: "Oreburgh Gate", order: 7, region: "sinnoh" },
  // Abra for Machop trade and fossil revival. No wild Pokemon.
  { id: "oreburgh-city", name: "Oreburgh City", order: 8, region: "sinnoh", only: "gift" },
  { id: "oreburgh-mine", name: "Oreburgh Mine", order: 9, region: "sinnoh" },
  { id: "route-204", name: "Route 204", order: 10, region: "sinnoh" },
  { id: "ravaged-path", name: "Ravaged Path", order: 11, region: "sinnoh" },
  // No wild grass, but the honey tree here is a wild-style encounter.
  { id: "floaroma-meadow", name: "Floaroma Meadow", order: 12, region: "sinnoh" },
  // Floaroma Meadow gives the key, so it comes first. Upstream has Route 205 before this.
  { id: "valley-windworks", name: "Valley Windworks", order: 13, region: "sinnoh" },
  { id: "route-205", name: "Route 205", order: 14, region: "sinnoh" },
  { id: "eterna-forest", name: "Eterna Forest", order: 15, region: "sinnoh" },
  { id: "eterna-city", name: "Eterna City", order: 16, region: "sinnoh" },
  // Needs Cut, so it follows Eterna City. Upstream has it before.
  { id: "old-chateau", name: "Old Chateau", order: 17, region: "sinnoh" },
  { id: "route-206", name: "Route 206", order: 18, region: "sinnoh" },
  { id: "wayward-cave", name: "Wayward Cave", order: 19, region: "sinnoh" },
  // Moved after Wayward Cave to match the walkthrough.
  { id: "route-207", name: "Route 207", order: 20, region: "sinnoh" },
  { id: "mt-coronet", name: "Mt. Coronet", order: 21, region: "sinnoh" },
  { id: "route-208", name: "Route 208", order: 22, region: "sinnoh" },
  // Eevee gift. No wild Pokemon.
  { id: "hearthome-city", name: "Hearthome City", order: 23, region: "sinnoh", only: "gift" },
  { id: "route-209", name: "Route 209", order: 24, region: "sinnoh" },
  { id: "lost-tower", name: "The Lost Tower", order: 25, region: "sinnoh" },
  { id: "solaceon-ruins", name: "Solaceon Ruins", order: 26, region: "sinnoh" },
  { id: "route-210", name: "Route 210", order: 27, region: "sinnoh" },
  { id: "route-215", name: "Route 215", order: 28, region: "sinnoh" },
  // Porygon gift. No wild Pokemon.
  { id: "veilstone-city", name: "Veilstone City", order: 29, region: "sinnoh", only: "gift" },
  { id: "route-214", name: "Route 214", order: 30, region: "sinnoh" },
  // Merges upstream's cave and tunnel, which share one wild table.
  { id: "ruin-maniac-cave", name: "Ruin Maniac Cave", order: 31, region: "sinnoh" },
  { id: "valor-lakefront", name: "Valor Lakefront", order: 32, region: "sinnoh" },
  // Visited before Pastoria City. Upstream has it after Route 212.
  { id: "route-213", name: "Route 213", order: 33, region: "sinnoh" },
  { id: "pastoria-city", name: "Pastoria City", order: 34, region: "sinnoh" },
  { id: "route-212", name: "Route 212", order: 35, region: "sinnoh" },
  // Open in the story. Not in upstream.
  { id: "trophy-garden", name: "Trophy Garden", order: 36, region: "sinnoh" },
  // Open in the story once the Valor Lakefront event is done.
  { id: "great-marsh", name: "Great Marsh", order: 37, region: "sinnoh" },
  { id: "celestic-town", name: "Celestic Town", order: 38, region: "sinnoh" },
  { id: "fuego-ironworks", name: "Fuego Ironworks", order: 39, region: "sinnoh" },
  { id: "route-219", name: "Route 219", order: 40, region: "sinnoh" },
  { id: "route-220", name: "Route 220", order: 41, region: "sinnoh" },
  { id: "route-221", name: "Route 221", order: 42, region: "sinnoh" },
  { id: "route-218", name: "Route 218", order: 43, region: "sinnoh" },
  { id: "canalave-city", name: "Canalave City", order: 44, region: "sinnoh" },
  { id: "iron-island", name: "Iron Island", order: 45, region: "sinnoh" },
  // Not in upstream. Azelf is caught here after the Distortion World.
  { id: "lake-valor", name: "Lake Valor", order: 46, region: "sinnoh" },
  { id: "route-211", name: "Route 211", order: 47, region: "sinnoh" },
  { id: "route-216", name: "Route 216", order: 48, region: "sinnoh" },
  { id: "route-217", name: "Route 217", order: 49, region: "sinnoh" },
  { id: "acuity-lakefront", name: "Acuity Lakefront", order: 50, region: "sinnoh" },
  // Medicham for Haunter trade only. Not in upstream.
  { id: "snowpoint-city", name: "Snowpoint City", order: 51, region: "sinnoh", only: "gift" },
  { id: "lake-acuity", name: "Lake Acuity", order: 52, region: "sinnoh" },
  // Giratina (Origin Forme) at the end. No wild Pokemon.
  { id: "distortion-world", name: "Distortion World", order: 53, region: "sinnoh", only: "static" },
  // You exit the Distortion World here. Not in upstream.
  { id: "sendoff-spring", name: "Sendoff Spring", order: 54, region: "sinnoh" },
  { id: "route-222", name: "Route 222", order: 55, region: "sinnoh" },
  { id: "sunyshore-city", name: "Sunyshore City", order: 56, region: "sinnoh" },
  { id: "route-223", name: "Route 223", order: 57, region: "sinnoh" },
  { id: "victory-road", name: "Victory Road", order: 58, region: "sinnoh" },
  { id: "pokemon-league", name: "Pokémon League", order: 59, region: "sinnoh" },
];
