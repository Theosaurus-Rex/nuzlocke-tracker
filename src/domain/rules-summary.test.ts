import { describe, expect, it } from "vitest";

import { DEFAULT_RULES } from "./rules";
import { currentLevelCap, ruleChips } from "./rules-summary";
import type { Fight } from "./types";

function fight(overrides: Partial<Fight>): Fight {
  return {
    id: "f",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    runId: "r",
    gameFightId: null,
    name: "Fight",
    kind: "gym",
    order: 1,
    grantsBadge: true,
    levelCap: 20,
    status: "pending",
    clearedAt: null,
    ...overrides,
  };
}

const ALL_OFF = {
  ...DEFAULT_RULES,
  dupesClause: false,
  shinyClause: false,
  nicknamesRequired: false,
  levelCaps: false,
  setMode: false,
  hardcore: false,
  randomiser: { ...DEFAULT_RULES.randomiser, enabled: false },
};

describe("currentLevelCap", () => {
  it("skips cleared fights", () => {
    const fights = [
      fight({ order: 1, levelCap: 14, status: "cleared" }),
      fight({ order: 2, levelCap: 18 }),
    ];
    expect(currentLevelCap(fights)).toBe(18);
  });

  it("skips fights with no cap", () => {
    const fights = [fight({ order: 1, levelCap: null }), fight({ order: 2, levelCap: 25 })];
    expect(currentLevelCap(fights)).toBe(25);
  });

  it("follows order, not array position", () => {
    const fights = [fight({ order: 3, levelCap: 30 }), fight({ order: 1, levelCap: 12 })];
    expect(currentLevelCap(fights)).toBe(12);
  });

  it("is null when every fight is cleared", () => {
    const fights = [fight({ order: 1, status: "cleared" }), fight({ order: 2, status: "cleared" })];
    expect(currentLevelCap(fights)).toBeNull();
  });

  it("is null with no fights", () => {
    expect(currentLevelCap([])).toBeNull();
  });
});

describe("ruleChips", () => {
  it("is empty when every rule is off", () => {
    expect(ruleChips(ALL_OFF, 30)).toEqual([]);
  });

  it("lists only the rules that are on, in order", () => {
    const rules = { ...ALL_OFF, hardcore: true, dupesClause: true, nicknamesRequired: true };
    expect(ruleChips(rules, null).map((chip) => chip.label)).toEqual([
      "Dupes",
      "Nicknames",
      "Hardcore",
    ]);
  });

  it("shows the cap in a flag chip", () => {
    expect(ruleChips({ ...ALL_OFF, levelCaps: true }, 30)).toEqual([
      { label: "Cap L30", tone: "flag" },
    ]);
  });

  it("drops the number when no cap is known", () => {
    expect(ruleChips({ ...ALL_OFF, levelCaps: true }, null)).toEqual([
      { label: "Caps", tone: "flag" },
    ]);
  });

  it("shows Randomised from the randomiser switch", () => {
    const rules = { ...ALL_OFF, randomiser: { ...ALL_OFF.randomiser, enabled: true } };
    expect(ruleChips(rules, null).map((chip) => chip.label)).toEqual(["Randomised"]);
  });
});
