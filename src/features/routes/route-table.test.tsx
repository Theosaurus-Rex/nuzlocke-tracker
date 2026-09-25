/**
 * Covers `route-table.tsx` in isolation, built directly from `buildRouteRows` fixtures rather
 * than through the storage layer, so each case can hand-pick the exact combination of route,
 * encounter and mon it needs.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { buildRouteRows } from "@/domain/route-rows";
import type { Encounter, Mon, Route } from "@/domain/types";

import { RouteTable } from "./route-table";

const TIMESTAMP = "2026-09-17T00:00:00.000Z";

function makeRoute(overrides: Partial<Route> = {}): Route {
  return {
    id: "route-1",
    runId: "run-1",
    name: "Route 1",
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

const HEARTGOLD_GENERATION = 4;

function renderTable(input: {
  routes: Route[];
  encounters: Encounter[];
  mons: Mon[];
  onDelete?: (route: Route) => void;
  onLogEncounter?: (route: Route) => void;
  onEditMon?: (route: Route, mon: Mon) => void;
  onResetEncounter?: (row: ReturnType<typeof buildRouteRows>[number]) => void;
}) {
  const rows = buildRouteRows({
    routes: input.routes,
    encounters: input.encounters,
    mons: input.mons,
  });

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <RouteTable
        rows={rows}
        encounters={input.encounters}
        generation={HEARTGOLD_GENERATION}
        onDelete={input.onDelete ?? vi.fn()}
        deletePending={false}
        onLogEncounter={input.onLogEncounter ?? vi.fn()}
        onEditMon={input.onEditMon ?? vi.fn()}
        onResetEncounter={input.onResetEncounter ?? vi.fn()}
      />
    </QueryClientProvider>,
  );
}

describe("RouteTable", () => {
  it("renders one row per route with the four column headers", () => {
    const routes = [
      makeRoute({ id: "route-1", name: "New Bark Town" }),
      makeRoute({ id: "route-2", name: "Route 29" }),
    ];

    renderTable({ routes, encounters: [], mons: [] });

    expect(screen.getByRole("columnheader", { name: "Route" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Encounter" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Type" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Lvl" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeInTheDocument();

    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(routes.length + 1);
  });

  it.each([
    ["not-encountered" as const, "log", []],
    ["open" as const, "log", [makeEncounter({ status: "open" })]],
    ["missed" as const, "missed", [makeEncounter({ status: "missed" })]],
    ["skipped" as const, "skipped", [makeEncounter({ status: "skipped" })]],
  ])("renders the %s row's chip as %s", (_status, expectedLabel, encounters) => {
    const routes = [makeRoute({ id: "route-1" })];

    renderTable({ routes, encounters, mons: [] });

    const row = screen.getAllByRole("row")[1]!;
    const cells = within(row).getAllByRole("cell");
    const statusCell = cells[cells.length - 2]!;

    expect(within(statusCell).getByText(expectedLabel)).toBeInTheDocument();
  });

  it("shows the party chip for a caught encounter whose mon is in the party", () => {
    const routes = [makeRoute({ id: "route-1" })];
    const encounters = [
      makeEncounter({ id: "encounter-1", routeId: "route-1", status: "caught", monId: "mon-1" }),
    ];
    const mons = [makeMon({ id: "mon-1", status: "party" })];

    renderTable({ routes, encounters, mons });

    expect(screen.getByText("party")).toBeInTheDocument();
    expect(screen.queryByText("fainted")).not.toBeInTheDocument();
  });

  it("shows the boxed chip for a caught encounter whose mon is in a box", () => {
    const routes = [makeRoute({ id: "route-1" })];
    const encounters = [
      makeEncounter({ id: "encounter-1", routeId: "route-1", status: "caught", monId: "mon-1" }),
    ];
    const mons = [makeMon({ id: "mon-1", status: "box" })];

    renderTable({ routes, encounters, mons });

    expect(screen.getByText("boxed")).toBeInTheDocument();
    expect(screen.queryByText("party")).not.toBeInTheDocument();
  });

  it("shows the fainted chip, not party or boxed, for a caught encounter whose mon has died", () => {
    const routes = [makeRoute({ id: "route-1" })];
    const encounters = [
      makeEncounter({ id: "encounter-1", routeId: "route-1", status: "caught", monId: "mon-1" }),
    ];
    const mons = [makeMon({ id: "mon-1", status: "dead" })];

    // The fixture's own encounter status is "caught": only the mon's death flips the chip, so a
    // naive render of `encounter.status` would show "party" here and this assertion would fail.
    expect(encounters[0]?.status).toBe("caught");

    renderTable({ routes, encounters, mons });

    expect(screen.getByText("fainted")).toBeInTheDocument();
    expect(screen.queryByText("party")).not.toBeInTheDocument();
    expect(screen.queryByText("boxed")).not.toBeInTheDocument();
  });

  it("shows the species display name and nickname for a caught mon", () => {
    const routes = [makeRoute({ id: "route-1" })];
    const encounters = [
      makeEncounter({ id: "encounter-1", routeId: "route-1", status: "caught", monId: "mon-1" }),
    ];
    const mons = [makeMon({ id: "mon-1", speciesId: "chikorita", nickname: "Scout" })];

    renderTable({ routes, encounters, mons });

    const row = screen.getAllByRole("row")[1]!;
    expect(within(row).getByText("Chikorita")).toBeInTheDocument();
    expect(row.textContent).toContain("“Scout”");
  });

  it("shows the species display name for a missed encounter with no mon", () => {
    const routes = [makeRoute({ id: "route-1" })];
    const encounters = [
      makeEncounter({
        id: "encounter-1",
        routeId: "route-1",
        status: "missed",
        speciesId: "geodude",
      }),
    ];

    renderTable({ routes, encounters, mons: [] });

    expect(screen.getByText("Geodude")).toBeInTheDocument();
  });

  it("prefers the mon's level over the encounter's level", () => {
    const routes = [makeRoute({ id: "route-1" })];
    const encounters = [
      makeEncounter({
        id: "encounter-1",
        routeId: "route-1",
        status: "caught",
        monId: "mon-1",
        level: 3,
      }),
    ];
    const mons = [makeMon({ id: "mon-1", level: 12 })];

    // The encounter's own level disagrees with the mon's, so a cell that read `encounter.level`
    // first would render "3" here and this assertion would fail.
    expect(encounters[0]?.level).toBe(3);

    renderTable({ routes, encounters, mons });

    const row = screen.getAllByRole("row")[1]!;
    expect(within(row).getByText("12")).toBeInTheDocument();
    expect(within(row).queryByText("3")).not.toBeInTheDocument();
  });

  it("renders an em dash for a route with no level on either the mon or the encounter", () => {
    const routes = [makeRoute({ id: "route-1" })];

    renderTable({ routes, encounters: [], mons: [] });

    const row = screen.getAllByRole("row")[1]!;
    expect(within(row).getByText("—")).toBeInTheDocument();
  });

  it("exposes a delete control for a deletable custom route", async () => {
    const route = makeRoute({ id: "route-1", isCustom: true, name: "Route 1" });
    const onDelete = vi.fn();

    renderTable({ routes: [route], encounters: [], mons: [], onDelete });

    await userEvent.click(screen.getByRole("button", { name: "Delete Route 1" }));

    expect(onDelete).toHaveBeenCalledWith(route);
  });

  it("puts the end icon in the row's last cell", () => {
    const route = makeRoute({ id: "route-1", isCustom: true, name: "Route 1" });

    renderTable({ routes: [route], encounters: [], mons: [] });

    const row = screen.getAllByRole("row")[1]!;
    const cells = within(row).getAllByRole("cell");
    const lastCell = cells[cells.length - 1]!;

    expect(within(lastCell).getByRole("button", { name: "Delete Route 1" })).toBeInTheDocument();
  });

  it("shows no delete control for a seeded, non-custom route", () => {
    const route = makeRoute({ id: "route-1", isCustom: false, name: "Route 1" });

    renderTable({ routes: [route], encounters: [], mons: [] });

    expect(screen.queryByRole("button", { name: "Delete Route 1" })).not.toBeInTheDocument();
  });

  it("shows a log control for a not-encountered route, which calls onLogEncounter with it", async () => {
    const route = makeRoute({ id: "route-1" });
    const onLogEncounter = vi.fn();

    renderTable({ routes: [route], encounters: [], mons: [], onLogEncounter });

    await userEvent.click(screen.getByRole("button", { name: "Log encounter" }));

    expect(onLogEncounter).toHaveBeenCalledWith(route);
  });

  it.each([
    ["open" as const, [makeEncounter({ status: "open" })], []],
    ["missed" as const, [makeEncounter({ status: "missed" })], []],
    ["skipped" as const, [makeEncounter({ status: "skipped" })], []],
    [
      "caught" as const,
      [makeEncounter({ status: "caught", monId: "mon-1" })],
      [makeMon({ id: "mon-1", status: "party" })],
    ],
    [
      "dead" as const,
      [makeEncounter({ status: "caught", monId: "mon-1" })],
      [makeMon({ id: "mon-1", status: "dead" })],
    ],
  ])("shows no log control for a %s route", (_status, encounters, mons) => {
    const routes = [makeRoute({ id: "route-1" })];

    renderTable({ routes, encounters, mons });

    expect(screen.queryByRole("button", { name: "Log encounter" })).not.toBeInTheDocument();
  });

  it("opens a caught row by clicking the route name button, calling onEditMon with the route and mon", async () => {
    const route = makeRoute({ id: "route-1", name: "Route 1" });
    const encounters = [
      makeEncounter({ id: "encounter-1", routeId: "route-1", status: "caught", monId: "mon-1" }),
    ];
    const mon = makeMon({ id: "mon-1", status: "party" });
    const onEditMon = vi.fn();

    renderTable({ routes: [route], encounters, mons: [mon], onEditMon });

    await userEvent.click(screen.getByRole("button", { name: "Open Route 1" }));

    expect(onEditMon).toHaveBeenCalledWith(route, mon);
  });

  it("opens a caught row by clicking anywhere in the row", async () => {
    const route = makeRoute({ id: "route-1", name: "Route 1" });
    const encounters = [
      makeEncounter({ id: "encounter-1", routeId: "route-1", status: "caught", monId: "mon-1" }),
    ];
    const mon = makeMon({ id: "mon-1", status: "party" });
    const onEditMon = vi.fn();

    renderTable({ routes: [route], encounters, mons: [mon], onEditMon });

    await userEvent.click(screen.getAllByRole("row")[1]!);

    expect(onEditMon).toHaveBeenCalledWith(route, mon);
  });

  it("shows a name button for a dead row", () => {
    const routes = [makeRoute({ id: "route-1", name: "Route 1" })];
    const encounters = [
      makeEncounter({ id: "encounter-1", routeId: "route-1", status: "caught", monId: "mon-1" }),
    ];
    const mons = [makeMon({ id: "mon-1", status: "dead" })];

    renderTable({ routes, encounters, mons });

    expect(screen.getByRole("button", { name: "Open Route 1" })).toBeInTheDocument();
  });

  it("shows no open control for a not-encountered route, only a log control", () => {
    const routes = [makeRoute({ id: "route-1", name: "Route 1" })];

    renderTable({ routes, encounters: [], mons: [] });

    expect(screen.queryByRole("button", { name: "Open Route 1" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log Route 1" })).toBeInTheDocument();
  });

  it.each([
    ["missed" as const, [makeEncounter({ status: "missed" })], []],
    ["skipped" as const, [makeEncounter({ status: "skipped" })], []],
  ])("does nothing when a %s row is clicked", async (_status, encounters, mons) => {
    const route = makeRoute({ id: "route-1", name: "Route 1" });
    const onEditMon = vi.fn();
    const onLogEncounter = vi.fn();

    renderTable({ routes: [route], encounters, mons, onEditMon, onLogEncounter });

    expect(screen.queryByRole("button", { name: "Open Route 1" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Log Route 1" })).not.toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("row")[1]!);

    expect(onEditMon).not.toHaveBeenCalled();
    expect(onLogEncounter).not.toHaveBeenCalled();
  });

  it("clicking Reset calls onResetEncounter and not onEditMon", async () => {
    const route = makeRoute({ id: "route-1", name: "Route 1" });
    const encounters = [
      makeEncounter({ id: "encounter-1", routeId: "route-1", status: "caught", monId: "mon-1" }),
    ];
    const mon = makeMon({ id: "mon-1", status: "party" });
    const onEditMon = vi.fn();
    const onResetEncounter = vi.fn();

    renderTable({ routes: [route], encounters, mons: [mon], onEditMon, onResetEncounter });

    await userEvent.click(screen.getByRole("button", { name: "Reset Route 1" }));

    expect(onResetEncounter).toHaveBeenCalledTimes(1);
    expect(onEditMon).not.toHaveBeenCalled();
  });
});

describe("RouteTable encounter cell", () => {
  it("does not claim a missed encounter was never encountered", () => {
    const routes = [makeRoute({ id: "route-1", name: "Route 29" })];
    const encounters = [
      makeEncounter({ id: "encounter-1", routeId: "route-1", status: "missed", speciesId: null }),
    ];

    renderTable({ routes, encounters, mons: [] });

    const row = screen.getByText("Route 29").closest("tr") as HTMLElement;
    expect(within(row).getByText("missed")).toBeInTheDocument();
    expect(within(row).queryByText("not encountered")).not.toBeInTheDocument();
  });

  it("says not encountered in the encounter cell when the route has no encounter at all", () => {
    const routes = [makeRoute({ id: "route-1", name: "Route 29" })];

    renderTable({ routes, encounters: [], mons: [] });

    const row = screen.getByText("Route 29").closest("tr") as HTMLElement;
    expect(within(row).getAllByRole("cell")[1]).toHaveTextContent("not encountered yet");
  });
});
