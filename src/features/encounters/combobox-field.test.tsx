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
import { defaultPokeApiRoutes, STUB_PENDING, stubPokeApi } from "@/test/pokeapi-fetch";
import { speciesIndexFixture } from "@/test/pokeapi-fixtures";

import { ComboboxField, type ComboboxItem } from "./combobox-field";
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

  it("selects a regional form from its typed display name on blur", async () => {
    const user = userEvent.setup();
    const { onChange, input } = renderPicker();

    await user.type(input, "Alolan Sandshrew");
    expect(onChange).not.toHaveBeenCalled();
    await user.tab();

    expect(onChange).toHaveBeenLastCalledWith("sandshrew-alola");
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

  it("opens no listbox and hides nothing else when typed text matches no result", async () => {
    const onChange = vi.fn();
    render(
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

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(document.querySelector("[data-base-ui-inert]")).toBeNull();
  });

  it("opens the list on click when the field already holds a value", async () => {
    const user = userEvent.setup();
    const items = [{ id: "pidgey", label: "Pidgey" }];
    render(
      <ComboboxField
        id="f"
        value="pidgey"
        onChange={vi.fn()}
        search={() => items}
        resolve={() => "pidgey"}
        displayName={() => "Pidgey"}
      />,
    );

    await user.click(screen.getByRole("combobox"));

    const option = await screen.findByRole("option", { name: "Pidgey" });
    expect(option).toHaveClass("font-medium");
  });

  it("opens the list on ArrowDown when the field already holds a value", async () => {
    const user = userEvent.setup();
    const items = [{ id: "pidgey", label: "Pidgey" }];
    render(
      <ComboboxField
        id="f"
        value="pidgey"
        onChange={vi.fn()}
        search={() => items}
        resolve={() => "pidgey"}
        displayName={() => "Pidgey"}
      />,
    );

    await user.tab();
    expect(screen.getByRole("combobox")).toHaveFocus();
    await user.keyboard("{ArrowDown}");

    expect(await screen.findByRole("listbox")).toBeInTheDocument();
  });

  it("ties the loading notice to the input via aria-describedby", () => {
    stubPokeApi({ "/pokemon?limit=100000": STUB_PENDING });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ControlledSpeciesPicker onChange={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.getByRole("combobox")).toHaveAccessibleDescription(/Loading Pokémon/);
  });
});

const ACID_ITEMS: ComboboxItem[] = [
  { id: "acid", label: "Acid" },
  { id: "acid-spray", label: "Acid Spray" },
];

function ChosenField({
  onChange,
  initial = "",
}: {
  onChange: (id: string) => void;
  initial?: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <ComboboxField
      id="acid"
      value={value}
      onChange={(id) => {
        setValue(id);
        onChange(id);
      }}
      search={(query) =>
        ACID_ITEMS.filter((item) => item.label.toLowerCase().startsWith(query.toLowerCase()))
      }
      resolve={(text) =>
        ACID_ITEMS.find((item) => item.label.toLowerCase() === text.toLowerCase())?.id ?? ""
      }
      displayName={(id) => ACID_ITEMS.find((item) => item.id === id)?.label ?? id}
    />
  );
}

describe("ComboboxField picking", () => {
  it("chooses nothing while a name is typed, so Acid does not beat Acid Spray", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ChosenField onChange={onChange} />);
    const input = screen.getByRole("combobox");

    await user.type(input, "Acid");
    expect(onChange).not.toHaveBeenCalledWith("acid");

    await user.type(input, " Spray");
    await user.click(await screen.findByRole("option", { name: "Acid Spray" }));

    expect(onChange).not.toHaveBeenCalledWith("acid");
    expect(onChange).toHaveBeenLastCalledWith("acid-spray");
    expect(input).toHaveValue("Acid Spray");
  });

  it("does not pick Acid on Enter while no row is highlighted", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ChosenField onChange={onChange} />);

    await user.type(screen.getByRole("combobox"), "Acid");
    await screen.findByRole("listbox");
    await user.keyboard("{Enter}");

    expect(onChange).not.toHaveBeenCalledWith("acid");
  });

  it("picks Acid on Enter when it is the highlighted row", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ChosenField onChange={onChange} />);

    await user.type(screen.getByRole("combobox"), "Acid");
    await screen.findByRole("listbox");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenLastCalledWith("acid");
  });

  it("commits an exact match when the field loses focus", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ChosenField onChange={onChange} />);

    await user.type(screen.getByRole("combobox"), "acid spray");
    expect(onChange).not.toHaveBeenCalled();
    await user.tab();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("acid-spray");
  });

  it("commits nothing on blur when the text matches no option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ChosenField onChange={onChange} />);

    await user.type(screen.getByRole("combobox"), "Acid Sp");
    await user.tab();

    expect(onChange).not.toHaveBeenCalled();
  });

  it("clears an existing value when its text is edited", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ChosenField onChange={onChange} initial="acid" />);

    await user.type(screen.getByRole("combobox"), " Spray");

    expect(onChange).toHaveBeenCalledWith("");
    expect(onChange).not.toHaveBeenCalledWith("acid-spray");
  });

  it("does not re-commit a value picked by click when the field then blurs", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ChosenField onChange={onChange} />);

    await user.type(screen.getByRole("combobox"), "Acid");
    await user.click(await screen.findByRole("option", { name: "Acid Spray" }));
    await user.tab();

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe("ComboboxField empty query", () => {
  function renderField(showAllOnEmpty?: boolean) {
    render(
      <ComboboxField
        id="acid"
        value=""
        onChange={() => undefined}
        search={() => ACID_ITEMS}
        resolve={() => ""}
        displayName={(id) => id}
        showAllOnEmpty={showAllOnEmpty}
      />,
    );
    return screen.getByRole("combobox");
  }

  it("lists nothing for an empty field by default", async () => {
    const user = userEvent.setup();
    await user.click(renderField());

    expect(screen.queryAllByRole("option")).toEqual([]);
  });

  it("lists every item for an empty field when asked to", async () => {
    const user = userEvent.setup();
    await user.click(renderField(true));

    expect(await screen.findAllByRole("option")).toHaveLength(ACID_ITEMS.length);
  });
});
