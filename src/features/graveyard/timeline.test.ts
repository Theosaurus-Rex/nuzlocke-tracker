import { describe, expect, it } from "vitest";

import type { Death, Route } from "@/domain/types";

import { groupDeathsByRoute } from "./timeline";

function route(id: string, order: number): Route {
  return {
    id,
    runId: "run",
    name: id,
    order,
    isCustom: false,
    gameRouteId: null,
    createdAt: "2020-01-01T00:00:00.000Z",
    updatedAt: "2020-01-01T00:00:00.000Z",
  };
}

function death(
  id: string,
  routeId: string | null,
  diedAt: string,
  createdAt = "2020-01-01T00:00:00.000Z",
): Death {
  return {
    id,
    runId: "run",
    monId: `mon-${id}`,
    level: 5,
    routeId,
    cause: { type: "other", detail: "fell" },
    diedAt,
    notes: null,
    createdAt,
    updatedAt: createdAt,
  };
}

const ROUTES = [route("a", 300), route("b", 100), route("c", 400), route("d", 200)];

describe("groupDeathsByRoute", () => {
  it("orders sections by the run's route order, not input order", () => {
    const { sections } = groupDeathsByRoute(
      [death("1", "a", "2020-01-01"), death("2", "b", "2020-01-02")],
      ROUTES,
    );

    expect(sections.map((section) => section.route.id)).toEqual(["b", "a"]);
  });

  it("counts position and total over every route, including ones with no deaths", () => {
    const { sections } = groupDeathsByRoute([death("1", "c", "2020-01-01")], ROUTES);

    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({ position: 4, total: 4 });
  });

  it("orders deaths on one route oldest first, breaking ties by createdAt", () => {
    const { sections } = groupDeathsByRoute(
      [
        death("late", "a", "2020-03-01"),
        death("tie-new", "a", "2020-02-01", "2020-05-02"),
        death("early", "a", "2020-01-01"),
        death("tie-old", "a", "2020-02-01", "2020-05-01"),
      ],
      ROUTES,
    );

    expect(sections[0]?.deaths.map((d) => d.id)).toEqual(["early", "tie-old", "tie-new", "late"]);
  });

  it("sends null-route and unknown-route deaths to unrecorded, oldest first", () => {
    const { sections, unrecorded } = groupDeathsByRoute(
      [
        death("ghost", "gone", "2020-02-01"),
        death("none", null, "2020-01-01"),
        death("real", "a", "2020-01-05"),
      ],
      ROUTES,
    );

    expect(unrecorded.map((d) => d.id)).toEqual(["none", "ghost"]);
    expect(sections.map((section) => section.deaths.map((d) => d.id))).toEqual([["real"]]);
  });

  it("returns nothing for empty input", () => {
    expect(groupDeathsByRoute([], [])).toEqual({ sections: [], unrecorded: [] });
    expect(groupDeathsByRoute([], ROUTES)).toEqual({ sections: [], unrecorded: [] });
  });
});
