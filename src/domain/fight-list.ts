import type { Death, Fight } from "@/domain/types";

export interface FightMeta {
  region: string;
  badge: string | null;
}
export type FightLookup = (gameFightId: string) => FightMeta | undefined;
export type FightState = "cleared" | "next" | "upcoming";

export interface FightRow {
  fight: Fight;
  badge: string | null;
  state: FightState;
  losses: Death[];
}

export interface FightSection {
  label: string;
  rows: FightRow[];
}

const LEAGUE_LABEL = "Elite Four";

function regionLabel(region: string): string {
  return region.charAt(0).toUpperCase() + region.slice(1);
}

function labelFor(fight: Fight, meta: FightMeta | undefined): string | null {
  if (fight.kind === "elite_four" || fight.kind === "champion") return LEAGUE_LABEL;
  return meta ? regionLabel(meta.region) : null;
}

export function buildFightSections(
  fights: Fight[],
  lookup: FightLookup,
  deaths: Death[],
): FightSection[] {
  const sorted = [...fights].sort((a, b) => a.order - b.order);
  const nextId = sorted.find((f) => f.status !== "cleared")?.id;

  const labelled = sorted.map((fight) => {
    const meta = fight.gameFightId ? lookup(fight.gameFightId) : undefined;
    return { fight, meta, label: labelFor(fight, meta) };
  });
  const firstLabel = labelled.find((l) => l.label !== null)?.label ?? "";

  const sections: FightSection[] = [];
  let previous = firstLabel;
  for (const { fight, meta, label } of labelled) {
    const resolved = label ?? previous;
    previous = resolved;
    const row: FightRow = {
      fight,
      badge: meta?.badge ?? null,
      state: fight.status === "cleared" ? "cleared" : fight.id === nextId ? "next" : "upcoming",
      losses: deaths.filter((d) => d.cause.type === "trainer" && d.cause.fightId === fight.id),
    };
    const last = sections[sections.length - 1];
    if (last?.label === resolved) last.rows.push(row);
    else sections.push({ label: resolved, rows: [row] });
  }
  return sections;
}

export function badgeCount(fights: Fight[]): { earned: number; total: number } {
  const badges = fights.filter((f) => f.grantsBadge);
  return { earned: badges.filter((f) => f.status === "cleared").length, total: badges.length };
}
