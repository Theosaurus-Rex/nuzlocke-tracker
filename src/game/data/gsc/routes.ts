/**
 * Gold, Silver and Crystal route order in traversal order. Bootstrapped from domtronn/nuzlocke.data
 * (routes/gold.txt, routes/silv.txt, routes/crys.txt) and checked against pret/pokegold at commit
 * fc702b6d922aecce274782d68bba8639936a1182 and pret/pokecrystal at commit
 * 5c877ef55197039c9676e8e3eec6d254b1c40fe8. Hand-owned now: edit directly, per CLAUDE.md "Game
 * data". Mahogany Town is left out, since its Headbutt table is a leftover on a map with no trees.
 * The two ports are folded into Olivine City and Vermilion City.
 */

import type { RouteDef } from "@/game/types";

export const routes: RouteDef[] = [
  { id: "starter", name: "Starter", order: 1, region: "johto" },
  { id: "new-bark-town", name: "New Bark Town", order: 2, region: "johto" },
  { id: "route-29", name: "Route 29", order: 3, region: "johto" },
  { id: "route-46", name: "Route 46", order: 4, region: "johto" },
  { id: "cherrygrove-city", name: "Cherrygrove City", order: 5, region: "johto" },
  { id: "route-30", name: "Route 30", order: 6, region: "johto" },
  { id: "route-31", name: "Route 31", order: 7, region: "johto" },
  { id: "dark-cave", name: "Dark Cave", order: 8, region: "johto" },
  { id: "violet-city", name: "Violet City", order: 9, region: "johto" },
  { id: "sprout-tower", name: "Sprout Tower", order: 10, region: "johto" },
  { id: "route-32", name: "Route 32", order: 11, region: "johto" },
  { id: "ruins-of-alph", name: "Ruins of Alph", order: 12, region: "johto" },
  { id: "union-cave", name: "Union Cave", order: 13, region: "johto" },
  { id: "route-33", name: "Route 33", order: 14, region: "johto" },
  { id: "azalea-town", name: "Azalea Town", order: 15, region: "johto" },
  { id: "slowpoke-well", name: "Slowpoke Well", order: 16, region: "johto" },
  { id: "ilex-forest", name: "Ilex Forest", order: 17, region: "johto" },
  { id: "route-34", name: "Route 34", order: 18, region: "johto" },
  { id: "goldenrod-city", name: "Goldenrod City", order: 19, region: "johto", only: "gift" },
  { id: "route-35", name: "Route 35", order: 20, region: "johto" },
  { id: "national-park", name: "National Park", order: 21, region: "johto" },
  { id: "route-36", name: "Route 36", order: 22, region: "johto" },
  { id: "route-37", name: "Route 37", order: 23, region: "johto" },
  { id: "ecruteak-city", name: "Ecruteak City", order: 24, region: "johto" },
  { id: "burned-tower", name: "Burned Tower", order: 25, region: "johto" },
  { id: "route-38", name: "Route 38", order: 26, region: "johto" },
  { id: "route-39", name: "Route 39", order: 27, region: "johto" },
  { id: "olivine-city", name: "Olivine City", order: 28, region: "johto" },
  { id: "route-40", name: "Route 40", order: 29, region: "johto" },
  { id: "route-41", name: "Route 41", order: 30, region: "johto" },
  { id: "whirl-islands", name: "Whirl Islands", order: 31, region: "johto" },
  { id: "cianwood-city", name: "Cianwood City", order: 32, region: "johto" },
  { id: "route-42", name: "Route 42", order: 33, region: "johto" },
  { id: "mt-mortar", name: "Mt. Mortar", order: 34, region: "johto" },
  { id: "rocket-hideout", name: "Rocket Hideout", order: 35, region: "johto", only: "static" },
  { id: "lake-of-rage", name: "Lake of Rage", order: 36, region: "johto" },
  { id: "tin-tower", name: "Tin Tower", order: 37, region: "johto" },
  { id: "route-43", name: "Route 43", order: 38, region: "johto" },
  { id: "route-44", name: "Route 44", order: 39, region: "johto" },
  { id: "ice-path", name: "Ice Path", order: 40, region: "johto" },
  { id: "blackthorn-city", name: "Blackthorn City", order: 41, region: "johto" },
  { id: "dragons-den", name: "Dragon's Den", order: 42, region: "johto" },
  { id: "route-45", name: "Route 45", order: 43, region: "johto" },
  { id: "route-27", name: "Route 27", order: 44, region: "johto" },
  { id: "tohjo-falls", name: "Tohjo Falls", order: 45, region: "johto" },
  { id: "route-26", name: "Route 26", order: 46, region: "johto" },
  { id: "victory-road", name: "Victory Road", order: 47, region: "johto" },
  { id: "vermilion-city", name: "Vermilion City", order: 48, region: "kanto" },
  { id: "route-6", name: "Route 6", order: 49, region: "kanto" },
  { id: "route-7", name: "Route 7", order: 50, region: "kanto" },
  { id: "celadon-city", name: "Celadon City", order: 51, region: "kanto" },
  { id: "route-16", name: "Route 16", order: 52, region: "kanto" },
  { id: "route-17", name: "Route 17", order: 53, region: "kanto" },
  { id: "route-18", name: "Route 18", order: 54, region: "kanto" },
  { id: "fuchsia-city", name: "Fuchsia City", order: 55, region: "kanto" },
  { id: "route-15", name: "Route 15", order: 56, region: "kanto" },
  { id: "route-14", name: "Route 14", order: 57, region: "kanto" },
  { id: "route-13", name: "Route 13", order: 58, region: "kanto" },
  { id: "route-12", name: "Route 12", order: 59, region: "kanto" },
  { id: "route-8", name: "Route 8", order: 60, region: "kanto" },
  { id: "route-9", name: "Route 9", order: 61, region: "kanto" },
  { id: "route-10", name: "Route 10", order: 62, region: "kanto" },
  { id: "route-5", name: "Route 5", order: 63, region: "kanto" },
  { id: "route-24", name: "Route 24", order: 64, region: "kanto" },
  { id: "route-25", name: "Route 25", order: 65, region: "kanto" },
  { id: "cerulean-city", name: "Cerulean City", order: 66, region: "kanto" },
  { id: "rock-tunnel", name: "Rock Tunnel", order: 67, region: "kanto" },
  { id: "route-4", name: "Route 4", order: 68, region: "kanto" },
  { id: "route-11", name: "Route 11", order: 69, region: "kanto" },
  { id: "digletts-cave", name: "Diglett's Cave", order: 70, region: "kanto" },
  { id: "pewter-city", name: "Pewter City", order: 71, region: "kanto", only: "gift" },
  { id: "route-3", name: "Route 3", order: 72, region: "kanto" },
  { id: "mt-moon", name: "Mt. Moon", order: 73, region: "kanto" },
  { id: "route-2", name: "Route 2", order: 74, region: "kanto" },
  { id: "viridian-city", name: "Viridian City", order: 75, region: "kanto" },
  { id: "route-1", name: "Route 1", order: 76, region: "kanto" },
  { id: "pallet-town", name: "Pallet Town", order: 77, region: "kanto" },
  { id: "route-21", name: "Route 21", order: 78, region: "kanto" },
  { id: "cinnabar-island", name: "Cinnabar Island", order: 79, region: "kanto" },
  { id: "route-20", name: "Route 20", order: 80, region: "kanto" },
  { id: "route-19", name: "Route 19", order: 81, region: "kanto" },
  { id: "route-22", name: "Route 22", order: 82, region: "kanto" },
  { id: "route-28", name: "Route 28", order: 83, region: "kanto" },
  { id: "mt-silver", name: "Mt. Silver", order: 84, region: "kanto" },
];

const POWER_PLANT_AFTER = "route-10";

// Crystal adds the Magneton trade at the Power Plant.
export const crystalRoutes: RouteDef[] = routes
  .flatMap((route): RouteDef[] =>
    route.id === POWER_PLANT_AFTER
      ? [route, { id: "power-plant", name: "Power Plant", order: 0, region: "kanto", only: "gift" }]
      : [route],
  )
  .map((route, index) => ({ ...route, order: index + 1 }));
