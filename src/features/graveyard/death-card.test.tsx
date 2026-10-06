import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Fragment } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Death, Mon } from "@/domain/types";
import { defaultPokeApiRoutes, stubPokeApi } from "@/test/pokeapi-fetch";

import { DeathCard, type DeathCardProps } from "./death-card";

const STAMP = "2026-09-17T00:00:00.000Z";

const mon: Mon = {
  id: "mon-1",
  runId: "run-1",
  encounterId: null,
  speciesId: "chikorita",
  speciesIdCaught: "chikorita",
  nickname: "Tumble",
  gender: null,
  level: 17,
  levelCaught: 12,
  nature: null,
  ability: null,
  heldItem: null,
  moves: [],
  status: "dead",
  partySlot: null,
  boxOrder: null,
  caughtRouteId: "route-46",
  shiny: false,
  createdAt: STAMP,
  updatedAt: STAMP,
};

const death: Death = {
  id: "death-1",
  runId: "run-1",
  monId: "mon-1",
  level: 17,
  routeId: null,
  cause: { type: "other", detail: "fell" },
  diedAt: new Date(2026, 8, 8, 21, 14).toISOString(),
  notes: null,
  createdAt: STAMP,
  updatedAt: STAMP,
};

function card(overrides: Partial<DeathCardProps> = {}) {
  return (
    <DeathCard
      death={death}
      mon={mon}
      caughtRouteName="Route 46"
      fights={[]}
      generation={4}
      onEdit={vi.fn()}
      {...overrides}
    />
  );
}

function renderCards(...cards: React.ReactNode[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ul>
        {cards.map((c, i) => (
          <Fragment key={i}>{c}</Fragment>
        ))}
      </ul>
    </QueryClientProvider>,
  );
}

const text =
  (expected: string, tag = "P") =>
  (_: string, element: Element | null) =>
    element?.tagName === tag && element.textContent === expected;

beforeEach(() => {
  stubPokeApi(defaultPokeApiRoutes);
});

describe("DeathCard", () => {
  it("starts closed with no Edit button", () => {
    renderCards(card());

    const toggle = screen.getByRole("button", { name: "Details for “Tumble”" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: /Edit death of/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Logged")).not.toBeInTheDocument();
  });

  it("opens to show where it was caught, when it was logged and Edit", async () => {
    const user = userEvent.setup();
    renderCards(card());

    await user.click(screen.getByRole("button", { name: "Details for “Tumble”" }));

    expect(screen.getByRole("button", { name: "Details for “Tumble”" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText("Caught")).toBeInTheDocument();
    expect(screen.getByText(text("Route 46 · L12", "DD"))).toBeInTheDocument();
    expect(screen.getByText("Logged")).toBeInTheDocument();
    expect(screen.getByText("08 Sep · 21:14")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit death of “Tumble”" })).toBeInTheDocument();
  });

  it("closes again on a second click", async () => {
    const user = userEvent.setup();
    renderCards(card());
    const toggle = screen.getByRole("button", { name: "Details for “Tumble”" });

    await user.click(toggle);
    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Logged")).not.toBeInTheDocument();
  });

  it("calls onEdit from the open details", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    renderCards(card({ onEdit }));

    await user.click(screen.getByRole("button", { name: "Details for “Tumble”" }));
    await user.click(screen.getByRole("button", { name: "Edit death of “Tumble”" }));

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("shows notes only when there are some", async () => {
    const user = userEvent.setup();
    renderCards(
      card({ death: { ...death, id: "a", notes: null } }),
      card({
        death: { ...death, id: "b", notes: "Rollout crit on turn 3." },
        mon: { ...mon, id: "mon-2", nickname: "Other" },
      }),
    );

    await user.click(screen.getByRole("button", { name: "Details for “Tumble”" }));
    expect(screen.queryByText("Notes")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Details for “Other”" }));
    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.getByText("Rollout crit on turn 3.")).toBeInTheDocument();
  });

  it("names the caught route on the second line", () => {
    renderCards(card());

    expect(screen.getByText(text("L17 · caught L12 on Route 46"))).toBeInTheDocument();
  });

  it("drops the route from the second line when it is unknown", async () => {
    const user = userEvent.setup();
    renderCards(card({ caughtRouteName: null }));

    expect(screen.getByText(text("L17 · caught L12"))).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Details for “Tumble”" }));
    expect(screen.getByText(text("Unknown route · L12", "DD"))).toBeInTheDocument();
  });

  it("shows the death date on the closed card", () => {
    renderCards(card());

    expect(screen.getByText("08 SEP")).toBeInTheDocument();
  });

  it("opens each card on its own", async () => {
    const user = userEvent.setup();
    renderCards(
      card({ death: { ...death, id: "a" } }),
      card({ death: { ...death, id: "b" }, mon: { ...mon, id: "mon-2", nickname: "Other" } }),
    );

    await user.click(screen.getByRole("button", { name: "Details for “Tumble”" }));

    expect(screen.getByRole("button", { name: "Details for “Tumble”" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("button", { name: "Details for “Other”" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getAllByText("Logged")).toHaveLength(1);
  });
});
