import { useState } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { defaultPokeApiRoutes, STUB_NETWORK_ERROR, stubPokeApi } from "@/test/pokeapi-fetch";

import { ItemPicker } from "./item-picker";

function StatefulPicker({ onChange }: { onChange?: (id: string) => void }) {
  const [value, setValue] = useState("");
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <ItemPicker
        id="item"
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange?.(next);
        }}
      />
    </QueryClientProvider>
  );
}

describe("ItemPicker", () => {
  it("filters the list as the user types", async () => {
    const user = userEvent.setup();
    render(<StatefulPicker />);

    await user.type(screen.getByRole("combobox"), "mi");

    expect(await screen.findByRole("option", { name: "Miracle Seed" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Quick Claw" })).not.toBeInTheDocument();
  });

  it("shows an item the way the game spells it", async () => {
    const user = userEvent.setup();
    render(<StatefulPicker />);

    await user.type(screen.getByRole("combobox"), "ki");

    expect(await screen.findByRole("option", { name: "King’s Rock" })).toBeInTheDocument();
  });

  it("counts a fully typed name as choosing it", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatefulPicker onChange={onChange} />);

    await user.type(screen.getByRole("combobox"), "Miracle Seed");

    expect(onChange).toHaveBeenLastCalledWith("miracle-seed");
  });

  it("leaves the field unset for a name PokéAPI does not know", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatefulPicker onChange={onChange} />);

    const input = screen.getByRole("combobox");
    await user.type(input, "mi");
    await screen.findByRole("option", { name: "Miracle Seed" });
    await user.clear(input);
    onChange.mockClear();
    await user.type(input, "Gooey Typo");

    expect(onChange).not.toHaveBeenCalledWith(expect.stringMatching(/.+/));
  });

  it("shows the offline notice when the list cannot load", async () => {
    stubPokeApi({ ...defaultPokeApiRoutes, "/item?limit=100000": STUB_NETWORK_ERROR });
    render(<StatefulPicker />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't reach PokéAPI");
  });

  it("shows the item sprite on each option", async () => {
    const user = userEvent.setup();
    render(<StatefulPicker />);

    await user.type(screen.getByRole("combobox"), "mi");

    const option = await screen.findByRole("option", { name: "Miracle Seed" });
    expect(
      option.querySelector(
        'img[src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/miracle-seed.png"]',
      ),
    ).not.toBeNull();
  });
});
