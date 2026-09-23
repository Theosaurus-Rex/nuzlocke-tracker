import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PokeApiNotice } from "./pokeapi-notice";

describe("PokeApiNotice", () => {
  it("shows the loading text while a failed query is being retried", () => {
    const query = { isPending: false, isFetching: true, isError: true, refetch: vi.fn() };
    render(<PokeApiNotice id="notice" query={query} loadingText="Loading Pokémon…" />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading Pokémon…");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the retry error once the retry has settled and failed again", () => {
    const query = { isPending: false, isFetching: false, isError: true, refetch: vi.fn() };
    render(<PokeApiNotice id="notice" query={query} loadingText="Loading Pokémon…" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't reach PokéAPI.");
  });
});
