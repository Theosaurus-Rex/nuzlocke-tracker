import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { findMenuTrigger } from "@/test/pokeapi-fetch";
import type { Encounter, Mon, Route } from "@/domain/types";
import type { RouteRow } from "@/domain/route-rows";

import { RowActionsMenu } from "./row-actions-menu";

const TIMESTAMP = "2026-09-17T00:00:00.000Z";

function makeRoute(overrides: Partial<Route> = {}): Route {
  return {
    id: "route-1",
    runId: "run-1",
    name: "Route 30",
    order: 100,
    isCustom: false,
    gameRouteId: "route-1",
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

function makeEncounter(overrides: Partial<Encounter> = {}): Encounter {
  return {
    id: "encounter-1",
    runId: "run-1",
    routeId: "route-1",
    status: "open",
    speciesId: null,
    level: null,
    monId: null,
    notes: null,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

function makeMon(overrides: Partial<Mon> = {}): Mon {
  return {
    id: "mon-1",
    runId: "run-1",
    encounterId: "encounter-1",
    speciesId: "chikorita",
    speciesIdCaught: "chikorita",
    nickname: null,
    gender: null,
    level: 5,
    levelCaught: 5,
    nature: null,
    ability: null,
    heldItem: null,
    moves: [],
    status: "party",
    partySlot: 0,
    boxOrder: null,
    caughtRouteId: null,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

function renderMenu(
  row: RouteRow,
  overrides: Partial<{
    removable: boolean;
    deletePending: boolean;
    onEditMon: (route: Route, mon: Mon) => void;
    onReset: (row: RouteRow) => void;
    onDelete: (route: Route) => void;
  }> = {},
) {
  return render(
    <RowActionsMenu
      row={row}
      removable={overrides.removable ?? false}
      deletePending={overrides.deletePending ?? false}
      onEditMon={overrides.onEditMon ?? vi.fn()}
      onReset={overrides.onReset ?? vi.fn()}
      onDelete={overrides.onDelete ?? vi.fn()}
    />,
  );
}

describe("RowActionsMenu", () => {
  it.each([
    ["caught" as const, "party" as const],
    ["dead" as const, "dead" as const],
  ])(
    "opens Edit mon and Reset encounter for a %s row, each calling its own callback",
    async (rowStatus, monStatus) => {
      const route = makeRoute({ id: "route-1", name: "Route 30" });
      const mon = makeMon({ id: "mon-1", status: monStatus });
      const row: RouteRow = {
        route,
        encounter: makeEncounter({ status: "caught", monId: "mon-1" }),
        mon,
        status: rowStatus,
      };
      const onEditMon = vi.fn();
      const onReset = vi.fn();

      renderMenu(row, { onEditMon, onReset });

      await userEvent.click(await findMenuTrigger("Actions for Route 30"));

      await userEvent.click(await screen.findByRole("menuitem", { name: "Edit mon" }));
      expect(onEditMon).toHaveBeenCalledWith(route, mon);

      await userEvent.click(await findMenuTrigger("Actions for Route 30"));
      await userEvent.click(await screen.findByRole("menuitem", { name: "Reset encounter" }));
      expect(onReset).toHaveBeenCalledWith(row);
    },
  );

  it.each([["missed" as const], ["skipped" as const]])(
    "offers only Reset encounter for a %s row",
    async (status) => {
      const route = makeRoute({ id: "route-1", name: "Route 30" });
      const row: RouteRow = {
        route,
        encounter: makeEncounter({ status }),
        mon: null,
        status,
      };
      const onReset = vi.fn();

      renderMenu(row, { onReset });

      await userEvent.click(await findMenuTrigger("Actions for Route 30"));

      const resetItem = await screen.findByRole("menuitem", { name: "Reset encounter" });
      expect(screen.queryByRole("menuitem", { name: "Edit mon" })).not.toBeInTheDocument();
      await userEvent.click(resetItem);
      expect(onReset).toHaveBeenCalledWith(row);
    },
  );

  it("renders no trigger for a not-encountered seeded route", () => {
    const route = makeRoute({ id: "route-1", name: "Route 30", isCustom: false });
    const row: RouteRow = { route, encounter: null, mon: null, status: "not-encountered" };

    renderMenu(row, { removable: false });

    expect(screen.queryByRole("button", { name: "Actions for Route 30" })).not.toBeInTheDocument();
  });

  it("renders no trigger for an open row", () => {
    const route = makeRoute({ id: "route-1", name: "Route 30" });
    const row: RouteRow = {
      route,
      encounter: makeEncounter({ status: "open" }),
      mon: null,
      status: "open",
    };

    renderMenu(row, { removable: false });

    expect(screen.queryByRole("button", { name: "Actions for Route 30" })).not.toBeInTheDocument();
  });

  it("offers only Delete route for a not-encountered custom route when removable, disabled while pending", async () => {
    const route = makeRoute({ id: "route-1", name: "Route 30", isCustom: true });
    const row: RouteRow = { route, encounter: null, mon: null, status: "not-encountered" };
    const onDelete = vi.fn();

    renderMenu(row, { removable: true, deletePending: true, onDelete });

    await userEvent.click(await findMenuTrigger("Actions for Route 30"));

    const deleteItem = await screen.findByRole("menuitem", { name: "Delete route" });
    expect(deleteItem).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByRole("menuitem", { name: "Edit mon" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Reset encounter" })).not.toBeInTheDocument();
  });

  it("calls onDelete from Delete route when not pending", async () => {
    const route = makeRoute({ id: "route-1", name: "Route 30", isCustom: true });
    const row: RouteRow = { route, encounter: null, mon: null, status: "not-encountered" };
    const onDelete = vi.fn();

    renderMenu(row, { removable: true, deletePending: false, onDelete });

    await userEvent.click(await findMenuTrigger("Actions for Route 30"));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete route" }));

    expect(onDelete).toHaveBeenCalledWith(route);
  });

  it("offers Edit mon and Reset encounter but no Delete route for a caught custom route", async () => {
    const route = makeRoute({ id: "route-1", name: "Route 30", isCustom: true });
    const mon = makeMon({ id: "mon-1", status: "party" });
    const row: RouteRow = {
      route,
      encounter: makeEncounter({ status: "caught", monId: "mon-1" }),
      mon,
      status: "caught",
    };

    renderMenu(row, { removable: false });

    await userEvent.click(await findMenuTrigger("Actions for Route 30"));

    expect(await screen.findByRole("menuitem", { name: "Edit mon" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Reset encounter" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Delete route" })).not.toBeInTheDocument();
  });
});
