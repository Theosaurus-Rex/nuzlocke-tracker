import { describe, expect, test } from "vitest";

import { heartgold } from "@/game/data/heartgold";
import { GAMES } from "@/game/registry";
import type { FightDef } from "@/game/types";

describe("heartgold routes", () => {
  test("orders are unique and contiguous starting at 1", () => {
    const orders = heartgold.routes.map((r) => r.order).toSorted((a, b) => a - b);
    expect(new Set(orders).size).toBe(orders.length);
    expect(orders).toEqual(Array.from({ length: orders.length }, (_, i) => i + 1));
  });

  test("routes are already in traversal order, with the Johto block preceding Kanto", () => {
    const byOrder = [...heartgold.routes].toSorted((a, b) => a.order - b.order);
    expect(byOrder).toEqual(heartgold.routes);

    const firstKantoIndex = byOrder.findIndex((r) => r.region === "kanto");
    expect(firstKantoIndex).toBeGreaterThan(0);
    expect(byOrder.slice(0, firstKantoIndex).every((r) => r.region === "johto")).toBe(true);
    expect(byOrder.slice(firstKantoIndex).every((r) => r.region === "kanto")).toBe(true);
  });
});

describe("heartgold fights", () => {
  test("orders are unique", () => {
    const orders = heartgold.fights.map((f) => f.order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  test("no fight has an empty roster", () => {
    for (const fight of heartgold.fights) {
      expect(fight.roster.length).toBeGreaterThan(0);
    }
  });

  test("every badge-granting fight has a levelCap equal to its ace's level", () => {
    const badgeFights = heartgold.fights.filter((f) => f.grantsBadge);
    expect(badgeFights.length).toBe(16); // 8 Johto + 8 Kanto gyms
    for (const fight of badgeFights) {
      const ace = Math.max(...fight.roster.map((m) => m.level));
      expect(fight.levelCap).toBe(ace);
    }
  });

  test("Elite Four and Champion fights derive a levelCap too, despite granting no badge", () => {
    const capped = heartgold.fights.filter((f) => f.kind === "elite_four" || f.kind === "champion");
    expect(capped.length).toBe(5); // Will, Koga, Bruno, Karen, Lance
    for (const fight of capped) {
      expect(fight.grantsBadge).toBe(false);
      const ace = Math.max(...fight.roster.map((m) => m.level));
      expect(fight.levelCap).toBe(ace);
    }
  });

  test("every rival fight has no level cap and grants no badge", () => {
    const rivalFights = heartgold.fights.filter((f) => f.kind === "rival");
    expect(rivalFights.length).toBe(7); // Silver x6 + Red
    for (const fight of rivalFights) {
      expect(fight.levelCap).toBeNull();
      expect(fight.grantsBadge).toBe(false);
    }
  });
});

describe("GAMES registry", () => {
  test("resolves heartgold under its own id", () => {
    expect(GAMES.heartgold.id).toBe("heartgold");
    expect(GAMES.heartgold).toBe(heartgold);
  });
});

/**
 * Independently verified ace (highest-level) Pokémon for each gym leader, Elite Four member and
 * the Champion, from the first encounter. The post-Elite-Four rematch rosters are much higher
 * level, so using those would inflate every cap.
 *
 * Cross-checked against:
 *   - https://bulbapedia.bulbagarden.net/wiki/<Leader_name> ("Pokémon HeartGold and SoulSilver"
 *     gym/Elite Four battle section)
 *   - https://www.serebii.net/heartgoldsoulsilver/gym.shtml
 *
 * Independent of both nuzlocke.data and scripts/extract-heartgold.ts, so a bad extraction, or
 * a bad upstream value, fails here even if the generator's arithmetic is right.
 */
const VERIFIED_ACE_LEVELS: Record<string, number> = {
  "gym-falkner": 13,
  "gym-bugsy": 17,
  "gym-whitney": 19,
  "gym-morty": 25,
  "gym-chuck": 31,
  "gym-jasmine": 35,
  "gym-pryce": 34,
  "gym-clair": 41,
  "gym-lt-surge": 53,
  "gym-sabrina": 55,
  "gym-erika": 56,
  "gym-janine": 50,
  "gym-misty": 54,
  "gym-brock": 54,
  "gym-blaine": 59,
  "gym-blue": 60,
  "elite-four-will": 42,
  "elite-four-koga": 44,
  "elite-four-bruno": 46,
  "elite-four-karen": 47,
  "champion-lance": 50,
};

describe("heartgold spot-check: independently verified ace levels", () => {
  const byId = new Map<string, FightDef>(heartgold.fights.map((f) => [f.id, f]));

  test.each(Object.entries(VERIFIED_ACE_LEVELS))("%s has ace level %i", (id, expectedAce) => {
    const fight = byId.get(id);
    expect(fight).toBeDefined();
    // Recomputed from the roster itself, not read off `levelCap`, so a bad roster level is
    // caught even if `levelCap` still agrees with it.
    const ace = Math.max(...(fight?.roster.map((m) => m.level) ?? []));
    expect(ace).toBe(expectedAce);
  });
});
