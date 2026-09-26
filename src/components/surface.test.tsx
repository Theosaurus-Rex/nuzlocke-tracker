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
});
