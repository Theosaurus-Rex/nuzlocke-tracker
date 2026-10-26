import { describe, expect, test } from "vitest";

import { GAMES } from "@/game/registry";

describe.each(Object.values(GAMES))("$id game data", (game) => {
  test("only is gift or static when present", () => {
    for (const route of game.routes) {
      expect([undefined, "gift", "static"]).toContain(route.only);
    }
  });

  test("the starter route is never tagged, since it is a mandatory encounter", () => {
    expect(game.routes.find((r) => r.id === "starter")?.only).toBeUndefined();
  });

  test("released is a valid ISO date", () => {
    expect(game.released).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(game.released).toISOString().slice(0, 10)).toBe(game.released);
  });

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

  test("level cap milestones name real fights", () => {
    const ids = new Set(game.fights.map((f) => f.id));
    for (const { until } of game.levelCaps) {
      if ("fight" in until) expect(ids.has(until.fight), until.fight).toBe(true);
    }
  });

  test("level cap badge milestones strictly increase and fit the game's badge count", () => {
    const badgeCount = game.fights.filter((f) => f.grantsBadge).length;
    const counts = game.levelCaps.flatMap(({ until }) => ("badges" in until ? [until.badges] : []));
    expect(counts.length).toBeGreaterThan(0);
    counts.forEach((n, i) => {
      expect(Number.isInteger(n) && n >= 1 && n <= badgeCount, `badges ${String(n)}`).toBe(true);
      if (i > 0) expect(n).toBeGreaterThan(counts[i - 1] ?? Infinity);
    });
  });

  test("level caps never decrease from one milestone to the next", () => {
    game.levelCaps.forEach(({ cap }, i) => {
      if (i > 0) expect(cap).toBeGreaterThanOrEqual(game.levelCaps[i - 1]?.cap ?? 0);
    });
  });

  test("level caps are positive integers", () => {
    for (const { cap } of game.levelCaps) {
      expect(Number.isInteger(cap) && cap > 0, String(cap)).toBe(true);
    }
  });

  test("a fight has a badge sprite only if it grants a badge", () => {
    for (const fight of game.fights) {
      expect(fight.badgeSprite !== null, fight.id).toBe(fight.grantsBadge);
      expect(fight.badge !== null, fight.id).toBe(fight.grantsBadge);
    }
  });
});
