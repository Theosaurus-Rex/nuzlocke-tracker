/**
 * Covers the ARIA combobox keyboard pattern in `combobox-field.tsx`, driven through the real
 * `SpeciesPicker` so the keyboard flow runs against real prefix-match search, over a stubbed
 * PokéAPI species index.
 */

import { useState } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { POKEAPI_BASE } from "@/game/pokeapi/client";
import type { RawIndex } from "@/game/pokeapi/map";
import { defaultPokeApiRoutes, stubPokeApi } from "@/test/pokeapi-fetch";
import { speciesIndexFixture } from "@/test/pokeapi-fixtures";

import { ComboboxField } from "./combobox-field";
import { SpeciesPicker } from "./species-picker";

const EXTRA_SPECIES = [
  { name: "parasect", url: `${POKEAPI_BASE}/pokemon/47/` },
  { name: "machop", url: `${POKEAPI_BASE}/pokemon/66/` },
  { name: "machoke", url: `${POKEAPI_BASE}/pokemon/67/` },
  { name: "machamp", url: `${POKEAPI_BASE}/pokemon/68/` },
];

const EXTENDED_SPECIES_INDEX: RawIndex = {
  results: [...speciesIndexFixture.results, ...EXTRA_SPECIES],
};

function ControlledSpeciesPicker({ onChange }: { onChange: (id: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <SpeciesPicker
      id="species"
      value={value}
      onChange={(id) => {
        setValue(id);
        onChange(id);
      }}
    />
  );
}

function renderPicker() {
  const onChange = vi.fn();
  stubPokeApi({ ...defaultPokeApiRoutes, "/pokemon?limit=100000": EXTENDED_SPECIES_INDEX });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ControlledSpeciesPicker onChange={onChange} />
    </QueryClientProvider>,
  );
  return { onChange, input: screen.getByRole("combobox") };
}

describe("ComboboxField keyboard handling", () => {
  it("selects the first option on ArrowDown then Enter", async () => {
    const user = userEvent.setup();
    const { onChange, input } = renderPicker();

    await user.type(input, "mac");
    await screen.findByRole("listbox");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenLastCalledWith("machop");
    expect(input).toHaveValue("Machop");
  });

  it("selects the second option on ArrowDown, ArrowDown, Enter", async () => {
    const user = userEvent.setup();
    const { onChange, input } = renderPicker();

    await user.type(input, "mac");
    await screen.findByRole("listbox");
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenLastCalledWith("machoke");
    expect(input).toHaveValue("Machoke");
  });

  it("wraps from the first option to the last on ArrowUp, via the input in between", async () => {
    const user = userEvent.setup();
    const { onChange, input } = renderPicker();

    await user.type(input, "mac");
    await screen.findByRole("listbox");
    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant");

    // Base UI's combobox keeps the input as a stop in the loop: one ArrowUp from the first
    // option clears the highlight before a second ArrowUp reaches the last option, rather than
    // jumping straight there.
    await user.keyboard("{ArrowUp}");
    expect(input).not.toHaveAttribute("aria-activedescendant");

    await user.keyboard("{ArrowUp}");
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenLastCalledWith("machamp");
    expect(input).toHaveValue("Machamp");
  });

  it("closes the list on Escape and keeps the typed text", async () => {
    const user = userEvent.setup();
    const { input } = renderPicker();

    await user.type(input, "mac");
    await screen.findByRole("listbox");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(input).toHaveValue("mac");
  });

  it("names the active option with aria-activedescendant, absent before any arrow key", async () => {
    const user = userEvent.setup();
    const { input } = renderPicker();

    await user.type(input, "mac");
    await screen.findByRole("listbox");
    expect(input).not.toHaveAttribute("aria-activedescendant");

    await user.keyboard("{ArrowDown}");
    const activeOption = screen.getByRole("option", { name: "Machop" });
    expect(input).toHaveAttribute("aria-activedescendant", activeOption.id);
  });

  it("does nothing on Enter when no option is active", async () => {
    const user = userEvent.setup();
    const { onChange, input } = renderPicker();

    await user.type(input, "mac");
    await screen.findByRole("listbox");
    onChange.mockClear();
    await user.keyboard("{Enter}");

    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue("mac");
  });

  it("still selects an option with a mouse click", async () => {
    const user = userEvent.setup();
    const { onChange, input } = renderPicker();

    await user.type(input, "mac");
    await user.click(await screen.findByRole("option", { name: "Machoke" }));

    expect(onChange).toHaveBeenLastCalledWith("machoke");
    expect(input).toHaveValue("Machoke");
  });

  it("does not select a stale option after the query changes underneath it", async () => {
    const user = userEvent.setup();
    const { onChange, input } = renderPicker();

    await user.type(input, "mac");
    await screen.findByRole("listbox");
    await user.keyboard("{ArrowDown}{ArrowDown}");

    await user.clear(input);
    await user.type(input, "par");
    await screen.findByRole("listbox");
    await user.keyboard("{Enter}");

    expect(onChange).not.toHaveBeenCalledWith("parasect");
    expect(input).toHaveValue("par");
  });

  it("resolves text typed before the options loaded once they arrive", async () => {
    const onChange = vi.fn();
    const empty = () => "";
    const loaded = (text: string) => (text.toLowerCase() === "pidgey" ? "pidgey" : "");
    const { rerender } = render(
      <ComboboxField
        id="f"
        value=""
        onChange={onChange}
        search={() => []}
        resolve={empty}
        displayName={(id) => id}
      />,
    );
    await userEvent.type(screen.getByRole("combobox"), "Pidgey");
    expect(onChange).not.toHaveBeenCalledWith("pidgey");
    rerender(
      <ComboboxField
        id="f"
        value=""
        onChange={onChange}
        search={() => []}
        resolve={loaded}
        displayName={(id) => id}
      />,
    );
    expect(onChange).toHaveBeenLastCalledWith("pidgey");
  });

  it("never clears an existing value when the resolver changes", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ComboboxField
        id="f"
        value="pidgey"
        onChange={onChange}
        search={() => []}
        resolve={() => "pidgey"}
        displayName={(id) => id}
      />,
    );
    rerender(
      <ComboboxField
        id="f"
        value="pidgey"
        onChange={onChange}
        search={() => []}
        resolve={() => ""}
        displayName={(id) => id}
      />,
    );
    expect(onChange).not.toHaveBeenCalledWith("");
  });

  it("does not re-resolve an already-set value even when resolve starts returning something else", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ComboboxField
        id="f"
        value="pidgey"
        onChange={onChange}
        search={() => []}
        resolve={() => "pidgey"}
        displayName={(id) => id}
      />,
    );
    onChange.mockClear();
    rerender(
      <ComboboxField
        id="f"
        value="pidgey"
        onChange={onChange}
        search={() => []}
        resolve={() => "spearow"}
        displayName={(id) => id}
      />,
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not call onChange when a freshly loaded resolver still finds no match", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ComboboxField
        id="f"
        value=""
        onChange={onChange}
        search={() => []}
        resolve={() => ""}
        displayName={(id) => id}
      />,
    );
    await userEvent.type(screen.getByRole("combobox"), "zzz");
    onChange.mockClear();
    rerender(
      <ComboboxField
        id="f"
        value=""
        onChange={onChange}
        search={() => []}
        resolve={() => ""}
        displayName={(id) => id}
      />,
    );
    expect(onChange).not.toHaveBeenCalled();
  });
});
