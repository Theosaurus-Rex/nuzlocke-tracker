import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TypeBadge, type TypeBadgeType } from "./type-badge";

const ALL_TYPES: TypeBadgeType[] = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
];

function classesFor(type: TypeBadgeType): string {
  const { unmount } = render(<TypeBadge type={type} />);
  const classes = screen.getByText(type).className;
  unmount();
  return classes;
}

describe("TypeBadge", () => {
  it("covers all 18 types", () => {
    expect(ALL_TYPES).toHaveLength(18);
  });

  it("gives every one of the 18 types a distinct, non-empty fill", () => {
    const fills = ALL_TYPES.map(classesFor);
    expect(fills.every((fill) => fill.length > 0)).toBe(true);
    expect(new Set(fills).size).toBe(ALL_TYPES.length);
  });

  it("gives every type ink text, not a fill-dependent colour", () => {
    for (const type of ALL_TYPES) {
      expect(classesFor(type)).toContain("text-foreground");
    }
  });
});
