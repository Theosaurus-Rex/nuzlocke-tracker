import type { Fight, LevelCapMilestone, Rules } from "./types";

export interface RuleChip {
  label: string;
  tone: "neutral" | "flag";
}

export function currentLevelCap(
  fights: readonly Fight[],
  milestones: readonly LevelCapMilestone[],
  badgeFightIds: ReadonlySet<string>,
): number | null {
  const builtIn = new Map<string, Fight>();
  for (const fight of fights) {
    if (fight.gameFightId !== null) builtIn.set(fight.gameFightId, fight);
  }
  const badges = [...builtIn.values()].filter(
    (fight) => fight.status === "cleared" && badgeFightIds.has(fight.gameFightId ?? ""),
  ).length;

  const milestone = milestones.find(({ until }) =>
    "badges" in until ? badges < until.badges : builtIn.get(until.fight)?.status === "pending",
  );
  if (milestone === undefined) return null;

  const nextBadgeOrder = Math.min(
    ...[...builtIn.values()]
      .filter((fight) => fight.status !== "cleared" && badgeFightIds.has(fight.gameFightId ?? ""))
      .map((fight) => fight.order),
  );
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
  add(rules.nicknamesRequired, "Nicknames");
  add(rules.levelCaps, levelCap === null ? "Caps" : `Cap L${String(levelCap)}`, "flag");
  add(rules.setMode, "Set mode");
  add(rules.hardcore, "Hardcore");
  add(rules.randomiser.enabled, "Randomised");
  return chips;
}
