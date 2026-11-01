/**
 * Scarlet and Violet route order, shared by both versions. Paldea has no numbered routes, so
 * places follow Bulbapedia's walkthrough, which is a suggested order. Bootstrapped from
 * domtronn/nuzlocke.data, then hand-owned: edit directly, per CLAUDE.md "Game data". Koraidon
 * and Miraidon, the DLC and everything after the credits are left out.
 */

import type { RouteDef } from "@/game/types";

export const routes: RouteDef[] = [
  { id: "starter", name: "Starter", order: 1, region: "paldea" },
  { id: "poco-path", name: "Poco Path", order: 2, region: "paldea" },
  { id: "inlet-grotto", name: "Inlet Grotto", order: 3, region: "paldea" },
  { id: "south-province-area-one", name: "South Province (Area One)", order: 4, region: "paldea" },
  { id: "cabo-poco", name: "Cabo Poco", order: 5, region: "paldea" },
  { id: "south-province-area-two", name: "South Province (Area Two)", order: 6, region: "paldea" },
  { id: "cortondo", name: "Cortondo", order: 7, region: "paldea", only: "gift" },
  {
    id: "south-province-area-three",
    name: "South Province (Area Three)",
    order: 8,
    region: "paldea",
  },
  { id: "east-province-area-one", name: "East Province (Area One)", order: 9, region: "paldea" },
  {
    id: "south-province-area-four",
    name: "South Province (Area Four)",
    order: 10,
    region: "paldea",
  },
  {
    id: "south-province-area-five",
    name: "South Province (Area Five)",
    order: 11,
    region: "paldea",
  },
  { id: "west-province-area-one", name: "West Province (Area One)", order: 12, region: "paldea" },
  { id: "levincia", name: "Levincia", order: 13, region: "paldea", only: "gift" },
  { id: "east-province-area-two", name: "East Province (Area Two)", order: 14, region: "paldea" },
  {
    id: "east-province-area-three",
    name: "East Province (Area Three)",
    order: 15,
    region: "paldea",
  },
  { id: "cascarrafa", name: "Cascarrafa", order: 16, region: "paldea", only: "gift" },
  { id: "asado-desert", name: "Asado Desert", order: 17, region: "paldea" },
  { id: "tagtree-thicket", name: "Tagtree Thicket", order: 18, region: "paldea" },
  { id: "dalizapa-passage", name: "Dalizapa Passage", order: 19, region: "paldea" },
  {
    id: "west-province-area-three",
    name: "West Province (Area Three)",
    order: 20,
    region: "paldea",
  },
  { id: "glaseado-mountain", name: "Glaseado Mountain", order: 21, region: "paldea" },
  { id: "west-province-area-two", name: "West Province (Area Two)", order: 22, region: "paldea" },
  { id: "colonnade-hollow", name: "Colonnade Hollow", order: 23, region: "paldea" },
  { id: "south-province-area-six", name: "South Province (Area Six)", order: 24, region: "paldea" },
  { id: "alfornada-cavern", name: "Alfornada Cavern", order: 25, region: "paldea" },
  {
    id: "naranja-uva-academy",
    name: "Naranja / Uva Academy",
    order: 26,
    region: "paldea",
    only: "gift",
  },
  {
    id: "north-province-area-three",
    name: "North Province (Area Three)",
    order: 27,
    region: "paldea",
  },
  { id: "casseroya-lake", name: "Casseroya Lake", order: 28, region: "paldea" },
  { id: "socarrat-trail", name: "Socarrat Trail", order: 29, region: "paldea" },
  { id: "north-province-area-one", name: "North Province (Area One)", order: 30, region: "paldea" },
  { id: "north-province-area-two", name: "North Province (Area Two)", order: 31, region: "paldea" },
  { id: "west-paldean-sea", name: "West Paldean Sea", order: 32, region: "paldea" },
  { id: "south-paldean-sea", name: "South Paldean Sea", order: 33, region: "paldea" },
  { id: "east-paldean-sea", name: "East Paldean Sea", order: 34, region: "paldea" },
  { id: "north-paldean-sea", name: "North Paldean Sea", order: 35, region: "paldea" },
  { id: "pokemon-league", name: "Pokémon League", order: 36, region: "paldea" },
  { id: "area-zero", name: "Area Zero", order: 37, region: "paldea" },
];
