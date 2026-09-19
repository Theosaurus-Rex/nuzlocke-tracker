/**
 * Covers `route-card-list.tsx` in isolation, built directly from `buildRouteRows` fixtures rather
 * than through the storage layer, so each case can hand-pick the exact combination of route,
 * encounter and mon it needs.
 */

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

function renderCards(input: {
  routes: Route[];
  encounters: Encounter[];
  mons: Mon[];
  onDelete?: (route: Route) => void;
  onLogEncounter?: (route: Route) => void;
}) {
  const rows = buildRouteRows({
    routes: input.routes,
    encounters: input.encounters,
    mons: input.mons,
  });

  return render(
    <RouteCardList
      rows={rows}
      encounters={input.encounters}
      onDelete={input.onDelete ?? vi.fn()}
      deletePending={false}
      onLogEncounter={input.onLogEncounter ?? vi.fn()}
    />,
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
    ["not-encountered" as const, "not encountered", []],
    ["open" as const, "open", [makeEncounter({ status: "open" })]],
    ["missed" as const, "missed", [makeEncounter({ status: "missed" })]],
    ["skipped" as const, "skipped", [makeEncounter({ status: "skipped" })]],
  ])("renders the %s status label", (_status, label, encounters) => {
    const routes = [makeRoute({ id: "route-1", name: "Route 1" })];

    renderCards({ routes, encounters, mons: [] });

    const item = screen.getByRole("listitem");
    expect(within(item).getByText(new RegExp(label, "i"))).toBeInTheDocument();
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

  it("renders dead, not caught, for a caught encounter whose mon has died", () => {
    const routes = [makeRoute({ id: "route-1" })];
    const encounters = [
      makeEncounter({ id: "encounter-1", routeId: "route-1", status: "caught", monId: "mon-1" }),
    ];
    const mons = [makeMon({ id: "mon-1", status: "dead" })];

    // The fixture's own encounter status is "caught": only the mon's death flips the label, so a
    // naive render of `encounter.status` would show "caught" here and this assertion would fail.
    expect(encounters[0]?.status).toBe("caught");

    renderCards({ routes, encounters, mons });

    const item = screen.getByRole("listitem");
    const subtitle = item.querySelector("p");
    expect(subtitle).toHaveTextContent("dead");
    expect(subtitle).not.toHaveTextContent("caught");
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

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(onDelete).toHaveBeenCalledWith(route);
  });

  it("shows no remove control for a seeded, non-custom route", () => {
    const route = makeRoute({ id: "route-1", isCustom: false });

    renderCards({ routes: [route], encounters: [], mons: [] });

    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
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
});
