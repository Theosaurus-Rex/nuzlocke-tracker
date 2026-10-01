import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BOX_SIZE } from "@/domain/box-slots";
import type { Mon } from "@/domain/types";
import { createMemoryAdapter } from "@/storage/memory-adapter";
import { StorageProvider } from "@/storage/storage-context";

import { BoxGrid } from "./box-grid";

function mon(id: string, overrides: Partial<Mon> = {}): Mon {
  return {
    id,
    runId: "run-1",
    encounterId: null,
    speciesId: "chikorita",
    speciesIdCaught: "chikorita",
    nickname: id,
    gender: null,
    level: 5,
    levelCaught: 5,
    nature: null,
    ability: null,
    heldItem: null,
    moves: [],
    status: "box",
    partySlot: null,
    boxOrder: 0,
    caughtRouteId: null,
    shiny: false,
    createdAt: "2026-09-27T00:00:00.000Z",
    updatedAt: "2026-09-27T00:00:00.000Z",
    ...overrides,
  };
}

function renderGrid(mons: Mon[], onEdit = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <StorageProvider adapter={createMemoryAdapter()}>
        <BoxGrid runId="run-1" mons={mons} onEdit={onEdit} />
      </StorageProvider>
    </QueryClientProvider>,
  );
  return onEdit;
}

function slots(): HTMLElement[] {
  return within(screen.getByRole("list", { hidden: true })).getAllByRole("listitem", {
    hidden: true,
  });
}

function slotsHolding(name: string): number[] {
  return slots().flatMap((slot, index) =>
    within(slot).queryByRole("button", { name: `Edit “${name}”` }) ? [index] : [],
  );
}

function fullBox(): Mon[] {
  return Array.from({ length: BOX_SIZE }, (_, slot) => mon(`m${slot}`, { boxOrder: slot }));
}

describe("BoxGrid", () => {
  it("always draws thirty slots", () => {
    renderGrid([mon("Sprig")]);

    expect(slots()).toHaveLength(BOX_SIZE);
  });

  it("puts each mon in its slot and leaves the gaps empty", () => {
    renderGrid([mon("Sprig", { boxOrder: 0 }), mon("Zubb", { boxOrder: 4 })]);

    expect(slotsHolding("Sprig")).toEqual([0]);
    expect(slotsHolding("Zubb")).toEqual([4]);
    expect(screen.getAllByRole("button", { name: /^Edit / })).toHaveLength(2);
    expect(slots()[2]).toHaveAttribute("aria-hidden", "true");
  });

  it("puts a mon with no slot in the first free one, in caught order", () => {
    renderGrid([
      mon("Late", { boxOrder: null, createdAt: "2026-09-27T00:00:02.000Z" }),
      mon("Early", { boxOrder: null, createdAt: "2026-09-27T00:00:01.000Z" }),
      mon("Fixed", { boxOrder: 0 }),
    ]);

    expect(slotsHolding("Fixed")).toEqual([0]);
    expect(slotsHolding("Early")).toEqual([1]);
    expect(slotsHolding("Late")).toEqual([2]);
  });

  it("counts the mons in the box out of thirty", () => {
    renderGrid([mon("a", { boxOrder: 0 }), mon("b", { boxOrder: 3 }), mon("c", { boxOrder: 9 })]);

    expect(screen.getByText("3 / 30")).toBeInTheDocument();
    expect(screen.getByText("Box 1")).toBeInTheDocument();
  });

  it("offers no box switcher while the only box has room", () => {
    renderGrid(fullBox().slice(0, BOX_SIZE - 1));

    expect(screen.queryByRole("button", { name: "Box 2" })).not.toBeInTheDocument();
  });

  it("adds a second box once the first is full and shows its mons on switching", async () => {
    const user = userEvent.setup();
    renderGrid([...fullBox(), mon("Extra", { boxOrder: BOX_SIZE + 2 })]);

    expect(screen.getByRole("button", { name: "Box 1" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("30 / 30")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit “Extra”" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Box 2" }));

    expect(screen.getByRole("button", { name: "Box 2" })).toHaveAttribute("aria-pressed", "true");
    expect(slotsHolding("Extra")).toEqual([2]);
    expect(screen.getByText("1 / 30")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit “m0”" })).not.toBeInTheDocument();
  });

  it("offers an empty extra box when the last box is exactly full", async () => {
    const user = userEvent.setup();
    renderGrid(fullBox());

    await user.click(screen.getByRole("button", { name: "Box 2" }));

    expect(screen.getByText("0 / 30")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Box 3" })).not.toBeInTheDocument();
  });

  it("reports the clicked mon", async () => {
    const user = userEvent.setup();
    const onEdit = renderGrid([mon("Sprig", { boxOrder: 5 })]);

    await user.click(screen.getByRole("button", { name: "Edit “Sprig”" }));

    expect(onEdit).toHaveBeenCalledWith("Sprig");
  });

  it("tells you how to edit and how to move", () => {
    renderGrid([mon("Sprig")]);

    expect(
      screen.getByText(
        "Tap a Pokémon to edit it. Long-press to pick it up, then drop it on any slot to move it.",
      ),
    ).toBeInTheDocument();
  });
});
