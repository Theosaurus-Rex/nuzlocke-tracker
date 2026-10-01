/** Box slot numbers: box = floor(slot / BOX_SIZE), position = slot % BOX_SIZE. Gaps are allowed. */

import type { Mon } from "./types";

export const BOX_SIZE = 30;

function byCaught(a: Mon, b: Mon): number {
  if (a.createdAt !== b.createdAt) {
    return a.createdAt < b.createdAt ? -1 : 1;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function isValidSlot(slot: number | null): slot is number {
  return slot !== null && Number.isInteger(slot) && slot >= 0;
}

/**
 * The slot of every boxed mon. Stored slots win, and a second claim on a taken slot loses it.
 * Everything unplaced fills the lowest free slots in caught order.
 */
export function boxLayout(mons: readonly Mon[]): Map<string, number> {
  const boxed = mons.filter((mon) => mon.status === "box");
  const layout = new Map<string, number>();
  const taken = new Set<number>();
  const unplaced: Mon[] = [];

  const claimants = boxed
    .filter((mon) => isValidSlot(mon.boxOrder))
    .sort((a, b) => (a.boxOrder ?? 0) - (b.boxOrder ?? 0) || byCaught(a, b));

  for (const mon of boxed) {
    if (!isValidSlot(mon.boxOrder)) {
      unplaced.push(mon);
    }
  }

  for (const mon of claimants) {
    const slot = mon.boxOrder;
    if (slot === null || taken.has(slot)) {
      unplaced.push(mon);
    } else {
      taken.add(slot);
      layout.set(mon.id, slot);
    }
  }

  let next = 0;
  for (const mon of unplaced.sort(byCaught)) {
    while (taken.has(next)) {
      next++;
    }
    taken.add(next);
    layout.set(mon.id, next);
  }

  return layout;
}

/** Lowest free slot, not the count, because a mon leaving the box leaves a gap. */
export function nextFreeBoxSlot(mons: readonly Mon[], excludeMonId?: string): number {
  const occupied = new Set(boxLayout(mons.filter((mon) => mon.id !== excludeMonId)).values());

  let slot = 0;
  while (occupied.has(slot)) {
    slot++;
  }
  return slot;
}
