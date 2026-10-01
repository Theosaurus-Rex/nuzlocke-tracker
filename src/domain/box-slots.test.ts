import { describe, expect, test } from "vitest";

import { BOX_SIZE, boxLayout, nextFreeBoxSlot } from "@/domain/box-slots";
import type { Mon } from "@/domain/types";

function boxed(id: string, boxOrder: number | null, overrides: Partial<Mon> = {}): Mon {
  return {
    id,
    runId: "run-1",
    encounterId: null,
    speciesId: "geodude",
    speciesIdCaught: "geodude",
    nickname: null,
    gender: null,
    level: 5,
    levelCaught: 5,
    nature: null,
    ability: null,
    heldItem: null,
    moves: [],
    status: "box",
    partySlot: null,
    boxOrder,
    caughtRouteId: null,
    shiny: false,
    createdAt: "2026-09-17T00:00:00.000Z",
    updatedAt: "2026-09-17T00:00:00.000Z",
    ...overrides,
  };
}

const at = (minute: number) => `2026-09-17T00:${String(minute).padStart(2, "0")}:00.000Z`;

describe("boxLayout", () => {
  test("keeps stored slots, gaps included", () => {
    const layout = boxLayout([boxed("a", 0), boxed("b", 1), boxed("c", 3)]);
    expect([...layout]).toEqual([
      ["a", 0],
      ["b", 1],
      ["c", 3],
    ]);
  });

  test("null mons fill the lowest free slots in caught order", () => {
    const layout = boxLayout([
      boxed("late", null, { createdAt: at(9) }),
      boxed("fixed", 1),
      boxed("early", null, { createdAt: at(1) }),
    ]);
    expect(layout.get("early")).toBe(0);
    expect(layout.get("fixed")).toBe(1);
    expect(layout.get("late")).toBe(2);
  });

  test("breaks a caught-time tie by id", () => {
    const layout = boxLayout([boxed("b", null), boxed("a", null)]);
    expect(layout.get("a")).toBe(0);
    expect(layout.get("b")).toBe(1);
  });

  test("a second claim on the same slot is treated as unplaced", () => {
    const layout = boxLayout([
      boxed("first", 2, { createdAt: at(1) }),
      boxed("second", 2, { createdAt: at(2) }),
    ]);
    expect(layout.get("first")).toBe(2);
    expect(layout.get("second")).toBe(0);
  });

  test("invalid stored slots are treated as unplaced", () => {
    const layout = boxLayout([
      boxed("neg", -1, { createdAt: at(1) }),
      boxed("frac", 1.5, { createdAt: at(2) }),
      boxed("nan", Number.NaN, { createdAt: at(3) }),
    ]);
    expect([layout.get("neg"), layout.get("frac"), layout.get("nan")]).toEqual([0, 1, 2]);
  });

  test("ignores party and dead mons even with a stale boxOrder", () => {
    const layout = boxLayout([
      boxed("p", 0, { status: "party", partySlot: 0 }),
      boxed("d", 1, { status: "dead" }),
      boxed("b", null),
    ]);
    expect([...layout]).toEqual([["b", 0]]);
  });

  test("does not depend on input order", () => {
    const mons = [boxed("a", null, { createdAt: at(1) }), boxed("b", 4), boxed("c", null)];
    expect([...boxLayout([...mons].reverse())].sort()).toEqual([...boxLayout(mons)].sort());
  });
});

describe("nextFreeBoxSlot", () => {
  test("is 0 for an empty box", () => {
    expect(nextFreeBoxSlot([])).toBe(0);
  });

  test("reuses a gap: slots 0, 1, 3 occupied gets 2", () => {
    expect(nextFreeBoxSlot([boxed("a", 0), boxed("b", 1), boxed("c", 3)])).toBe(2);
  });

  test("ignores stale boxOrder on party and dead mons", () => {
    const mons = [boxed("p", 0, { status: "party" }), boxed("d", 1, { status: "dead" })];
    expect(nextFreeBoxSlot(mons)).toBe(0);
  });

  test("counts null mons as occupying their layout slots", () => {
    expect(nextFreeBoxSlot([boxed("a", null), boxed("b", 1)])).toBe(2);
  });

  test("overflows into the second box after slot 29", () => {
    const full = Array.from({ length: BOX_SIZE }, (_, i) => boxed(`m${String(i)}`, i));
    expect(nextFreeBoxSlot(full)).toBe(30);
    expect(Math.floor(nextFreeBoxSlot(full) / BOX_SIZE)).toBe(1);
  });

  test("excludeMonId frees that mon's own slot", () => {
    const mons = [boxed("a", 0), boxed("b", 1)];
    expect(nextFreeBoxSlot(mons, "a")).toBe(0);
    expect(nextFreeBoxSlot(mons, "b")).toBe(1);
  });
});
