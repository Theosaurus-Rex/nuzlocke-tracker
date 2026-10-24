import { describe, expect, test } from "vitest";

import { heartgold } from "@/game/data/heartgold";
import type { FightDef } from "@/game/types";

/** Independently sourced ace levels, not derived from our own data or generator. See
 * docs/notes/game-data.md for the sources and why. */
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

describe("heartgold level caps", () => {
  const capOf = (id: string): number | undefined => {
    const index = heartgold.levelCaps.findIndex(
      ({ until }) => "fight" in until && until.fight === id,
    );
    return heartgold.levelCaps[index]?.cap;
  };
  const gymIds = (region: string): string[] =>
    heartgold.fights.filter((f) => f.grantsBadge && f.region === region).map((f) => f.id);

  test("Johto gym caps are the verified aces in gym order, with Pryce held at Jasmine's 35", () => {
    const caps = heartgold.levelCaps.slice(0, 8).map((m) => m.cap);
    const aces = gymIds("johto").map((id) => VERIFIED_ACE_LEVELS[id]);
    expect(VERIFIED_ACE_LEVELS["gym-pryce"]).toBe(34);
    expect(caps).toEqual(aces.map((ace, i) => (i === 6 ? 35 : ace)));
  });

  test.each([
    "elite-four-will",
    "elite-four-koga",
    "elite-four-bruno",
    "elite-four-karen",
    "champion-lance",
  ])("%s caps at its verified ace", (id) => {
    expect(capOf(id)).toBe(VERIFIED_ACE_LEVELS[id]);
  });

  test("Kanto badge caps are the verified Kanto aces, lowest first", () => {
    const caps = heartgold.levelCaps
      .filter(({ until }) => "badges" in until && until.badges > 8)
      .map((m) => m.cap);
    const aces = gymIds("kanto").map((id) => VERIFIED_ACE_LEVELS[id] ?? 0);
    expect(caps).toEqual(aces.toSorted((a, b) => a - b));
  });

  test("Red caps at his top level", () => {
    const red = heartgold.fights.find((f) => f.id === "rival-red");
    expect(capOf("rival-red")).toBe(Math.max(...(red?.roster.map((m) => m.level) ?? [])));
  });
});

describe("heartgold badge sprites", () => {
  test("the 16 badge fights use the sprite numbers 1 to 16 once each", () => {
    const numbers = heartgold.fights
      .filter((f) => f.grantsBadge)
      .map((f) => f.badgeSprite)
      .toSorted((a, b) => (a ?? 0) - (b ?? 0));
    expect(numbers).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
  });

  test("fights without a badge have no sprite", () => {
    for (const f of heartgold.fights.filter((f) => !f.grantsBadge)) {
      expect(f.badgeSprite).toBeNull();
    }
  });
});

describe("heartgold shape", () => {
  test("the Johto routes come before the Kanto routes", () => {
    const regions = heartgold.routes.map((r) => r.region);
    const firstKanto = regions.indexOf("kanto");
    expect(firstKanto).toBeGreaterThan(0);
    expect(regions.slice(0, firstKanto).every((r) => r === "johto")).toBe(true);
    expect(regions.slice(firstKanto).every((r) => r === "kanto")).toBe(true);
  });

  test("has 16 gyms, 5 Elite Four and Champion fights, and 7 rival fights", () => {
    const count = (pred: (f: FightDef) => boolean): number => heartgold.fights.filter(pred).length;
    expect(count((f) => f.grantsBadge)).toBe(16);
    expect(count((f) => f.kind === "elite_four" || f.kind === "champion")).toBe(5);
    expect(count((f) => f.kind === "rival")).toBe(7);
  });
});
