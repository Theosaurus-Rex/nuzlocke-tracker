/**
 * Covers `moveset-field.tsx`: the four fixed slots, filling and removing moves, and the
 * selection-only picker behaviour it shares with `SpeciesPicker` via `ComboboxField`.
 */

import { useState } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POKEAPI_BASE } from "@/game/pokeapi/client";
import type { RawIndex } from "@/game/pokeapi/map";
import { defaultPokeApiRoutes, stubPokeApi } from "@/test/pokeapi-fetch";
import { moveIndexFixture } from "@/test/pokeapi-fixtures";

import { MovesetField } from "./moveset-field";

const EXTRA_MOVES = [
  { name: "growl", url: `${POKEAPI_BASE}/move/45/` },
  { name: "growth", url: `${POKEAPI_BASE}/move/74/` },
  { name: "razor-leaf", url: `${POKEAPI_BASE}/move/75/` },
];

const EXTENDED_MOVE_INDEX: RawIndex = {
  results: [...moveIndexFixture.results, ...EXTRA_MOVES],
};

beforeEach(() => {
  stubPokeApi({ ...defaultPokeApiRoutes, "/move?limit=100000": EXTENDED_MOVE_INDEX });
});

function StatefulMovesetField({
  initial,
  onChange,
}: {
  initial: string[];
  onChange?: (moves: string[]) => void;
}) {
  const [moves, setMoves] = useState(initial);
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <MovesetField
        id="moves"
        value={moves}
        onChange={(next) => {
          setMoves(next);
          onChange?.(next);
        }}
      />
    </QueryClientProvider>
  );
}

function pickers(): HTMLElement[] {
  return screen.queryAllByPlaceholderText("+ move");
}

describe("MovesetField", () => {
  it("shows four empty pickers when there are no moves", () => {
    render(<StatefulMovesetField initial={[]} />);
    expect(pickers()).toHaveLength(4);
  });

  it("shows a filled slot's move name and a remove control, alongside the remaining pickers", () => {
    render(<StatefulMovesetField initial={["tackle"]} />);

    expect(screen.getByText("Tackle")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Tackle" })).toBeInTheDocument();
    expect(pickers()).toHaveLength(3);
  });

  it("offers no picker once all four slots are filled", () => {
    render(<StatefulMovesetField initial={["tackle", "growl", "vine-whip", "razor-leaf"]} />);

    expect(pickers()).toHaveLength(0);
    expect(screen.getByText("Tackle")).toBeInTheDocument();
    expect(screen.getByText("Growl")).toBeInTheDocument();
    expect(screen.getByText("Vine Whip")).toBeInTheDocument();
    expect(screen.getByText("Razor Leaf")).toBeInTheDocument();
  });

  it("fills the first empty slot when a fully typed move name is entered", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatefulMovesetField initial={[]} onChange={onChange} />);

    const [firstPicker] = pickers();
    if (firstPicker === undefined) throw new Error("expected an empty picker");
    await user.type(firstPicker, "Tackle");

    expect(onChange).toHaveBeenCalledWith(["tackle"]);
    expect(screen.getByText("Tackle")).toBeInTheDocument();
    expect(pickers()).toHaveLength(3);
  });

  it("fills all four slots and offers no fifth picker", async () => {
    const user = userEvent.setup();
    render(<StatefulMovesetField initial={[]} />);

    await user.type(pickers()[0]!, "Tackle");
    await user.type(pickers()[0]!, "Growl");
    await user.type(pickers()[0]!, "Vine Whip");
    await user.type(pickers()[0]!, "Razor Leaf");

    expect(pickers()).toHaveLength(0);
    expect(screen.getByText("Tackle")).toBeInTheDocument();
    expect(screen.getByText("Growl")).toBeInTheDocument();
    expect(screen.getByText("Vine Whip")).toBeInTheDocument();
    expect(screen.getByText("Razor Leaf")).toBeInTheDocument();
  });

  it("removing a move from the middle leaves the rest contiguous", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatefulMovesetField initial={["tackle", "growl", "vine-whip"]} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Remove Growl" }));

    expect(onChange).toHaveBeenCalledWith(["tackle", "vine-whip"]);
    expect(screen.queryByText("Growl")).not.toBeInTheDocument();
    expect(screen.getByText("Tackle")).toBeInTheDocument();
    expect(screen.getByText("Vine Whip")).toBeInTheDocument();
  });

  it("does not suggest a move that is already chosen", async () => {
    const user = userEvent.setup();
    render(<StatefulMovesetField initial={["growl"]} />);

    const [firstPicker] = pickers();
    if (firstPicker === undefined) throw new Error("expected an empty picker");
    await user.type(firstPicker, "gro");

    expect(await screen.findByRole("option", { name: "Growth" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Growl" })).not.toBeInTheDocument();
  });

  it("typing a name unknown to the pokedex sets nothing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatefulMovesetField initial={[]} onChange={onChange} />);

    const [firstPicker] = pickers();
    if (firstPicker === undefined) throw new Error("expected an empty picker");
    await user.type(firstPicker, "Not A Real Move");

    expect(onChange).not.toHaveBeenCalled();
    expect(pickers()).toHaveLength(4);
  });
});
