import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ItemSprite } from "./item-sprite";

const MIRACLE_SEED =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/miracle-seed.png";

describe("ItemSprite", () => {
  it("points at the sprite for a PokéAPI name", () => {
    const { container } = render(<ItemSprite item="miracle-seed" />);
    expect(container.querySelector("img")).toHaveAttribute("src", MIRACLE_SEED);
  });

  it("is hidden from assistive tech", () => {
    const { container } = render(<ItemSprite item="miracle-seed" />);
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("aria-hidden", "true");
  });

  it("renders nothing once the image fails to load", () => {
    const { container } = render(<ItemSprite item="miracle-seed" />);
    fireEvent.error(container.querySelector("img")!);
    expect(container).toBeEmptyDOMElement();
  });
});
