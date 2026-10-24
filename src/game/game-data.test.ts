import { describe, expect, test } from "vitest";

import { GAMES } from "@/game/registry";

describe.each(Object.values(GAMES))("$id game data", (game) => {
  test("registry key matches the game's own id", () => {
    expect(GAMES[game.id]).toBe(game);
  });

  test("route orders are unique and contiguous from 1", () => {
    const orders = game.routes.map((r) => r.order).toSorted((a, b) => a - b);
    expect(orders).toEqual(Array.from({ length: orders.length }, (_, i) => i + 1));
  });

  test("routes are listed in traversal order", () => {
    expect(game.routes.map((r) => r.order)).toEqual(game.routes.map((_, i) => i + 1));
  });

  test("route and fight ids are unique", () => {
    expect(new Set(game.routes.map((r) => r.id)).size).toBe(game.routes.length);
    expect(new Set(game.fights.map((f) => f.id)).size).toBe(game.fights.length);
  });

  test("fight orders are unique", () => {
    const orders = game.fights.map((f) => f.order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  test("no fight has an empty roster", () => {
    for (const fight of game.fights) {
      expect(fight.roster.length).toBeGreaterThan(0);
    }
  });

  test("level caps equal the ace for badge, Elite Four and Champion fights, and are null for the rest", () => {
    for (const fight of game.fights) {
      const ace = Math.max(...fight.roster.map((m) => m.level));
      const capped = fight.grantsBadge || fight.kind === "elite_four" || fight.kind === "champion";
      expect(fight.levelCap, fight.id).toBe(capped ? ace : null);
    }
  });

  test("a fight has a badge sprite only if it grants a badge", () => {
    for (const fight of game.fights) {
      expect(fight.badgeSprite !== null, fight.id).toBe(fight.grantsBadge);
      expect(fight.badge !== null, fight.id).toBe(fight.grantsBadge);
    }
  });
});
