/**
 * Assembles the Omega Ruby GameData from routes.ts, fights.ts and level-caps.ts. Alpha Sapphire
 * shares everything but the eight villain fights and the hideout's name.
 */

import type { GameData } from "@/game/types";

import { alphaSapphireFights, omegaRubyFights } from "./fights";
import { levelCaps } from "./level-caps";
import { alphaSapphireRoutes, routes } from "./routes";

export const omegaRuby: GameData = {
  id: "omegaruby",
  name: "Omega Ruby",
  generation: 6,
  // Worldwide release, per Bulbapedia's Pokémon Omega Ruby and Alpha Sapphire page.
  released: "2014-11-21",
  routes,
  fights: omegaRubyFights,
  levelCaps,
};

export const alphaSapphire: GameData = {
  ...omegaRuby,
  id: "alphasapphire",
  name: "Alpha Sapphire",
  routes: alphaSapphireRoutes,
  fights: alphaSapphireFights,
};
