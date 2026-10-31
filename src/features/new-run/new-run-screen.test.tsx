/**
 * Routing uses `createMemoryRouter` over a small route table of this screen's own neighbours,
 * not the app's full `appRoutes`, since this only needs to prove where `NewRunScreen` navigates.
 */

import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider, useParams } from "react-router";

import { DEFAULT_RULES } from "@/domain/rules";
import type { Rules } from "@/domain/types";
import type { StorageAdapter } from "@/storage/adapter";
import { createMemoryAdapter } from "@/storage/memory-adapter";
import { StorageProvider } from "@/storage/storage-context";
import { overrideGame } from "@/test/override-game";

import { NewRunScreen } from "./new-run-screen";

// One label per clause, in the same order new-run-screen.tsx renders them, so every checkbox
// can be driven generically rather than with seven near-identical userEvent.click calls.
const CLAUSE_LABELS = [
  "Dupes clause",
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
  let restore: (() => void) | undefined;

  afterEach(() => {
    restore?.();
    restore = undefined;
  });

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

  it("opens the game list in release order with the generation beside each", async () => {
    renderScreen(createMemoryAdapter());

    await userEvent.click(screen.getByLabelText("Game"));

    const options = await screen.findAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "Red· Gen 1",
      "Blue· Gen 1",
      "Yellow· Gen 1",
      "Gold· Gen 2",
      "Silver· Gen 2",
      "Crystal· Gen 2",
      "Ruby· Gen 3",
      "Sapphire· Gen 3",
      "FireRed· Gen 3",
      "LeafGreen· Gen 3",
      "Emerald· Gen 3",
      "Diamond· Gen 4",
      "Pearl· Gen 4",
      "Platinum· Gen 4",
      "HeartGold· Gen 4",
      "SoulSilver· Gen 4",
      "Black· Gen 5",
      "White· Gen 5",
      "Black 2· Gen 5",
      "White 2· Gen 5",
      "X· Gen 6",
      "Y· Gen 6",
      "Omega Ruby· Gen 6",
      "Alpha Sapphire· Gen 6",
      "Sun· Gen 7",
      "Moon· Gen 7",
      "Ultra Sun· Gen 7",
      "Ultra Moon· Gen 7",
      "Sword· Gen 8",
      "Shield· Gen 8",
    ]);
  });

  it("starts on the earliest game, so an untouched submit creates a Red run", async () => {
    const adapter = createMemoryAdapter();
    renderScreen(adapter);

    await userEvent.type(screen.getByLabelText("Run name"), "Default");
    await userEvent.click(screen.getByRole("button", { name: "Start run" }));

    await waitFor(async () => {
      expect((await adapter.runs.getAll()).map((run) => run.game)).toEqual(["red"]);
    });
  });

  it("finds a game by any word of its name and creates a run for the pick", async () => {
    const adapter = createMemoryAdapter();
    renderScreen(adapter);

    await userEvent.type(screen.getByLabelText("Run name"), "Silver Run");
    await userEvent.clear(screen.getByLabelText("Game"));
    await userEvent.type(screen.getByLabelText("Game"), "silver");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Silver· Gen 2",
      "SoulSilver· Gen 4",
    ]);
    await userEvent.click(screen.getByRole("option", { name: /SoulSilver/ }));
    await userEvent.click(screen.getByRole("button", { name: "Start run" }));

    await waitFor(async () => {
      expect((await adapter.runs.getAll()).map((run) => run.game)).toEqual(["soulsilver"]);
    });
  });

  it("picks a game from the keyboard alone", async () => {
    const adapter = createMemoryAdapter();
    renderScreen(adapter);

    await userEvent.type(screen.getByLabelText("Run name"), "Keys");
    await userEvent.clear(screen.getByLabelText("Game"));
    await userEvent.type(screen.getByLabelText("Game"), "green{ArrowDown}{Enter}");
    expect(screen.getByLabelText("Game")).toHaveValue("LeafGreen");
    await userEvent.click(screen.getByRole("button", { name: "Start run" }));

    await waitFor(async () => {
      expect((await adapter.runs.getAll()).map((run) => run.game)).toEqual(["leafgreen"]);
    });
  });

  it("leaves the game unset for an unknown name and refuses to create the run", async () => {
    const adapter = createMemoryAdapter();
    renderScreen(adapter);

    await userEvent.type(screen.getByLabelText("Run name"), "Nope");
    await userEvent.clear(screen.getByLabelText("Game"));
    await userEvent.type(screen.getByLabelText("Game"), "Pokemon Zircon");
    await userEvent.click(screen.getByRole("button", { name: "Start run" }));

    expect(await screen.findByText("Pick a game from the list.")).toBeInTheDocument();
    expect(screen.getByLabelText("Game")).toHaveAttribute("aria-invalid", "true");
    expect(await adapter.runs.getAll()).toEqual([]);
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

    expect(run.game).toBe("red");
    expect(run.status).toBe("active");

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/runs/${run.id}/routes`);
    });
    expect(await screen.findByText(`Routes for run ${run.id}`)).toBeInTheDocument();
  });

  it("seeds the rules form from DEFAULT_RULES, so an untouched submit persists exactly DEFAULT_RULES", async () => {
    restore = overrideGame("red", { generation: 3 });
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
    restore = overrideGame("red", { generation: 3 });
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
      shinyClause: !DEFAULT_RULES.shinyClause,
      giftClause: DEFAULT_RULES.giftClause,
      noGifts: DEFAULT_RULES.noGifts,
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

describe("NewRunScreen gift rules", () => {
  it("starts with both gift rules off", () => {
    renderScreen(createMemoryAdapter());

    expect(screen.getByLabelText("Gift clause")).not.toBeChecked();
    expect(screen.getByLabelText("No gifts")).not.toBeChecked();
  });

  it("turns one off when the other is turned on", async () => {
    renderScreen(createMemoryAdapter());

    await userEvent.click(screen.getByLabelText("Gift clause"));
    expect(screen.getByLabelText("Gift clause")).toBeChecked();

    await userEvent.click(screen.getByLabelText("No gifts"));
    expect(screen.getByLabelText("No gifts")).toBeChecked();
    expect(screen.getByLabelText("Gift clause")).not.toBeChecked();

    await userEvent.click(screen.getByLabelText("Gift clause"));
    expect(screen.getByLabelText("Gift clause")).toBeChecked();
    expect(screen.getByLabelText("No gifts")).not.toBeChecked();
  });

  it("saves the chosen gift rule", async () => {
    const adapter = createMemoryAdapter();
    renderScreen(adapter);

    await userEvent.type(screen.getByLabelText("Run name"), "Gifts");
    await userEvent.click(screen.getByLabelText("No gifts"));
    await userEvent.click(screen.getByRole("button", { name: "Start run" }));

    const [run] = await waitFor(async () => {
      const runs = await adapter.runs.getAll();
      expect(runs).toHaveLength(1);
      return runs;
    });
    expect(run?.rules.noGifts).toBe(true);
    expect(run?.rules.giftClause).toBe(false);
  });
});

describe("NewRunScreen shiny clause by game", () => {
  let restore: (() => void) | undefined;

  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  it("hides the shiny clause and saves it as off for a game without shinies", async () => {
    const adapter = createMemoryAdapter();
    renderScreen(adapter);

    expect(screen.queryByLabelText("Shiny clause")).toBeNull();
    expect(screen.getByLabelText("Dupes clause")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Run name"), "Kanto");
    await userEvent.click(screen.getByRole("button", { name: "Start run" }));

    const [run] = await waitFor(async () => {
      const runs = await adapter.runs.getAll();
      expect(runs).toHaveLength(1);
      return runs;
    });
    expect(run?.rules.shinyClause).toBe(false);
  });

  it("offers the shiny clause for a game with shinies", () => {
    restore = overrideGame("red", { generation: 3 });
    renderScreen(createMemoryAdapter());

    expect(screen.getByLabelText("Shiny clause")).toBeInTheDocument();
  });
});
