/**
 * Routing uses `createMemoryRouter` over a small route table of this screen's own neighbours,
 * not the app's full `appRoutes`, since this only needs to prove where `NewRunScreen` navigates.
 */

import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider, useParams } from "react-router";

import { DEFAULT_RULES } from "@/domain/rules";
import type { Rules } from "@/domain/types";
import type { StorageAdapter } from "@/storage/adapter";
import { createMemoryAdapter } from "@/storage/memory-adapter";
import { StorageProvider } from "@/storage/storage-context";
import { GAMES } from "@/game/registry";

import { NewRunScreen } from "./new-run-screen";

// One label per clause, in the same order new-run-screen.tsx renders them, so every checkbox
// can be driven generically rather than with seven near-identical userEvent.click calls.
const CLAUSE_LABELS = [
  "Dupes clause",
  "Species clause",
  "Shiny clause",
  "Nicknames required",
  "Level caps by badge",
  "Set mode",
  "Hardcore",
] as const;

const RANDOMISER_SUB_LABELS = [
  "Wild encounters are randomised",
  "Trainer parties are randomised",
  "Starters are randomised",
  "Abilities are randomised",
  "Held items are randomised",
  "Movesets are randomised",
  "Evolutions are randomised",
] as const;

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

    await userEvent.click(screen.getByRole("button", { name: "Start run" }));

    const nameInput = screen.getByLabelText("Run name");
    const error = await screen.findByText("Name is required.");
    expect(nameInput).toHaveAttribute("aria-describedby", error.id);
    expect(nameInput).toHaveAttribute("aria-invalid", "true");

    expect(await adapter.runs.getAll()).toEqual([]);
  });

  it("rejects a whitespace-only name, and writes nothing", async () => {
    const adapter = createMemoryAdapter();
    renderScreen(adapter);

    await userEvent.type(screen.getByLabelText("Run name"), "   ");
    await userEvent.click(screen.getByRole("button", { name: "Start run" }));

    expect(await screen.findByText("Name is required.")).toBeInTheDocument();
    expect(await adapter.runs.getAll()).toEqual([]);
  });

  it("trims the name before saving", async () => {
    const adapter = createMemoryAdapter();
    renderScreen(adapter);

    await userEvent.type(screen.getByLabelText("Run name"), "  Test Run  ");
    await userEvent.click(screen.getByRole("button", { name: "Start run" }));

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

    await userEvent.type(screen.getByLabelText("Run name"), "Test Run");
    await userEvent.click(screen.getByRole("button", { name: "Start run" }));

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

  it("seeds the rules form from DEFAULT_RULES, so an untouched submit persists exactly DEFAULT_RULES", async () => {
    const adapter = createMemoryAdapter();
    renderScreen(adapter);

    await userEvent.type(screen.getByLabelText("Run name"), "Untouched Rules Run");
    await userEvent.click(screen.getByRole("button", { name: "Start run" }));

    const [run] = await waitFor(async () => {
      const runs = await adapter.runs.getAll();
      expect(runs).toHaveLength(1);
      return runs;
    });

    // DEFAULT_RULES is itself fully typed as `Rules`, so this is already a full-shape assertion:
    // a field added to `Rules` without a matching default would fail typechecking before this
    // test ever runs.
    expect(run?.rules).toEqual(DEFAULT_RULES);
  });

  it("persists exactly the rules configured on the form, not DEFAULT_RULES", async () => {
    const adapter = createMemoryAdapter();
    renderScreen(adapter);

    await userEvent.type(screen.getByLabelText("Run name"), "Modified Rules Run");

    for (const label of CLAUSE_LABELS) {
      await userEvent.click(screen.getByLabelText(label));
    }

    await userEvent.click(screen.getByLabelText("This is a randomiser run"));
    for (const label of RANDOMISER_SUB_LABELS) {
      await userEvent.click(screen.getByLabelText(label));
    }

    await userEvent.type(screen.getByLabelText("Custom clause (optional)"), "  No held items  ");

    await userEvent.click(screen.getByRole("button", { name: "Start run" }));

    const [run] = await waitFor(async () => {
      const runs = await adapter.runs.getAll();
      expect(runs).toHaveLength(1);
      return runs;
    });

    // Written out against the full `Rules` shape, not `expect.objectContaining`: if `Rules`
    // grows a new field, this literal fails to typecheck until it's added here too, so a newly
    // added rule can't be silently dropped from the form without this test noticing.
    const expectedRules: Rules = {
      dupesClause: !DEFAULT_RULES.dupesClause,
      speciesClause: !DEFAULT_RULES.speciesClause,
      shinyClause: !DEFAULT_RULES.shinyClause,
      nicknamesRequired: !DEFAULT_RULES.nicknamesRequired,
      levelCaps: !DEFAULT_RULES.levelCaps,
      setMode: !DEFAULT_RULES.setMode,
      hardcore: !DEFAULT_RULES.hardcore,
      randomiser: {
        enabled: true,
        wildEncounters: true,
        trainers: true,
        starters: true,
        abilities: true,
        items: true,
        moves: true,
        evolutions: true,
      },
      customClause: "No held items",
    };

    expect(run?.rules).toEqual(expectedRules);
  });

  it("disables every randomiser sub-toggle while the master toggle is off, and enables them once it's on", async () => {
    const adapter = createMemoryAdapter();
    renderScreen(adapter);

    const subToggles = RANDOMISER_SUB_LABELS.map((label) => screen.getByLabelText(label));
    for (const toggle of subToggles) {
      expect(toggle).toBeDisabled();
    }

    await userEvent.click(screen.getByLabelText("This is a randomiser run"));

    for (const toggle of subToggles) {
      expect(toggle).toBeEnabled();
    }
  });

  const customClauseCases: readonly {
    name: string;
    input: string;
    expected: string | null;
  }[] = [
    {
      name: "trims surrounding whitespace",
      input: "  No trading with other players  ",
      expected: "No trading with other players",
    },
    { name: "left empty", input: "", expected: null },
    { name: "whitespace only", input: "    ", expected: null },
  ];

  it.each(customClauseCases)(
    "stores the custom clause as null rather than empty string: $name",
    async ({ input, expected }) => {
      const adapter = createMemoryAdapter();
      renderScreen(adapter);

      await userEvent.type(screen.getByLabelText("Run name"), "Custom Clause Run");
      if (input.length > 0) {
        await userEvent.type(screen.getByLabelText("Custom clause (optional)"), input);
      }
      await userEvent.click(screen.getByRole("button", { name: "Start run" }));

      const [run] = await waitFor(async () => {
        const runs = await adapter.runs.getAll();
        expect(runs).toHaveLength(1);
        return runs;
      });

      expect(run?.rules.customClause).toBe(expected);
    },
  );

  it("has a cancel link back to /, shown once a run exists", async () => {
    const adapter = createMemoryAdapter();
    await adapter.runs.put({
      name: "Existing Run",
      game: "heartgold",
      status: "active",
      rules: DEFAULT_RULES,
      finishedAt: null,
    });
    const { router } = renderScreen(adapter);

    const cancelLink = await screen.findByRole("link", { name: "Cancel" });
    expect(cancelLink).toHaveAttribute("href", "/");

    await userEvent.click(cancelLink);
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/");
    });
  });

  it("hides Cancel when there are no runs, since / would only redirect straight back here", async () => {
    const adapter = createMemoryAdapter();
    renderScreen(adapter);

    await screen.findByRole("heading", { name: "New run" });
    expect(screen.queryByRole("link", { name: "Cancel" })).not.toBeInTheDocument();
  });
});
