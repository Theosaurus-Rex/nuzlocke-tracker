import { toNameForm } from "@/game/pokeapi/resolve";
import { GAMES } from "@/game/registry";
import type { GameData } from "@/game/types";

/** Ties keep their input order, so paired versions stay in registry order. */
export function sortByRelease(games: readonly GameData[]): GameData[] {
  return games.toSorted((a, b) => a.released.localeCompare(b.released));
}

export function gamesInReleaseOrder(): GameData[] {
  return sortByRelease(Object.values(GAMES));
}

/** Names that start with the query come first, then names containing it. */
export function searchGames(query: string): GameData[] {
  const q = toNameForm(query);
  const ordered = gamesInReleaseOrder();
  const nameOf = (game: GameData): string => toNameForm(game.name);
  return [
    ...ordered.filter((game) => nameOf(game).startsWith(q)),
    ...ordered.filter((game) => !nameOf(game).startsWith(q) && nameOf(game).includes(q)),
  ];
}

export function findGameByName(text: string): GameData | undefined {
  const q = toNameForm(text);
  return Object.values(GAMES).find((game) => toNameForm(game.name) === q);
}
