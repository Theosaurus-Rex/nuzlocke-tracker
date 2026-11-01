import type { Fight, LevelCapMilestone, Rules } from "./types";

export interface RuleChip {
  label: string;
  tone: "neutral" | "flag";
}

export interface PathCap {
  path: string | null;
  cap: number;
}

export function currentLevelCaps(
  fights: readonly Fight[],
  milestones: readonly LevelCapMilestone[],
  badgeFightIds: ReadonlySet<string>,
): PathCap[] {
  const builtIn = new Map<string, Fight>();
  for (const fight of fights) {
    if (fight.gameFightId !== null) builtIn.set(fight.gameFightId, fight);
  }
  const badges = [...builtIn.values()].filter(
    (fight) => fight.status === "cleared" && badgeFightIds.has(fight.gameFightId ?? ""),
  ).length;

  const unmet = ({ until }: LevelCapMilestone): boolean =>
    "badges" in until ? badges < until.badges : builtIn.get(until.fight)?.status === "pending";

  const nextBadgeOrder = Math.min(
    ...[...builtIn.values()]
      .filter((fight) => fight.status !== "cleared" && badgeFightIds.has(fight.gameFightId ?? ""))
      .map((fight) => fight.order),
  );
  const capFor = (milestone: LevelCapMilestone): number => {
    const anchorOrder =
      "fight" in milestone.until
        ? (builtIn.get(milestone.until.fight)?.order ?? Infinity)
        : nextBadgeOrder;
    const overrides = fights
      .filter(
        (fight) =>
          fight.gameFightId === null &&
          fight.status !== "cleared" &&
          fight.levelCap !== null &&
          fight.order < anchorOrder,
      )
      .map((fight) => fight.levelCap ?? Infinity);
    return Math.min(milestone.cap, ...overrides);
  };

  const firstUnmet = new Map<string, LevelCapMilestone | undefined>();
  for (const milestone of milestones) {
    if (milestone.path === undefined) continue;
    if (!firstUnmet.has(milestone.path)) firstUnmet.set(milestone.path, undefined);
    if (firstUnmet.get(milestone.path) === undefined && unmet(milestone)) {
      firstUnmet.set(milestone.path, milestone);
    }
  }
  const pathCaps = [...firstUnmet].flatMap(([path, milestone]) =>
    milestone === undefined ? [] : [{ path, cap: capFor(milestone) }],
  );
  if (pathCaps.length > 0) return pathCaps;

  const league = milestones.find((milestone) => milestone.path === undefined && unmet(milestone));
  return league === undefined ? [] : [{ path: null, cap: capFor(league) }];
}

export function currentLevelCap(
  fights: readonly Fight[],
  milestones: readonly LevelCapMilestone[],
  badgeFightIds: ReadonlySet<string>,
): number | null {
  const caps = currentLevelCaps(fights, milestones, badgeFightIds);
  return caps.length === 0 ? null : Math.max(...caps.map(({ cap }) => cap));
}

export function isOverCap(level: number, cap: number | null): boolean {
  return cap !== null && level > cap;
}

export function ruleChips(rules: Rules, levelCap: number | null): RuleChip[] {
  const chips: RuleChip[] = [];
  const add = (on: boolean, label: string, tone: RuleChip["tone"] = "neutral"): void => {
    if (on) {
      chips.push({ label, tone });
    }
  };
  add(rules.dupesClause, "Dupes");
  add(rules.shinyClause, "Shiny");
  add(rules.giftClause, "Gift clause");
  add(rules.noGifts, "No gifts");
  add(rules.nicknamesRequired, "Nicknames");
  add(rules.levelCaps, levelCap === null ? "Caps" : `Cap L${String(levelCap)}`, "flag");
  add(rules.setMode, "Set mode");
  add(rules.hardcore, "Hardcore");
  add(rules.randomiser.enabled, "Randomised");
  return chips;
}
