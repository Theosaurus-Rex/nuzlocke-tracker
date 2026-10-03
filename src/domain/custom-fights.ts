import { FIGHT_ORDER_STEP } from "@/domain/fight-list";
import type { Death, Fight } from "@/domain/types";

const byOrder = (a: Fight, b: Fight): number => a.order - b.order;

export function orderBefore(fights: readonly Fight[], beforeFightId: string): number | null {
  const sorted = [...fights].sort(byOrder);
  const index = sorted.findIndex((fight) => fight.id === beforeFightId);
  if (index === -1) throw new Error(`Fight ${beforeFightId} is not in this list.`);

  const target = sorted[index]!;
  const previous = sorted[index - 1];
  if (previous === undefined) return target.order - FIGHT_ORDER_STEP;
  if (target.order - previous.order < 2) return null;
  return Math.floor((previous.order + target.order) / 2);
}

export function orderAfterLast(fights: readonly Fight[]): number {
  if (fights.length === 0) return FIGHT_ORDER_STEP;
  return Math.max(...fights.map((fight) => fight.order)) + FIGHT_ORDER_STEP;
}

export function respaceFights(fights: readonly Fight[]): Fight[] {
  return [...fights]
    .sort(byOrder)
    .map((fight, index) => ({ ...fight, order: (index + 1) * FIGHT_ORDER_STEP }));
}

export function canDeleteFight(fight: Fight, deaths: readonly Death[]): boolean {
  return (
    fight.kind === "custom" &&
    fight.status === "pending" &&
    !deaths.some((death) => death.cause.type === "trainer" && death.cause.fightId === fight.id)
  );
}
