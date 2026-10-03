import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_RULES } from "@/domain/rules";

import { RulesSummary } from "./rules-summary";

const OFF = {
  ...DEFAULT_RULES,
  dupesClause: false,
  shinyClause: false,
  nicknamesRequired: false,
  levelCaps: false,
  setMode: false,
  hardcore: false,
  randomiser: { ...DEFAULT_RULES.randomiser, enabled: false },
};

describe("RulesSummary", () => {
  it("renders nothing when no rule is on and there is no custom clause", () => {
    const { container } = render(
      <RulesSummary rules={{ ...OFF, customClause: null }} levelCap={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the custom clause text", () => {
    render(<RulesSummary rules={{ ...OFF, customClause: "No Pokecentre" }} levelCap={null} />);
    expect(screen.getByText("No Pokecentre")).toBeInTheDocument();
  });

  it("lists active rules under an accessible name", () => {
    render(<RulesSummary rules={{ ...OFF, dupesClause: true }} levelCap={null} />);
    expect(screen.getByRole("list", { name: "Active rules" })).toHaveTextContent("Dupes");
  });
});
