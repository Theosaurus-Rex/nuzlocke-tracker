import { describe, expect, it } from "vitest";

import { DEFAULT_RULES, toggleClause, withDefaultedClauses } from "./rules";
import type { Rules } from "./types";

describe("gift rules", () => {
  it("start off", () => {
    expect(DEFAULT_RULES.giftClause).toBe(false);
    expect(DEFAULT_RULES.noGifts).toBe(false);
  });

  it("turning on the gift clause turns off no gifts", () => {
    const rules = toggleClause({ ...DEFAULT_RULES, noGifts: true }, "giftClause");
    expect(rules.giftClause).toBe(true);
    expect(rules.noGifts).toBe(false);
  });

  it("turning on no gifts turns off the gift clause", () => {
    const rules = toggleClause({ ...DEFAULT_RULES, giftClause: true }, "noGifts");
    expect(rules.noGifts).toBe(true);
    expect(rules.giftClause).toBe(false);
  });

  it("turning a gift rule off leaves the other alone", () => {
    const rules = toggleClause({ ...DEFAULT_RULES, giftClause: true }, "giftClause");
    expect(rules.giftClause).toBe(false);
    expect(rules.noGifts).toBe(false);
  });

  it("leaves unrelated clauses alone", () => {
    const rules = toggleClause({ ...DEFAULT_RULES, giftClause: true }, "hardcore");
    expect(rules.hardcore).toBe(true);
    expect(rules.giftClause).toBe(true);
  });

  it("fills missing gift rules as off", () => {
    const old: Partial<Rules> = { ...DEFAULT_RULES };
    delete old.giftClause;
    delete old.noGifts;
    const filled = withDefaultedClauses(old as Rules);
    expect(filled.giftClause).toBe(false);
    expect(filled.noGifts).toBe(false);
  });
});
