/**
 * Covers the ARIA combobox keyboard pattern in `combobox-field.tsx`, driven through the real
 * `SpeciesPicker` so the search results are the pokedex's actual prefix matches, not a stub.
 */

import { useState } from "react";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SpeciesPicker } from "./species-picker";

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
  render(<ControlledSpeciesPicker onChange={onChange} />);
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
});
