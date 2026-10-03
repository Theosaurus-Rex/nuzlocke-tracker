import type { Death, Mon } from "@/domain/types";
import { monTitle } from "@/features/encounters/mon-title";
import { speciesDisplayName } from "@/game/pokeapi/resolve";

export function lossNames(losses: readonly Death[], monsById: ReadonlyMap<string, Mon>): string[] {
  return losses.flatMap((death) => {
    const mon = monsById.get(death.monId);
    if (mon === undefined) return [];
    return [
      mon.nickname === null
        ? monTitle(mon)
        : `${monTitle(mon)} ${speciesDisplayName(mon.speciesId)}`,
    ];
  });
}

export function fightLabel(name: string, badge: string | null): string {
  return badge === null ? name : `${name} · ${badge}`;
}

export function capLabel(levelCap: number | null): string {
  return levelCap === null ? "—" : `L${String(levelCap)}`;
}

export function numberedFightLabels(
  fights: readonly { id: string; name: string; badge: string | null }[],
): Map<string, string> {
  const totals = new Map<string, number>();
  for (const { name } of fights) totals.set(name, (totals.get(name) ?? 0) + 1);

  const seen = new Map<string, number>();
  return new Map(
    fights.map(({ id, name, badge }) => {
      const occurrence = (seen.get(name) ?? 0) + 1;
      seen.set(name, occurrence);
      const numbered = (totals.get(name) ?? 0) > 1 ? `${name} (${String(occurrence)})` : name;
      return [id, fightLabel(numbered, badge)];
    }),
  );
}
