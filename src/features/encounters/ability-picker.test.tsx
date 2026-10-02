import { useState } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { defaultPokeApiRoutes, STUB_NETWORK_ERROR, stubPokeApi } from "@/test/pokeapi-fetch";

import { AbilityPicker } from "./ability-picker";

function StatefulPicker({ onChange }: { onChange?: (id: string) => void }) {
  const [value, setValue] = useState("");
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <AbilityPicker
        id="ability"
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange?.(next);
        }}
      />
    </QueryClientProvider>
  );
}

describe("AbilityPicker", () => {
  it("filters the list as the user types", async () => {
    const user = userEvent.setup();
    render(<StatefulPicker />);

    await user.type(screen.getByRole("combobox"), "wa");

    expect(await screen.findByRole("option", { name: "Water Absorb" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Overgrow" })).not.toBeInTheDocument();
  });

  it("counts a fully typed name as choosing it", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatefulPicker onChange={onChange} />);

    await user.type(screen.getByRole("combobox"), "Water Absorb");

    expect(onChange).toHaveBeenLastCalledWith("water-absorb");
  });

  it("leaves the field unset for a name PokéAPI does not know", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatefulPicker onChange={onChange} />);

    const input = screen.getByRole("combobox");
    await user.type(input, "wa");
    await screen.findByRole("option", { name: "Water Absorb" });
    await user.clear(input);
    onChange.mockClear();
    await user.type(input, "Gooey Typo");

    expect(onChange).not.toHaveBeenCalledWith(expect.stringMatching(/.+/));
  });

  it("shows the offline notice when the list cannot load", async () => {
    stubPokeApi({ ...defaultPokeApiRoutes, "/ability?limit=100000": STUB_NETWORK_ERROR });
    render(<StatefulPicker />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't reach PokéAPI");
  });
});
