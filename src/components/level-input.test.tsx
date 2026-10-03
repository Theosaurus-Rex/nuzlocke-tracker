import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { LevelInput } from "./level-input";

function Harness() {
  const [value, setValue] = useState("");
  return <LevelInput aria-label="Level" value={value} onValueChange={setValue} />;
}

describe("LevelInput", () => {
  it("drops letters, signs and exponents as they are typed", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByLabelText("Level");

    await user.type(input, "1a2");
    expect(input).toHaveValue("12");

    await user.clear(input);
    await user.type(input, "-5");
    expect(input).toHaveValue("5");
  });

  it("strips a pasted value", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByLabelText("Level");

    await user.click(input);
    await user.paste("1e2");

    expect(input).toHaveValue("12");
  });

  it("stops at three characters", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByLabelText("Level");

    await user.type(input, "12345");

    expect(input).toHaveValue("123");
  });

  it("asks for the numeric keyboard and turns off autocomplete", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Level");

    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("autocomplete", "off");
    expect(input).not.toHaveAttribute("type", "number");
  });
});
