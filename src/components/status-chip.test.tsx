import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusChip, type StatusChipStatus } from "./status-chip";

function classesFor(status: StatusChipStatus): string {
  const { container, unmount } = render(<StatusChip status={status} />);
  const classes = (container.firstElementChild as HTMLElement).className;
  unmount();
  return classes;
}

const GO: StatusChipStatus[] = ["caught", "party", "active", "cleared"];
const ALERT: StatusChipStatus[] = ["fainted", "failed", "over-cap"];
const FLAG: StatusChipStatus[] = ["pending", "log", "trainer", "wild"];
const GRID: StatusChipStatus[] = ["boxed", "complete", "clause"];

describe("StatusChip", () => {
  it.each(GO)("gives every go-group status the same fill: %s", (status) => {
    expect(classesFor(status)).toBe(classesFor("caught"));
  });

  it.each(ALERT)("gives every alert-group status the same fill: %s", (status) => {
    expect(classesFor(status)).toBe(classesFor("fainted"));
  });

  it.each(FLAG)("gives every flag-group status the same fill: %s", (status) => {
    expect(classesFor(status)).toBe(classesFor("pending"));
  });

  it.each(GRID)("gives every grid-group status the same fill: %s", (status) => {
    expect(classesFor(status)).toBe(classesFor("boxed"));
  });

  it("gives the four groups four different fills", () => {
    const fills = new Set([
      classesFor("caught"),
      classesFor("fainted"),
      classesFor("pending"),
      classesFor("boxed"),
    ]);
    expect(fills.size).toBe(4);
  });

  it("gives missed its own fill, distinct from the grid group it would otherwise join", () => {
    expect(classesFor("missed")).not.toBe(classesFor("boxed"));
  });

  it("renders the status as its own label by default", () => {
    render(<StatusChip status="caught" />);
    expect(screen.getByText("caught")).toBeInTheDocument();
  });

  it("renders a custom label in place of the status text, without changing the fill", () => {
    render(<StatusChip status="caught">Caught!</StatusChip>);
    expect(screen.getByText("Caught!")).toBeInTheDocument();
    expect(screen.getByText("Caught!").className).toBe(classesFor("caught"));
  });

  it("spaces a hyphenated status rather than printing its hyphen", () => {
    render(<StatusChip status="over-cap" />);
    expect(screen.getByText("over cap")).toBeInTheDocument();
  });
});
