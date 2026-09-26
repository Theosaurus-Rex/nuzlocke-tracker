import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Typography } from "./typography";

describe("Typography", () => {
  it("lets as set the element while variant sets the look", () => {
    render(
      <Typography as="h2" variant="eyebrow">
        Export
      </Typography>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Export" })).toBeInTheDocument();
  });

  it("gives heading a level-one heading when as is left out", () => {
    render(<Typography variant="heading">Settings</Typography>);
    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument();
  });

  it("keeps a number inline so it can sit inside a sentence", () => {
    render(<Typography variant="number">12</Typography>);
    expect(screen.getByText("12").tagName).toBe("SPAN");
  });

  it("passes htmlFor through, so a label names its control", () => {
    render(
      <>
        <Typography as="label" variant="eyebrow" htmlFor="nickname">
          Nickname
        </Typography>
        <input id="nickname" />
      </>,
    );
    expect(screen.getByLabelText("Nickname").tagName).toBe("INPUT");
  });

  it("does not let a size in className override the variant", () => {
    render(
      <Typography variant="body" className="mt-1 text-lg">
        Text
      </Typography>,
    );
    const classes = screen.getByText("Text").className.split(" ");
    expect(classes).toContain("mt-1");
    expect(classes).not.toContain("text-lg");
  });

  it("reads a sentence with a number in it as one piece of text", () => {
    render(
      <p>
        Imported <Typography variant="number">3</Typography> runs
      </p>,
    );
    expect(
      screen.getByText(
        (_, element) => element?.tagName === "P" && element.textContent === "Imported 3 runs",
      ),
    ).toBeInTheDocument();
  });

  it("rejects label-only props on elements that are not labels", () => {
    // @ts-expect-error htmlFor only exists on a label.
    render(<Typography as="p" variant="body" htmlFor="x" />);
  });
});
