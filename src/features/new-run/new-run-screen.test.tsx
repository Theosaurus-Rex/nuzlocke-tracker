/**
 * Covers `new-run-screen.tsx` (PER-16): the empty/whitespace-name guard, trimming, the game
 * picker's options coming from `GAMES` rather than a hard-coded list, the redirect to the new
 * run's own screen on success, and the cancel link.
 *
 * Routing is driven with `createMemoryRouter` (matching `app-shell.test.tsx`'s approach) over a
 * small route table of this screen's own neighbours, rather than the app's full `appRoutes` —
 * this file only needs to prove where `NewRunScreen` navigates to, not the whole shell.
 */

import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider, useParams } from "react-router";

import type { StorageAdapter } from "@/storage/adapter";
import { createMemoryAdapter } from "@/storage/memory-adapter";
import { StorageProvider } from "@/storage/storage-context";
import { GAMES } from "@/game/registry";

import { NewRunScreen } from "./new-run-screen";

function RunRoutesPlaceholder(): ReactNode {
  const { runId } = useParams<{ runId: string }>();
  return <p>Routes for run {runId}</p>;
}

function RunListPlaceholder(): ReactNode {
  return <p>Run list</p>;
}

function renderScreen(adapter: StorageAdapter) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path: "/", element: <RunListPlaceholder /> },
      { path: "/runs/new", element: <NewRunScreen /> },
      { path: "/runs/:runId/routes", element: <RunRoutesPlaceholder /> },
    ],
    { initialEntries: ["/runs/new"] },
  );

  render(
    <QueryClientProvider client={queryClient}>
      <StorageProvider adapter={adapter}>
        <RouterProvider router={router} />
      </StorageProvider>
    </QueryClientProvider>,
  );

  return { router };
}

describe("NewRunScreen", () => {
  it("rejects an empty name: shows a validation message tied to the field, and writes nothing", async () => {
    const adapter = createMemoryAdapter();
    renderScreen(adapter);

    await userEvent.click(screen.getByRole("button", { name: "Create run" }));

    const nameInput = screen.getByLabelText("Name");
    const error = await screen.findByText("Name is required.");
    expect(nameInput).toHaveAttribute("aria-describedby", error.id);
    expect(nameInput).toHaveAttribute("aria-invalid", "true");

    expect(await adapter.runs.getAll()).toEqual([]);
  });

  it("rejects a whitespace-only name, and writes nothing", async () => {
    const adapter = createMemoryAdapter();
    renderScreen(adapter);

    await userEvent.type(screen.getByLabelText("Name"), "   ");
    await userEvent.click(screen.getByRole("button", { name: "Create run" }));

    expect(await screen.findByText("Name is required.")).toBeInTheDocument();
    expect(await adapter.runs.getAll()).toEqual([]);
  });

  it("trims the name before saving", async () => {
    const adapter = createMemoryAdapter();
    renderScreen(adapter);

    await userEvent.type(screen.getByLabelText("Name"), "  Test Run  ");
    await userEvent.click(screen.getByRole("button", { name: "Create run" }));

    await waitFor(async () => {
      expect(await adapter.runs.getAll()).toHaveLength(1);
    });
    const [run] = await adapter.runs.getAll();
    expect(run?.name).toBe("Test Run");
  });

  it("populates the game picker from the GAMES registry, labelled and pre-selected", () => {
    const adapter = createMemoryAdapter();
    renderScreen(adapter);

    const select = screen.getByLabelText<HTMLSelectElement>("Game");
    const expectedGames = Object.values(GAMES);

    const optionLabels = Array.from(select.options).map((option) => option.textContent);
    const optionValues = Array.from(select.options).map((option) => option.value);

    expect(optionLabels).toEqual(expectedGames.map((game) => game.name));
    expect(optionValues).toEqual(expectedGames.map((game) => game.id));
    expect(select.value).toBe(expectedGames[0]?.id);
  });

  it("creates the run with the given name and selected game, then navigates to its own screen", async () => {
    const adapter = createMemoryAdapter();
    const { router } = renderScreen(adapter);

    await userEvent.type(screen.getByLabelText("Name"), "Test Run");
    await userEvent.click(screen.getByRole("button", { name: "Create run" }));

    const [run] = await waitFor(async () => {
      const runs = await adapter.runs.getAll();
      expect(runs).toHaveLength(1);
      return runs;
    });
    if (!run) {
      throw new Error("Expected a run to have been created.");
    }

    expect(run.game).toBe("heartgold");
    expect(run.status).toBe("active");

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/runs/${run.id}/routes`);
    });
    expect(await screen.findByText(`Routes for run ${run.id}`)).toBeInTheDocument();
  });

  it("has a cancel link back to /", async () => {
    const adapter = createMemoryAdapter();
    const { router } = renderScreen(adapter);

    const cancelLink = screen.getByRole("link", { name: "Cancel" });
    expect(cancelLink).toHaveAttribute("href", "/");

    await userEvent.click(cancelLink);
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/");
    });
  });
});
