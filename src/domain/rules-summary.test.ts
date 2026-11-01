import { describe, expect, it } from "vitest";

import { DEFAULT_RULES } from "./rules";
import { currentLevelCap, currentLevelCaps, isOverCap, ruleChips } from "./rules-summary";
import type { Fight, LevelCapMilestone } from "./types";

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

const MILESTONES: LevelCapMilestone[] = [
  { cap: 10, until: { badges: 1 } },
  { cap: 20, until: { badges: 2 } },
  { cap: 15, until: { fight: "e4" } },
  { cap: 30, until: { badges: 3 } },
  { cap: 40, until: { fight: "champ" } },
];
const BADGE_IDS: ReadonlySet<string> = new Set(["g1", "g2", "g3"]);

function built(id: string, order: number, cleared = false, overrides: Partial<Fight> = {}): Fight {
  return fight({
    id,
    gameFightId: id,
    order,
    grantsBadge: BADGE_IDS.has(id),
    status: cleared ? "cleared" : "pending",
    levelCap: 99,
    ...overrides,
  });
}

function world(cleared: string[], extra: Fight[] = []): Fight[] {
  const ids = ["g1", "r1", "g2", "e4", "g3", "champ"];
  return [...ids.map((id, i) => built(id, (i + 1) * 100, cleared.includes(id))), ...extra];
}

function capOf(cleared: string[], extra: Fight[] = []): number | null {
  return currentLevelCap(world(cleared, extra), MILESTONES, BADGE_IDS);
}

describe("currentLevelCap", () => {
  it("starts at the first milestone", () => {
    expect(capOf([])).toBe(10);
  });

  it("goes up with badges held, whichever gyms they came from", () => {
    expect(capOf(["g3"])).toBe(20);
    expect(capOf(["g3", "g1"])).toBe(15);
  });

  it("ignores the stored cap on built-in fights", () => {
    const fights = world([]).map((f) => ({ ...f, levelCap: 3 }));
    expect(currentLevelCap(fights, MILESTONES, BADGE_IDS)).toBe(10);
  });

  it("ignores a low stored cap on a built-in fight that comes first", () => {
    const early = built("r0", 50, false, { kind: "rival", levelCap: 3 });
    expect(capOf([], [early])).toBe(10);
  });

  it("does not count a cleared rival as a badge", () => {
    expect(capOf(["r1"])).toBe(10);
  });

  it("does not count a cleared custom fight as a badge", () => {
    const custom = fight({ id: "c", order: 50, grantsBadge: true, status: "cleared" });
    expect(capOf([], [custom])).toBe(10);
  });

  it("advances through a fight milestone once that fight is cleared", () => {
    expect(capOf(["g1", "g2"])).toBe(15);
    expect(capOf(["g1", "g2", "e4"])).toBe(30);
  });

  it("is null after the last milestone", () => {
    expect(capOf(["g1", "g2", "g3", "e4", "champ"])).toBeNull();
  });

  it("is null with no milestones", () => {
    expect(currentLevelCap(world([]), [], BADGE_IDS)).toBeNull();
  });

  describe("custom fight overrides", () => {
    it("lowers the cap when it comes before the next badge fight", () => {
      const custom = fight({ id: "c", order: 50, levelCap: 7 });
      expect(capOf([], [custom])).toBe(7);
    });

    it("does nothing when it comes after the next badge fight", () => {
      const custom = fight({ id: "c", order: 150, levelCap: 7 });
      expect(capOf([], [custom])).toBe(10);
    });

    it("does nothing when its cap is higher than the table's", () => {
      const custom = fight({ id: "c", order: 50, levelCap: 12 });
      expect(capOf([], [custom])).toBe(10);
    });

    it("is anchored on the fight a fight milestone names", () => {
      const before = fight({ id: "c1", order: 350, levelCap: 9 });
      const after = fight({ id: "c2", order: 450, levelCap: 8 });
      expect(capOf(["g1", "g2"], [after])).toBe(15);
      expect(capOf(["g1", "g2"], [before])).toBe(9);
    });

    it("stops applying once cleared", () => {
      const custom = fight({ id: "c", order: 50, levelCap: 7, status: "cleared" });
      expect(capOf([], [custom])).toBe(10);
    });

    it("ignores a custom fight with no cap", () => {
      const custom = fight({ id: "c", order: 50, levelCap: null });
      expect(capOf([], [custom])).toBe(10);
    });
  });
});

