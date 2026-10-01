import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Surface } from "./surface";

describe("Surface", () => {
  it("passes role and element through", () => {
    render(
      <ul>
        <Surface as="li" role="alert">
          Gone
        </Surface>
      </ul>,
    );
    expect(screen.getByRole("alert").tagName).toBe("LI");
  });

  it("draws an alert surface differently from a card", () => {
    render(
      <>
        <Surface>Card</Surface>
        <Surface tone="alert">Alert</Surface>
      </>,
    );
    expect(screen.getByText("Alert").className).not.toBe(screen.getByText("Card").className);
  });

  it("lets a caller's shadow class override the tone's shadow", () => {
    render(<Surface className="shadow-block-alert">Card</Surface>);
    const classes = screen.getByText("Card").classList;
    expect(classes).toContain("shadow-block-alert");
    expect(classes).not.toContain("shadow-block");
  });
});
