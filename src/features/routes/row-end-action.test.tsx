import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { RouteRow } from "@/domain/route-rows";
import type { Route } from "@/domain/types";
import { makeEncounter, makeMon, makeRoute } from "@/test/factories";

import { RowEndAction } from "./row-end-action";

function renderAction(
  row: RouteRow,
  overrides: Partial<{
    removable: boolean;
    deletePending: boolean;
    onReset: (row: RouteRow) => void;
    onDelete: (route: Route) => void;
  }> = {},
) {
  return render(
    <RowEndAction
      row={row}
      removable={overrides.removable ?? false}
      deletePending={overrides.deletePending ?? false}
      onReset={overrides.onReset ?? vi.fn()}
      onDelete={overrides.onDelete ?? vi.fn()}
    />,
  );
}

describe("RowEndAction", () => {
  it.each([
    ["caught" as const, "party" as const],
    ["dead" as const, "dead" as const],
    ["missed" as const, null],
    ["skipped" as const, null],
  ])("shows Reset for a %s row, which calls onReset with the row", async (status, monStatus) => {
    const route = makeRoute({ id: "route-1", name: "Route 30" });
    const mon = monStatus === null ? null : makeMon({ id: "mon-1", status: monStatus });
    const row: RouteRow = {
      route,
      encounter: makeEncounter({ status: status === "dead" ? "caught" : status }),
      mon,
      status,
    };
    const onReset = vi.fn();
    const onDelete = vi.fn();

    renderAction(row, { onReset, onDelete });

    const button = screen.getByRole("button", { name: "Reset Route 30" });
    await userEvent.click(button);

    expect(onReset).toHaveBeenCalledWith(row);
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Delete Route 30" })).not.toBeInTheDocument();
  });

  it("shows Delete for a not-encountered custom route with no encounter, disabled while pending", () => {
    const route = makeRoute({ id: "route-1", name: "Route 30", isCustom: true });
    const row: RouteRow = { route, encounter: null, mon: null, status: "not-encountered" };
    const onDelete = vi.fn();

    renderAction(row, { removable: true, deletePending: true, onDelete });

    const button = screen.getByRole("button", { name: "Delete Route 30" });
    expect(button).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Reset Route 30" })).not.toBeInTheDocument();
  });

  it("calls onDelete from Delete when not pending", async () => {
    const route = makeRoute({ id: "route-1", name: "Route 30", isCustom: true });
    const row: RouteRow = { route, encounter: null, mon: null, status: "not-encountered" };
    const onDelete = vi.fn();
    const onReset = vi.fn();

    renderAction(row, { removable: true, deletePending: false, onDelete, onReset });

    await userEvent.click(screen.getByRole("button", { name: "Delete Route 30" }));

    expect(onDelete).toHaveBeenCalledWith(route);
    expect(onReset).not.toHaveBeenCalled();
  });

  it("renders nothing for a not-encountered seeded route", () => {
    const route = makeRoute({ id: "route-1", name: "Route 30", isCustom: false });
    const row: RouteRow = { route, encounter: null, mon: null, status: "not-encountered" };

    renderAction(row, { removable: false });

    expect(screen.queryByRole("button", { name: "Reset Route 30" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete Route 30" })).not.toBeInTheDocument();
  });

  it("renders nothing for an open row", () => {
    const route = makeRoute({ id: "route-1", name: "Route 30" });
    const row: RouteRow = {
      route,
      encounter: makeEncounter({ status: "open" }),
      mon: null,
      status: "open",
    };

    renderAction(row, { removable: false });

    expect(screen.queryByRole("button", { name: "Reset Route 30" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete Route 30" })).not.toBeInTheDocument();
  });
});
