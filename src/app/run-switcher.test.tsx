/**
 * Unit coverage for `run-switcher.tsx` in isolation from `AppShell`: the pure sub-screen
 * extraction, and the `RunSwitcher` component driven directly by props (so these tests don't
 * depend on routing or the storage adapter at all). Integration coverage — the counters actually
 * coming from `summariseRun` against real adapter data, both shells agreeing, and a switch
 * preserving the sub-screen through the real router — lives in `app-shell.test.tsx`, since that's
 * the level those guarantees actually operate at.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { RunSummary } from "@/domain/derive";
import type { Run } from "@/domain/types";

import { subScreenFromPath } from "./nav-items";
import { RunSwitcher } from "./run-switcher";

describe("subScreenFromPath", () => {
  it("extracts the sub-screen slug from a run-scoped path", () => {
    expect(subScreenFromPath("/runs/run-a/party")).toBe("party");
    expect(subScreenFromPath("/runs/run-a/boxes")).toBe("boxes");
    expect(subScreenFromPath("/runs/run-a/graveyard")).toBe("graveyard");
    expect(subScreenFromPath("/runs/run-a/fights")).toBe("fights");
    expect(subScreenFromPath("/runs/run-a/routes")).toBe("routes");
  });

  it("falls back to the default sub-screen for paths with no recognised sub-screen", () => {
    expect(subScreenFromPath("/")).toBe("routes");
    expect(subScreenFromPath("/settings")).toBe("routes");
    expect(subScreenFromPath("/runs/new")).toBe("routes");
    // /runs/:runId itself, mid-RunRedirect.
    expect(subScreenFromPath("/runs/run-a")).toBe("routes");
    // Not a slug this app has.
    expect(subScreenFromPath("/runs/run-a/nonsense")).toBe("routes");
  });
});

const RUN_A: Run = {
  id: "run-a",
  name: "Silver Nuzlocke",
  game: "heartgold",
  status: "active",
  finishedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  rules: {
    dupesClause: false,
    speciesClause: false,
    shinyClause: false,
    nicknamesRequired: false,
    levelCaps: false,
    setMode: false,
    hardcore: false,
    randomiser: {
      enabled: false,
      wildEncounters: false,
      trainers: false,
      starters: false,
      abilities: false,
      items: false,
      moves: false,
      evolutions: false,
    },
    customClause: null,
  },
};

const RUN_B: Run = { ...RUN_A, id: "run-b", name: "Gold Nuzlocke" };

const SUMMARY: RunSummary = { routesCovered: 3, party: 2, boxed: 1, dead: 0 };

describe("RunSwitcher", () => {
  it("renders nothing when there are no runs to switch between", () => {
    const { container } = render(
      <RunSwitcher runs={[]} activeRunId={undefined} summary={undefined} onSwitch={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("lists every run and selects the active one", () => {
    render(
      <RunSwitcher
        runs={[RUN_A, RUN_B]}
        activeRunId={RUN_B.id}
        summary={undefined}
        onSwitch={vi.fn()}
      />,
    );

    const select = screen.getByRole("combobox", { name: "Switch run" });
    expect(select).toHaveValue(RUN_B.id);
    expect(screen.getByRole("option", { name: "Silver Nuzlocke" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Gold Nuzlocke" })).toBeInTheDocument();
  });

  it("calls onSwitch with the chosen run's id when a different run is picked", async () => {
    const onSwitch = vi.fn();
    render(
      <RunSwitcher
        runs={[RUN_A, RUN_B]}
        activeRunId={RUN_A.id}
        summary={undefined}
        onSwitch={onSwitch}
      />,
    );

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Switch run" }), RUN_B.id);

    expect(onSwitch).toHaveBeenCalledTimes(1);
    expect(onSwitch).toHaveBeenCalledWith(RUN_B.id);
  });

  it("still lists every run and lets you jump into one when no run is active", async () => {
    const onSwitch = vi.fn();
    render(
      <RunSwitcher
        runs={[RUN_A, RUN_B]}
        activeRunId={undefined}
        summary={undefined}
        onSwitch={onSwitch}
      />,
    );

    const select = screen.getByRole("combobox", { name: "Switch run" });
    expect(select).not.toBeDisabled();

    await userEvent.selectOptions(select, RUN_A.id);
    expect(onSwitch).toHaveBeenCalledTimes(1);
    expect(onSwitch).toHaveBeenCalledWith(RUN_A.id);
  });

  it("renders the given summary's counters when there is one", () => {
    render(
      <RunSwitcher runs={[RUN_A]} activeRunId={RUN_A.id} summary={SUMMARY} onSwitch={vi.fn()} />,
    );

    expect(screen.getByText("Routes")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Party")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Boxed")).toBeInTheDocument();
    expect(screen.getByText("Dead")).toBeInTheDocument();
  });

  it("renders no counters at all when summary is undefined, rather than zeroes", () => {
    const { container } = render(
      <RunSwitcher runs={[RUN_A]} activeRunId={RUN_A.id} summary={undefined} onSwitch={vi.fn()} />,
    );

    expect(container.querySelector("dl")).not.toBeInTheDocument();
  });
});
