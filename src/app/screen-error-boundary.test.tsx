import { Suspense, lazy } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ScreenErrorBoundary } from "./screen-error-boundary";

describe("ScreenErrorBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a message and a reload button when a screen's code fails to load", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const reload = vi.fn();
    const Broken = lazy(() =>
      Promise.reject(new Error("Failed to fetch dynamically imported module")),
    );

    render(
      <ScreenErrorBoundary onReload={reload}>
        <Suspense fallback="Loading…">
          <Broken />
        </Suspense>
      </ScreenErrorBoundary>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("could not load");
    await userEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(reload).toHaveBeenCalledOnce();
  });

  it("renders its children when nothing fails", () => {
    render(
      <ScreenErrorBoundary>
        <p>All good</p>
      </ScreenErrorBoundary>,
    );

    expect(screen.getByText("All good")).toBeInTheDocument();
  });
});
