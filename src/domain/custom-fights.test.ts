import { describe, expect, test } from "vitest";

import { canDeleteFight, orderAfterLast, orderBefore, respaceFights } from "@/domain/custom-fights";
import { FIGHT_ORDER_STEP } from "@/domain/fight-list";
import type { Death } from "@/domain/types";
import { makeDeath, makeFight } from "@/test/factories";

const trainerCause = (fightId: string): Death["cause"] => ({
  type: "trainer",
  fightId,
  trainerName: null,
  species: "pidgey",
  level: 9,
  move: null,
});

describe("orderBefore", () => {
  const fights = [
    makeFight({ id: "b", order: 200 }),
    makeFight({ id: "a", order: 100 }),
    makeFight({ id: "c", order: 300 }),
  ];

  test("returns the floored midpoint between the target and the fight before it", () => {
    expect(orderBefore(fights, "c")).toBe(250);
    expect(
      orderBefore([makeFight({ id: "a", order: 100 }), makeFight({ id: "b", order: 105 })], "b"),
    ).toBe(102);
  });

  test("steps back by one fight step when the target is first", () => {
    expect(orderBefore(fights, "a")).toBe(100 - FIGHT_ORDER_STEP);
  });

  test("returns null once the neighbours have no integer between them", () => {
    expect(
      orderBefore([makeFight({ id: "a", order: 100 }), makeFight({ id: "b", order: 101 })], "b"),
    ).toBeNull();
    expect(
      orderBefore([makeFight({ id: "a", order: 100 }), makeFight({ id: "b", order: 100 })], "b"),
    ).toBeNull();
  });

  test("repeated inserts at the same spot close the gap and then signal a respace", () => {
    let list = [makeFight({ id: "a", order: 100 }), makeFight({ id: "b", order: 200 })];
    const results: (number | null)[] = [];
    for (let i = 0; i < 10; i++) {
      const order = orderBefore(list, "b");
      results.push(order);
      if (order === null) break;
      list = [...list, makeFight({ id: `n${i}`, order })];
    }
    expect(results.at(-1)).toBeNull();
    expect(results.slice(0, 3)).toEqual([150, 175, 187]);
    const orders = list.map((f) => f.order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  test("throws for an unknown fight", () => {
    expect(() => orderBefore(fights, "nope")).toThrow();
  });
});

describe("orderAfterLast", () => {
  test("goes one step past the highest order", () => {
    expect(
      orderAfterLast([makeFight({ id: "a", order: 500 }), makeFight({ id: "b", order: 200 })]),
    ).toBe(500 + FIGHT_ORDER_STEP);
  });

  test("starts at one step for an empty list", () => {
    expect(orderAfterLast([])).toBe(FIGHT_ORDER_STEP);
  });
});

describe("respaceFights", () => {
  test("reassigns orders in steps and keeps the relative order", () => {
    const result = respaceFights([
      makeFight({ id: "c", order: 102 }),
      makeFight({ id: "a", order: 100 }),
      makeFight({ id: "b", order: 101 }),
    ]);
    expect(result.map((f) => [f.id, f.order])).toEqual([
      ["a", 100],
      ["b", 200],
      ["c", 300],
    ]);
  });

  test("does not mutate the input", () => {
    const input = [makeFight({ id: "a", order: 7 })];
    respaceFights(input);
    expect(input[0]?.order).toBe(7);
  });
});

describe("canDeleteFight", () => {
  const custom = makeFight({ id: "custom", order: 100, kind: "custom" });

  test("allows a pending custom fight with no deaths", () => {
    expect(canDeleteFight(custom, [])).toBe(true);
  });

  test("refuses a seeded fight", () => {
    expect(canDeleteFight({ ...custom, kind: "gym", gameFightId: "g1" }, [])).toBe(false);
  });

  test("refuses a cleared custom fight", () => {
    expect(canDeleteFight({ ...custom, status: "cleared" }, [])).toBe(false);
  });

  test("refuses a custom fight with a linked death", () => {
    expect(canDeleteFight(custom, [makeDeath({ cause: trainerCause("custom") })])).toBe(false);
  });

  test("ignores deaths linked to other fights or caused otherwise", () => {
    const other = makeDeath({ cause: trainerCause("elsewhere") });
    const wild = makeDeath({ cause: { type: "wild", species: "rattata", level: 3, move: null } });
    expect(canDeleteFight(custom, [other, wild])).toBe(true);
  });
});
