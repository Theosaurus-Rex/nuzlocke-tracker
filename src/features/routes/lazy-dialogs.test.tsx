import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { RouteRow } from "@/domain/route-rows";

import { DialogLoader, ResetEncounterDialog } from "./lazy-dialogs";

vi.mock("./reset-encounter-dialog", () => {
  throw new Error("Failed to fetch dynamically imported module");
});

describe("DialogLoader", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("offers a reload when a dialog's code fails to load", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <DialogLoader>
        <ResetEncounterDialog row={{} as RouteRow} onClose={() => undefined} />
      </DialogLoader>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("could not load");
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
  });
});
