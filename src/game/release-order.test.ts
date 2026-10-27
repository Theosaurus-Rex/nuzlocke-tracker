import { describe, expect, it } from "vitest";

import type { GameData } from "@/game/types";

import { findGameByName, gamesInReleaseOrder, searchGames, sortByRelease } from "./release-order";

const ids = (games: GameData[]): string[] => games.map((game) => game.id);

describe("release order", () => {
  it("lists games by release date, pairs in registry order", () => {
    expect(ids(gamesInReleaseOrder())).toEqual([
      "red",
      "blue",
      "yellow",
      "ruby",
      "sapphire",
      "firered",
      "leafgreen",
      "emerald",
      "diamond",
      "pearl",
      "platinum",
      "heartgold",
      "soulsilver",
      "black",
      "white",
      "black2",
      "white2",
      "x",
      "y",
      "omegaruby",
      "alphasapphire",
    ]);
  });

  it("keeps input order for games released on the same day", () => {
    const [a, b, c] = gamesInReleaseOrder();
    if (!a || !b || !c) throw new Error("Expected games");
    const sameDay = [c, { ...b, released: c.released }, { ...a, released: c.released }];
    expect(ids(sortByRelease(sameDay))).toEqual([c.id, b.id, a.id]);
  });
});

describe("game search", () => {
  it("matches any word, with prefix matches first", () => {
    expect(ids(searchGames("silver"))).toEqual(["soulsilver"]);
    expect(ids(searchGames("green"))).toEqual(["leafgreen"]);
    expect(ids(searchGames("e"))).toEqual([
      "emerald",
      "red",
      "blue",
      "yellow",
      "sapphire",
      "firered",
      "leafgreen",
      "pearl",
      "heartgold",
      "soulsilver",
      "white",
      "white2",
      "omegaruby",
      "alphasapphire",
    ]);
  });

  it("finds a game by exact name and nothing else", () => {
    expect(findGameByName("  heartgold ")?.id).toBe("heartgold");
    expect(findGameByName("heart")).toBeUndefined();
  });
});
