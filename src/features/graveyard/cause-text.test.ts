import { describe, expect, test } from "vitest";

import type { Fight } from "@/domain/types";

import { causeText } from "./cause-text";

const TIMESTAMP = "2026-09-17T00:00:00.000Z";

const falkner: Fight = {
  id: "fight-1",
  runId: "run-1",
  gameFightId: null,
  name: "Falkner",
  kind: "gym",
  order: 1,
  grantsBadge: true,
  levelCap: 9,
  status: "pending",
  clearedAt: null,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
};

describe("causeText", () => {
  test("trainer with a fight that resolves uses the fight name", () => {
    const cause = {
      type: "trainer",
      fightId: "fight-1",
      trainerName: null,
      species: "pidgeotto",
      level: 9,
      move: "gust",
    } as const;
    expect(causeText(cause, [falkner])).toBe("Falkner's Pidgeotto — Gust");
  });

  test("the fight name wins over a stray trainerName", () => {
    const cause = {
      type: "trainer",
      fightId: "fight-1",
      trainerName: "Someone Else",
      species: "pidgeotto",
      level: 9,
      move: "gust",
    } as const;
    expect(causeText(cause, [falkner])).toBe("Falkner's Pidgeotto — Gust");
  });

  test("trainer with only a trainerName uses it", () => {
    const cause = {
      type: "trainer",
      fightId: null,
      trainerName: "Youngster Joey",
      species: "rattata",
      level: 4,
      move: "tackle",
    } as const;
    expect(causeText(cause, [falkner])).toBe("Youngster Joey's Rattata — Tackle");
  });

  test("trainer with an unresolved fight and no name drops the owner", () => {
    const cause = {
      type: "trainer",
      fightId: "gone",
      trainerName: null,
      species: "rattata",
      level: 4,
      move: "tackle",
    } as const;
    expect(causeText(cause, [falkner])).toBe("Rattata — Tackle");
  });

  test("wild is prefixed", () => {
    const cause = { type: "wild", species: "ariados", level: 12, move: "u-turn" } as const;
    expect(causeText(cause, [])).toBe("wild Ariados — U-turn");
  });

  test("status is title case", () => {
    expect(causeText({ type: "status", status: "poison" }, [])).toBe("Poison");
    expect(causeText({ type: "status", status: "perish-song" }, [])).toBe("Perish Song");
  });

  test("other is the detail as written", () => {
    expect(causeText({ type: "other", detail: "fell off a cliff" }, [])).toBe("fell off a cliff");
  });

  test("species display names apply", () => {
    const cause = { type: "wild", species: "mr-mime", level: 5, move: "tackle" } as const;
    expect(causeText(cause, [])).toBe("wild Mr. Mime — Tackle");
  });
});
