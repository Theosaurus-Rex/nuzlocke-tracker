/**
 * Covers `route-card-list.tsx` in isolation, built directly from `buildRouteRows` fixtures rather
 * than through the storage layer, so each case can hand-pick the exact combination of route,
 * encounter and mon it needs.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { buildRouteRows } from "@/domain/route-rows";
import type { Encounter, Mon, Route } from "@/domain/types";

import { RouteCardList } from "./route-card-list";

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

function renderCards(input: {
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
      <RouteCardList
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

describe("RouteCardList", () => {
  it("renders one card per route, in the order rows arrives rather than route order", () => {
    const routes = [
      makeRoute({ id: "route-1", name: "Route 30", order: 600 }),
      makeRoute({ id: "route-2", name: "New Bark Town", order: 200 }),
      makeRoute({ id: "route-3", name: "Route 29", order: 300 }),
    ];

    renderCards({ routes, encounters: [], mons: [] });

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Route 30");
    expect(items[1]).toHaveTextContent("New Bark Town");
    expect(items[2]).toHaveTextContent("Route 29");
  });

  it.each([
    ["not-encountered" as const, "log", []],
    ["open" as const, "open", [makeEncounter({ status: "open" })]],
    ["missed" as const, "missed", [makeEncounter({ status: "missed" })]],
    ["skipped" as const, "skipped", [makeEncounter({ status: "skipped" })]],
  ])("renders the %s status label", (_status, label, encounters) => {
    const routes = [makeRoute({ id: "route-1", name: "Route 1" })];

    renderCards({ routes, encounters, mons: [] });

    const item = screen.getByRole("listitem");
    expect(within(item).getAllByText(new RegExp(label, "i")).length).toBeGreaterThan(0);
  });

  it("shows a living catch's level rather than the word caught", () => {
    const routes = [makeRoute({ id: "route-1" })];
    const encounters = [
      makeEncounter({ id: "encounter-1", routeId: "route-1", status: "caught", monId: "mon-1" }),
    ];
    const mons = [makeMon({ id: "mon-1", status: "party", level: 22 })];

    renderCards({ routes, encounters, mons });

    const subtitle = screen.getByRole("listitem").querySelector("p");
    expect(subtitle).toHaveTextContent("L22");
    expect(subtitle).not.toHaveTextContent("caught");
    expect(subtitle).not.toHaveTextContent("dead");
  });

  it("shows the level the mon is now, not the level it was caught at", () => {
    const routes = [makeRoute({ id: "route-1" })];
    const encounters = [
      makeEncounter({ id: "encounter-1", routeId: "route-1", status: "caught", monId: "mon-1" }),
    ];
    const mons = [makeMon({ id: "mon-1", status: "party", level: 22, levelCaught: 5 })];

    renderCards({ routes, encounters, mons });

    const subtitle = screen.getByRole("listitem").querySelector("p");
    expect(subtitle).toHaveTextContent("L22");
    expect(subtitle).not.toHaveTextContent("L5");
  });

  it("shows the fainted chip, not caught, for a caught encounter whose mon has died", () => {
    const routes = [makeRoute({ id: "route-1" })];
    const encounters = [
      makeEncounter({ id: "encounter-1", routeId: "route-1", status: "caught", monId: "mon-1" }),
    ];
    const mons = [makeMon({ id: "mon-1", status: "dead", level: 6 })];

    // The fixture's own encounter status is "caught": only the mon's death flips the chip, so a
    // naive render of `encounter.status` would show "party" here and this assertion would fail.
    expect(encounters[0]?.status).toBe("caught");

    renderCards({ routes, encounters, mons });

    const item = screen.getByRole("listitem");
    expect(item).toHaveTextContent("fainted");
    expect(item).not.toHaveTextContent("party");
    expect(item).not.toHaveTextContent("boxed");

    // The mon's info is still known even though it died, so the subtitle shows its level, the
    // same as a living catch, rather than the word "dead": the chip is what carries that.
    const subtitle = item.querySelector("p");
    expect(subtitle).toHaveTextContent("L6");
  });

  it("shows the species display name and nickname for a caught mon", () => {
    const routes = [makeRoute({ id: "route-1" })];
    const encounters = [
      makeEncounter({ id: "encounter-1", routeId: "route-1", status: "caught", monId: "mon-1" }),
    ];
    const mons = [makeMon({ id: "mon-1", speciesId: "chikorita", nickname: "Scout" })];

    renderCards({ routes, encounters, mons });

    const item = screen.getByRole("listitem");
    expect(within(item).getByText("Chikorita")).toBeInTheDocument();
    expect(item.textContent).toContain("“Scout”");
  });

  it("exposes a delete control for a deletable custom route", async () => {
    const route = makeRoute({ id: "route-1", isCustom: true });
    const onDelete = vi.fn();

    renderCards({ routes: [route], encounters: [], mons: [], onDelete });

    await userEvent.click(screen.getByRole("button", { name: `Delete ${route.name}` }));

    expect(onDelete).toHaveBeenCalledWith(route);
  });

  it("puts the end icon after the badges in DOM order", () => {
    const route = makeRoute({ id: "route-1", isCustom: true, name: "Route 1" });

    renderCards({ routes: [route], encounters: [], mons: [] });

    const trigger = screen.getByRole("button", { name: "Delete Route 1" });
    const buttons = within(screen.getByRole("listitem")).getAllByRole("button");

    expect(buttons[buttons.length - 1]).toBe(trigger);
  });

  it("shows no delete control for a seeded, non-custom route", () => {
    const route = makeRoute({ id: "route-1", isCustom: false });

    renderCards({ routes: [route], encounters: [], mons: [] });

    expect(screen.queryByRole("button", { name: `Delete ${route.name}` })).not.toBeInTheDocument();
  });

  it("shows a log control for a not-encountered route, which calls onLogEncounter with it", async () => {
    const route = makeRoute({ id: "route-1" });
    const onLogEncounter = vi.fn();

    renderCards({ routes: [route], encounters: [], mons: [], onLogEncounter });

    await userEvent.click(screen.getByRole("button", { name: "Log encounter" }));

    expect(onLogEncounter).toHaveBeenCalledWith(route);
    expect(onLogEncounter).toHaveBeenCalledTimes(1);
  });

  it("logs a not-encountered route exactly once when the name button is clicked", async () => {
    const route = makeRoute({ id: "route-1", name: "Route 1" });
    const onLogEncounter = vi.fn();

    renderCards({ routes: [route], encounters: [], mons: [], onLogEncounter });

    await userEvent.click(screen.getByRole("button", { name: "Log Route 1" }));

    expect(onLogEncounter).toHaveBeenCalledWith(route);
    expect(onLogEncounter).toHaveBeenCalledTimes(1);
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

    renderCards({ routes, encounters, mons });

    expect(screen.queryByRole("button", { name: "Log encounter" })).not.toBeInTheDocument();
  });

  it.each([
    ["caught" as const, "party" as const],
    ["dead" as const, "dead" as const],
  ])(
    "opens a %s row by clicking the route name button, calling onEditMon with the route and mon",
    async (_status, monStatus) => {
      const route = makeRoute({ id: "route-1", name: "Route 1" });
      const encounters = [
        makeEncounter({ id: "encounter-1", routeId: "route-1", status: "caught", monId: "mon-1" }),
      ];
      const mon = makeMon({ id: "mon-1", status: monStatus });
      const onEditMon = vi.fn();

      renderCards({ routes: [route], encounters, mons: [mon], onEditMon });

      await userEvent.click(screen.getByRole("button", { name: "Open Route 1" }));

      expect(onEditMon).toHaveBeenCalledWith(route, mon);
    },
  );

  it.each([
    ["caught" as const, "party" as const],
    ["dead" as const, "dead" as const],
  ])("opens a %s row by clicking anywhere in the card", async (_status, monStatus) => {
    const route = makeRoute({ id: "route-1", name: "Route 1" });
    const encounters = [
      makeEncounter({ id: "encounter-1", routeId: "route-1", status: "caught", monId: "mon-1" }),
    ];
    const mon = makeMon({ id: "mon-1", status: monStatus });
    const onEditMon = vi.fn();

    renderCards({ routes: [route], encounters, mons: [mon], onEditMon });

    await userEvent.click(screen.getByRole("listitem"));

    expect(onEditMon).toHaveBeenCalledWith(route, mon);
  });

  it("shows a name button for a dead row", () => {
    const routes = [makeRoute({ id: "route-1", name: "Route 1" })];
    const encounters = [
      makeEncounter({ id: "encounter-1", routeId: "route-1", status: "caught", monId: "mon-1" }),
    ];
    const mons = [makeMon({ id: "mon-1", status: "dead" })];

    renderCards({ routes, encounters, mons });

    expect(screen.getByRole("button", { name: "Open Route 1" })).toBeInTheDocument();
  });

  it("shows no open control for a not-encountered route, only a log control", () => {
    const routes = [makeRoute({ id: "route-1", name: "Route 1" })];

    renderCards({ routes, encounters: [], mons: [] });

    expect(screen.queryByRole("button", { name: "Open Route 1" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log Route 1" })).toBeInTheDocument();
  });

  it.each([
    ["missed" as const, [makeEncounter({ status: "missed" })], []],
    ["skipped" as const, [makeEncounter({ status: "skipped" })], []],
  ])("does nothing when a %s card is clicked", async (_status, encounters, mons) => {
    const route = makeRoute({ id: "route-1", name: "Route 1" });
    const onEditMon = vi.fn();
    const onLogEncounter = vi.fn();

    renderCards({ routes: [route], encounters, mons, onEditMon, onLogEncounter });

    expect(screen.queryByRole("button", { name: "Open Route 1" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Log Route 1" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("listitem"));

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

    renderCards({ routes: [route], encounters, mons: [mon], onEditMon, onResetEncounter });

    await userEvent.click(screen.getByRole("button", { name: "Reset Route 1" }));

    expect(onResetEncounter).toHaveBeenCalledTimes(1);
    expect(onEditMon).not.toHaveBeenCalled();
  });
});
