/**
 * Emerald route order in traversal order, then the four post-game areas after Victory Road.
 * Bootstrapped from domtronn/nuzlocke.data (routes/em.txt). Hand-owned now: edit directly, per
 * CLAUDE.md "Game data". Littleroot Town, Artisan Cave and the event-ticket islands are left out.
 */

import type { RouteDef } from "@/game/types";

export const routes: RouteDef[] = [
  { id: "starter", name: "Starter", order: 1, region: "hoenn" },
  { id: "route-101", name: "Route 101", order: 2, region: "hoenn" },
  { id: "route-103", name: "Route 103", order: 3, region: "hoenn" },
  { id: "route-102", name: "Route 102", order: 4, region: "hoenn" },
  { id: "petalburg-city", name: "Petalburg City", order: 5, region: "hoenn" },
  { id: "route-104", name: "Route 104", order: 6, region: "hoenn" },
  { id: "petalburg-woods", name: "Petalburg Woods", order: 7, region: "hoenn" },
  { id: "rustboro-city", name: "Rustboro City", order: 8, region: "hoenn" },
  { id: "route-105", name: "Route 105", order: 9, region: "hoenn" },
  { id: "route-116", name: "Route 116", order: 10, region: "hoenn" },
  { id: "rusturf-tunnel", name: "Rusturf Tunnel", order: 11, region: "hoenn" },
  { id: "dewford-town", name: "Dewford Town", order: 12, region: "hoenn" },
  { id: "route-106", name: "Route 106", order: 13, region: "hoenn" },
  { id: "granite-cave", name: "Granite Cave", order: 14, region: "hoenn" },
  { id: "route-107", name: "Route 107", order: 15, region: "hoenn" },
  { id: "slateport-city", name: "Slateport City", order: 16, region: "hoenn" },
  { id: "route-110", name: "Route 110", order: 17, region: "hoenn" },
  { id: "route-117", name: "Route 117", order: 18, region: "hoenn" },
  { id: "route-112", name: "Route 112", order: 19, region: "hoenn" },
  { id: "route-113", name: "Route 113", order: 20, region: "hoenn" },
  { id: "route-114", name: "Route 114", order: 21, region: "hoenn" },
  { id: "meteor-falls", name: "Meteor Falls", order: 22, region: "hoenn" },
  { id: "route-115", name: "Route 115", order: 23, region: "hoenn" },
  { id: "jagged-pass", name: "Jagged Pass", order: 24, region: "hoenn" },
  { id: "lavaridge-town", name: "Lavaridge Town", order: 25, region: "hoenn" },
  { id: "fiery-path", name: "Fiery Path", order: 26, region: "hoenn" },
  { id: "route-111", name: "Route 111", order: 27, region: "hoenn" },
  { id: "mirage-tower", name: "Mirage Tower", order: 28, region: "hoenn" },
  { id: "new-mauville", name: "New Mauville", order: 29, region: "hoenn" },
  { id: "route-118", name: "Route 118", order: 30, region: "hoenn" },
  { id: "route-119", name: "Route 119", order: 31, region: "hoenn" },
  { id: "fortree-city", name: "Fortree City", order: 32, region: "hoenn" },
  { id: "route-120", name: "Route 120", order: 33, region: "hoenn" },
  { id: "route-121", name: "Route 121", order: 34, region: "hoenn" },
  { id: "safari-zone", name: "Safari Zone", order: 35, region: "hoenn" },
  { id: "route-122", name: "Route 122", order: 36, region: "hoenn" },
  { id: "mt-pyre", name: "Mt. Pyre", order: 37, region: "hoenn" },
  { id: "route-123", name: "Route 123", order: 38, region: "hoenn" },
  // Upstream names it Team Magma Hideout and puts Electrode here. The Electrode is in the Aqua Hideout.
  { id: "magma-hideout", name: "Magma Hideout", order: 39, region: "hoenn" },
  { id: "lilycove-city", name: "Lilycove City", order: 40, region: "hoenn" },
  // Not in upstream as a route. Added for the static Electrode.
  { id: "aqua-hideout", name: "Aqua Hideout", order: 41, region: "hoenn" },
  { id: "route-124", name: "Route 124", order: 42, region: "hoenn" },
  { id: "mossdeep-city", name: "Mossdeep City", order: 43, region: "hoenn" },
  { id: "route-125", name: "Route 125", order: 44, region: "hoenn" },
  { id: "shoal-cave", name: "Shoal Cave", order: 45, region: "hoenn" },
  { id: "route-127", name: "Route 127", order: 46, region: "hoenn" },
  { id: "route-128", name: "Route 128", order: 47, region: "hoenn" },
  { id: "seafloor-cavern", name: "Seafloor Cavern", order: 48, region: "hoenn" },
  { id: "route-126", name: "Route 126", order: 49, region: "hoenn" },
  { id: "sootopolis-city", name: "Sootopolis City", order: 50, region: "hoenn" },
  // Upstream lists Kyogre and Groudon here. In Emerald they are in Marine Cave and Terra Cave.
  { id: "cave-of-origin", name: "Cave of Origin", order: 51, region: "hoenn" },
  { id: "route-129", name: "Route 129", order: 52, region: "hoenn" },
  { id: "route-130", name: "Route 130", order: 53, region: "hoenn" },
  { id: "route-131", name: "Route 131", order: 54, region: "hoenn" },
  { id: "sky-pillar", name: "Sky Pillar", order: 55, region: "hoenn" },
  { id: "pacifidlog-town", name: "Pacifidlog Town", order: 56, region: "hoenn" },
  { id: "mirage-island", name: "Mirage Island", order: 57, region: "hoenn" },
  { id: "route-108", name: "Route 108", order: 58, region: "hoenn" },
  { id: "abandoned-ship", name: "Abandoned Ship", order: 59, region: "hoenn" },
  { id: "route-109", name: "Route 109", order: 60, region: "hoenn" },
  { id: "route-132", name: "Route 132", order: 61, region: "hoenn" },
  { id: "route-133", name: "Route 133", order: 62, region: "hoenn" },
  { id: "route-134", name: "Route 134", order: 63, region: "hoenn" },
  { id: "ever-grande-city", name: "Ever Grande City", order: 64, region: "hoenn" },
  { id: "victory-road", name: "Victory Road", order: 65, region: "hoenn" },
  // Post-game routes follow. Upstream puts Desert Underpass and Altering Cave mid-game, but both open after the Elite Four.
  { id: "desert-underpass", name: "Desert Underpass", order: 66, region: "hoenn" },
  // Upstream's Altering Cave encounters are FireRed's. Emerald has Zubat only.
  { id: "altering-cave", name: "Altering Cave", order: 67, region: "hoenn" },
  // Not in upstream. Groudon, level 70.
  { id: "terra-cave", name: "Terra Cave", order: 68, region: "hoenn" },
  // Not in upstream. Kyogre, level 70.
  { id: "marine-cave", name: "Marine Cave", order: 69, region: "hoenn" },
];
