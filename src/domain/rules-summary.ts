import type { Fight, Rules } from "./types";

export interface RuleChip {
  label: string;
  tone: "neutral" | "flag";
}

export function currentLevelCap(fights: readonly Fight[]): number | null {
  const next = [...fights]
    .sort((a, b) => a.order - b.order)
    .find((fight) => fight.status !== "cleared" && fight.levelCap !== null);
  return next?.levelCap ?? null;
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
