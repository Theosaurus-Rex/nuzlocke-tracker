import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ScreenHeader } from "./screen-header";

describe("ScreenHeader", () => {
  it("names the screen with its one level-one heading", () => {
    render(<ScreenHeader title="Runs" actions={<button>New run</button>} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Runs");
    expect(screen.getByRole("button", { name: "New run" })).toBeInTheDocument();
  });
});
