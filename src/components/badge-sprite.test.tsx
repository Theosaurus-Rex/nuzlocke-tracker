import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BadgeSprite } from "./badge-sprite";

describe("BadgeSprite", () => {
  it("points at the badge image for its number", () => {
    const { container } = render(<BadgeSprite sprite={9} size={28} />);
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/9.png",
    );
  });

  it("is hidden from assistive tech", () => {
    const img = render(<BadgeSprite sprite={9} size={28} />).container.querySelector("img");
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("aria-hidden", "true");
  });

  it("is full colour by default and flagged muted when asked", () => {
    const full = render(<BadgeSprite sprite={9} size={28} />).container.querySelector("img");
    expect(full).toHaveAttribute("data-muted", "false");
    const muted = render(<BadgeSprite sprite={9} size={28} muted />).container.querySelector("img");
    expect(muted).toHaveAttribute("data-muted", "true");
  });

  it("renders an empty box of the same size when there is no badge", () => {
    const { container } = render(<BadgeSprite sprite={null} size={28} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[data-badge-slot]")).toHaveStyle({
      width: "28px",
      height: "28px",
    });
  });

  it("keeps the empty box once the image fails to load", () => {
    const { container } = render(<BadgeSprite sprite={9} size={28} />);
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[data-badge-slot]")).toBeInTheDocument();
  });
});