describe("isOverCap", () => {
  it("is false below the cap", () => {
    expect(isOverCap(29, 30)).toBe(false);
  });

  it("is false exactly at the cap", () => {
    expect(isOverCap(30, 30)).toBe(false);
  });

  it("is true above the cap", () => {
    expect(isOverCap(31, 30)).toBe(true);
  });

  it("is false when there is no cap", () => {
    expect(isOverCap(100, null)).toBe(false);
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

  it("shows a chip for each gift rule when on", () => {
    expect(ruleChips({ ...ALL_OFF, giftClause: true }, null).map((c) => c.label)).toEqual([
      "Gift clause",
    ]);
    expect(ruleChips({ ...ALL_OFF, noGifts: true }, null).map((c) => c.label)).toEqual([
      "No gifts",
    ]);
  });

  it("shows Randomised from the randomiser switch", () => {
    const rules = { ...ALL_OFF, randomiser: { ...ALL_OFF.randomiser, enabled: true } };
    expect(ruleChips(rules, null).map((chip) => chip.label)).toEqual(["Randomised"]);
  });
});

describe("level cap paths", () => {
  const PATHED: LevelCapMilestone[] = [
    { cap: 20, until: { badges: 1 }, path: "Gyms" },
    { cap: 30, until: { badges: 2 }, path: "Gyms" },
    { cap: 25, until: { fight: "t1" }, path: "Titans" },
    { cap: 35, until: { fight: "t2" }, path: "Titans" },
    { cap: 40, until: { fight: "s1" }, path: "Star" },
    { cap: 50, until: { fight: "champ" } },
  ];
  const IDS = ["g1", "g2", "t1", "t2", "s1", "champ"];

  function caps(cleared: string[], extra: Fight[] = []) {
    const fights = [
      ...IDS.map((id, i) =>
        built(id, (i + 1) * 100, cleared.includes(id), { grantsBadge: id.startsWith("g") }),
      ),
      ...extra,
    ];
    return {
      all: currentLevelCaps(fights, PATHED, BADGE_IDS),
      top: currentLevelCap(fights, PATHED, BADGE_IDS),
    };
  }

  it("lists each path's first unmet cap in the order the paths first appear", () => {
    expect(caps([]).all).toEqual([
      { path: "Gyms", cap: 20 },
      { path: "Titans", cap: 25 },
      { path: "Star", cap: 40 },
    ]);
  });

  it("advances each path on its own", () => {
    expect(caps(["g1", "t1"]).all).toEqual([
      { path: "Gyms", cap: 30 },
      { path: "Titans", cap: 35 },
      { path: "Star", cap: 40 },
    ]);
  });

  it("drops a finished path from the list", () => {
    expect(caps(["s1"]).all.map(({ path }) => path)).toEqual(["Gyms", "Titans"]);
  });

  it("ignores the league while any path is unfinished", () => {
    const { all } = caps(["g1", "g2", "t1", "t2"]);
    expect(all).toEqual([{ path: "Star", cap: 40 }]);
  });

  it("falls through to the league once every path is done", () => {
    expect(caps(["g1", "g2", "t1", "t2", "s1"]).all).toEqual([{ path: null, cap: 50 }]);
    expect(caps(["g1", "g2", "t1", "t2", "s1", "champ"]).all).toEqual([]);
  });

  it("uses the highest path cap as the single cap", () => {
    expect(caps([]).top).toBe(40);
    expect(caps(["s1"]).top).toBe(25);
  });

  it("lowers a path cap for a custom fight that comes before its anchor", () => {
    const custom = fight({ id: "c", order: 150, levelCap: 22 });
    expect(caps([], [custom]).all).toEqual([
      { path: "Gyms", cap: 20 },
      { path: "Titans", cap: 22 },
      { path: "Star", cap: 22 },
    ]);
  });

  it("returns one unnamed cap for a game with no paths", () => {
    expect(currentLevelCaps(world([]), MILESTONES, BADGE_IDS)).toEqual([{ path: null, cap: 10 }]);
    expect(
      currentLevelCaps(world(["g1", "g2", "g3", "e4", "champ"]), MILESTONES, BADGE_IDS),
    ).toEqual([]);
  });
});
