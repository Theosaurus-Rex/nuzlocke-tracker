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
import { findMenuTrigger } from "@/test/pokeapi-fetch";

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
        onResetEncounter={vi.fn()}
      />
    </QueryClientProvider>,
  );
}

async function openRowActionsMenu(name: string) {
  await userEvent.click(await findMenuTrigger(`Actions for ${name}`));
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

  it("exposes a remove control for a deletable custom route", async () => {
    const route = makeRoute({ id: "route-1", isCustom: true });
    const onDelete = vi.fn();

    renderCards({ routes: [route], encounters: [], mons: [], onDelete });

    await openRowActionsMenu(route.name);
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete route" }));

    expect(onDelete).toHaveBeenCalledWith(route);
  });

  it("shows no remove control for a seeded, non-custom route", () => {
    const route = makeRoute({ id: "route-1", isCustom: false });

    renderCards({ routes: [route], encounters: [], mons: [] });

    expect(
      screen.queryByRole("button", { name: `Actions for ${route.name}` }),
    ).not.toBeInTheDocument();
  });

  it("shows a log control for a not-encountered route, which calls onLogEncounter with it", async () => {
    const route = makeRoute({ id: "route-1" });
    const onLogEncounter = vi.fn();

    renderCards({ routes: [route], encounters: [], mons: [], onLogEncounter });

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

    renderCards({ routes, encounters, mons });

    expect(screen.queryByRole("button", { name: "Log encounter" })).not.toBeInTheDocument();
  });

  it("shows an edit control for a caught row, which calls onEditMon with the route and mon", async () => {
    const route = makeRoute({ id: "route-1" });
    const encounters = [
      makeEncounter({ id: "encounter-1", routeId: "route-1", status: "caught", monId: "mon-1" }),
    ];
    const mon = makeMon({ id: "mon-1", status: "party" });
    const onEditMon = vi.fn();

    renderCards({ routes: [route], encounters, mons: [mon], onEditMon });

    await openRowActionsMenu(route.name);
    await userEvent.click(await screen.findByRole("menuitem", { name: "Edit mon" }));

    expect(onEditMon).toHaveBeenCalledWith(route, mon);
  });

  it("shows an edit control for a dead row", async () => {
    const routes = [makeRoute({ id: "route-1" })];
    const encounters = [
      makeEncounter({ id: "encounter-1", routeId: "route-1", status: "caught", monId: "mon-1" }),
    ];
    const mons = [makeMon({ id: "mon-1", status: "dead" })];

    renderCards({ routes, encounters, mons });

    await openRowActionsMenu(routes[0]!.name);
    expect(await screen.findByRole("menuitem", { name: "Edit mon" })).toBeInTheDocument();
  });

  it("shows no edit control for a not-encountered route", () => {
    const routes = [makeRoute({ id: "route-1" })];

    renderCards({ routes, encounters: [], mons: [] });

    expect(
      screen.queryByRole("button", { name: `Actions for ${routes[0]!.name}` }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["missed" as const, [makeEncounter({ status: "missed" })], []],
    ["skipped" as const, [makeEncounter({ status: "skipped" })], []],
  ])("shows no edit control for a %s route", async (_status, encounters, mons) => {
    const routes = [makeRoute({ id: "route-1" })];

    renderCards({ routes, encounters, mons });

    await openRowActionsMenu(routes[0]!.name);
    await screen.findByRole("menu");
    expect(screen.queryByRole("menuitem", { name: "Edit mon" })).not.toBeInTheDocument();
  });
});
