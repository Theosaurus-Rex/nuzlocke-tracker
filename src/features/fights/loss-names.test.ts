import { describe, expect, test } from "vitest";

import { numberedFightLabels } from "./loss-names";

describe("numberedFightLabels", () => {
  test("numbers repeated names in order and leaves a unique name alone", () => {
    const labels = numberedFightLabels([
      { id: "a", name: "Silver", badge: null },
      { id: "b", name: "Falkner", badge: "Zephyr" },
      { id: "c", name: "Silver", badge: null },
      { id: "d", name: "Silver", badge: null },
    ]);
    expect([...labels.values()]).toEqual([
      "Silver (1)",
      "Falkner · Zephyr",
      "Silver (2)",
      "Silver (3)",
    ]);
  });

  test("keeps a badge on a numbered gym name", () => {
    const labels = numberedFightLabels([
      { id: "a", name: "Gym", badge: "Zephyr" },
      { id: "b", name: "Gym", badge: "Hive" },
    ]);
    expect(labels.get("b")).toBe("Gym (2) · Hive");
  });
});
