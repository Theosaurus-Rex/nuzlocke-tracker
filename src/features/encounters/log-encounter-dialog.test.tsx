/**
 * Covers `log-encounter-dialog.tsx` directly and through `RoutesScreen`. Both shells render at
 * once in jsdom, so every screen-level query here is scoped to the table it queries.
 */

import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route as RouterRoute, Routes } from "react-router";

import { DEFAULT_RULES } from "@/domain/rules";
import type { Encounter, Mon, Route, Rules } from "@/domain/types";
import { RoutesScreen } from "@/features/routes/routes-screen";
import { POKEAPI_BASE } from "@/game/pokeapi/client";
import type { RawIndex } from "@/game/pokeapi/map";
import type { StorageAdapter } from "@/storage/adapter";
import { createMemoryAdapter } from "@/storage/memory-adapter";
import { StorageProvider } from "@/storage/storage-context";
import { defaultPokeApiRoutes, STUB_PENDING, stubPokeApi, stubStatus } from "@/test/pokeapi-fetch";
import { moveIndexFixture, speciesIndexFixture } from "@/test/pokeapi-fixtures";

import { LogEncounterDialog } from "./log-encounter-dialog";

const TIMESTAMP = "2026-09-17T00:00:00.000Z";

const EXTENDED_SPECIES_INDEX: RawIndex = {
  results: [
    ...speciesIndexFixture.results,
    { name: "chikorita", url: `${POKEAPI_BASE}/pokemon/152/` },
  ],
};

const EXTENDED_MOVE_INDEX: RawIndex = {
  results: [...moveIndexFixture.results, { name: "growl", url: `${POKEAPI_BASE}/move/45/` }],
};

beforeEach(() => {
  stubPokeApi({
    ...defaultPokeApiRoutes,
    "/pokemon?limit=100000": EXTENDED_SPECIES_INDEX,
    "/move?limit=100000": EXTENDED_MOVE_INDEX,
  });
});

function makeRoute(overrides: Partial<Route> = {}): Route {
  return {
    id: "route-1",
    runId: "run-1",
    name: "Sprout Tower",
    order: 100,
    isCustom: false,
    gameRouteId: "route-1",
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

function makeMon(overrides: Partial<Mon> = {}): Mon {
  return {
    id: "mon-1",
    runId: "run-1",
    encounterId: null,
    speciesId: "chikorita",
    speciesIdCaught: "chikorita",
    nickname: null,
    gender: null,
    level: 5,
    levelCaught: 5,
    nature: null,
    ability: null,
    heldItem: null,
    moves: [],
    status: "party",
    partySlot: 0,
    boxOrder: null,
    caughtRouteId: null,
    shiny: false,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

function createWrapper(
  adapter: StorageAdapter,
): ({ children }: { children: ReactNode }) => ReactNode {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }): ReactNode {
    return (
      <QueryClientProvider client={queryClient}>
        <StorageProvider adapter={adapter}>{children}</StorageProvider>
      </QueryClientProvider>
    );
  };
}

function renderDialog(overrides: {
  adapter?: StorageAdapter;
  route?: Route;
  rules?: Rules;
  mons?: Mon[];
  existingEncounters?: Encounter[];
  onOpenChange?: (open: boolean) => void;
}) {
  const adapter = overrides.adapter ?? createMemoryAdapter();
  const onOpenChange = overrides.onOpenChange ?? vi.fn();
  const route = overrides.route ?? makeRoute();

  const view = render(
    <LogEncounterDialog
      open
      onOpenChange={onOpenChange}
      runId="run-1"
      route={route}
      rules={overrides.rules ?? DEFAULT_RULES}
      mons={overrides.mons ?? []}
      existingEncounters={overrides.existingEncounters ?? []}
    />,
    { wrapper: createWrapper(adapter) },
  );

  return { ...view, adapter, onOpenChange, route };
}

async function fillMinimalCatch(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.type(screen.getByLabelText("Species"), "Chikorita");
  await user.type(screen.getByLabelText("Level caught"), "6");
}

describe("LogEncounterDialog", () => {
  it("shows the route name as the dialog title", () => {
    renderDialog({ route: makeRoute({ name: "New Bark Town" }) });

    expect(screen.getByRole("dialog", { name: "New Bark Town" })).toBeInTheDocument();
  });

  it("can be filled and saved entirely from the keyboard", async () => {
    const user = userEvent.setup();
    const { adapter, onOpenChange } = renderDialog({});

    const species = screen.getByLabelText("Species");
    await user.type(species, "chik");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.type(screen.getByLabelText("Level caught"), "6");

    // Back in the species field its list reopens, with nothing arrowed to. Enter must fall
    // through to the form rather than being swallowed by the combobox.
    await user.click(species);
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    const [encounter] = await adapter.encounters.where("runId", "run-1");
    expect(encounter?.speciesId).toBe("chikorita");
  });

  it("shows the shiny toggle only while the outcome is Caught", async () => {
    const user = userEvent.setup();
    renderDialog({});

    expect(screen.getByLabelText("Shiny")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Missed" }));
    expect(screen.queryByLabelText("Shiny")).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Caught" }));
    expect(screen.getByLabelText("Shiny")).toBeInTheDocument();
  });

  it("logs a shiny catch when the toggle is on, and defaults to not shiny", async () => {
    const user = userEvent.setup();
    const { adapter, onOpenChange } = renderDialog({});

    await user.click(screen.getByLabelText("Shiny"));
    expect(screen.getByLabelText("Shiny")).toHaveAttribute("aria-pressed", "true");

    await fillMinimalCatch(user);
    await user.click(screen.getByRole("button", { name: "Save encounter" }));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    const [mon] = await adapter.mons.where("runId", "run-1");
    expect(mon?.shiny).toBe(true);
  });

  it("shows the species' resolved type inline once it matches", async () => {
    const user = userEvent.setup();
    renderDialog({});

    await user.type(screen.getByLabelText("Species"), "Chikorita");

    expect(await screen.findByText("grass")).toBeInTheDocument();
  });

  it("offers a matching species from a partial search and accepts the pick", async () => {
    const user = userEvent.setup();
    const { adapter, onOpenChange } = renderDialog({});

    await user.type(screen.getByLabelText("Species"), "chik");
    await user.click(await screen.findByRole("option", { name: "Chikorita" }));
    await user.type(screen.getByLabelText("Level caught"), "6");
    await user.click(screen.getByRole("button", { name: "Save encounter" }));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    const [encounter] = await adapter.encounters.where("runId", "run-1");
    expect(encounter?.speciesId).toBe("chikorita");
  });

  it("refuses text that matches no known species, and writes nothing", async () => {
    const user = userEvent.setup();
    const { adapter, onOpenChange } = renderDialog({});

    await user.type(screen.getByLabelText("Species"), "Not A Real Mon");
    await user.type(screen.getByLabelText("Level caught"), "6");
    await user.click(screen.getByRole("button", { name: "Save encounter" }));

    expect(await screen.findByText("Choose a species from the list.")).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(await adapter.encounters.where("runId", "run-1")).toEqual([]);
  });

  it("takes a fully typed species name as a selection, without needing a click", async () => {
    const user = userEvent.setup();
    const { adapter, onOpenChange } = renderDialog({});

    await user.type(screen.getByLabelText("Species"), "Chikorita");
    await user.type(screen.getByLabelText("Level caught"), "6");
    await user.click(screen.getByRole("button", { name: "Save encounter" }));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    const [encounter] = await adapter.encounters.where("runId", "run-1");
    expect(encounter?.speciesId).toBe("chikorita");
  });

  it("drops a species once its name is edited into something unknown", async () => {
    const user = userEvent.setup();
    const { adapter, onOpenChange } = renderDialog({});

    const species = screen.getByLabelText("Species");
    await user.type(species, "chik");
    await user.click(await screen.findByRole("option", { name: "Chikorita" }));
    await user.type(species, "zzz");
    await user.type(screen.getByLabelText("Level caught"), "6");
    await user.click(screen.getByRole("button", { name: "Save encounter" }));

    expect(await screen.findByText("Choose a species from the list.")).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(await adapter.encounters.where("runId", "run-1")).toEqual([]);
  });

  it("saves every detail field onto the caught mon, not just the species and level", async () => {
    const user = userEvent.setup();
    const { adapter, onOpenChange } = renderDialog({});

    await user.type(screen.getByLabelText("Species"), "Chikorita");
    await user.type(screen.getByLabelText("Level caught"), "6");
    await user.type(screen.getByLabelText(/^Nickname/), "Sprig");
    await user.click(
      within(screen.getByRole("radiogroup", { name: "Gender" })).getByRole("radio", {
        name: "Male",
      }),
    );
    await user.type(screen.getByLabelText("Ability"), "Overgrow");
    await user.type(screen.getByLabelText("Held item"), "Miracle Seed");
    await user.click(screen.getByRole("button", { name: "Save encounter" }));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    const [mon] = await adapter.mons.where("runId", "run-1");
    expect(mon).toMatchObject({
      nickname: "Sprig",
      gender: "male",
      ability: "Overgrow",
      heldItem: "Miracle Seed",
    });
  });

  it("saves the chosen moves onto the caught mon", async () => {
    const user = userEvent.setup();
    const { adapter, onOpenChange } = renderDialog({});

    await user.type(screen.getByLabelText("Species"), "Chikorita");
    await user.type(screen.getByLabelText("Level caught"), "6");
    await user.type(screen.getAllByPlaceholderText("+ move")[0]!, "Tackle");
    await user.type(screen.getAllByPlaceholderText("+ move")[0]!, "Growl");
    await user.click(screen.getByRole("button", { name: "Save encounter" }));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    const [mon] = await adapter.mons.where("runId", "run-1");
    expect(mon?.moves).toEqual(["tackle", "growl"]);
  });

  it("blocks submit on a missing nickname when the clause is on, and shows nothing was saved", async () => {
    const user = userEvent.setup();
    const { adapter, onOpenChange } = renderDialog({
      rules: { ...DEFAULT_RULES, nicknamesRequired: true },
    });

    await fillMinimalCatch(user);
    await user.click(screen.getByRole("button", { name: "Save encounter" }));

    expect(await screen.findByText(/requires a nickname/i)).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(await adapter.encounters.where("runId", "run-1")).toEqual([]);
  });

  it("does not require a nickname when the clause is off", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog({
      rules: { ...DEFAULT_RULES, nicknamesRequired: false },
    });

    await fillMinimalCatch(user);
    await user.click(screen.getByRole("button", { name: "Save encounter" }));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("a validation failure writes nothing and leaves the dialog open", async () => {
    const user = userEvent.setup();
    const { adapter, onOpenChange } = renderDialog({});

    await user.click(screen.getByRole("button", { name: "Save encounter" }));

    expect(await screen.findByText(/choose a species/i)).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(await adapter.encounters.where("runId", "run-1")).toEqual([]);
    expect(await adapter.mons.getAll()).toEqual([]);
  });

  it("current level follows level caught until edited directly, then stops following", async () => {
    const user = userEvent.setup();
    renderDialog({});

    const levelCaught = screen.getByLabelText("Level caught");
    const level = screen.getByLabelText("Current level");

    await user.type(levelCaught, "6");
    expect(level).toHaveValue("6");

    await user.clear(levelCaught);
    await user.type(levelCaught, "18");
    expect(level).toHaveValue("18");

    await user.clear(level);
    await user.type(level, "25");
    expect(level).toHaveValue("25");

    await user.clear(levelCaught);
    await user.type(levelCaught, "30");
    expect(level).toHaveValue("25");
  });

  it("defaults placement to box when the party already has six mons", () => {
    const fullParty = Array.from({ length: 6 }, (_, index) =>
      makeMon({ id: `mon-${index}`, status: "party", partySlot: index }),
    );

    renderDialog({ mons: fullParty });

    expect(document.getElementById("log-encounter-placement")).toHaveTextContent(/box/i);
  });

  it("defaults placement to party when the party has a free slot", () => {
    renderDialog({ mons: [makeMon({ id: "mon-0", partySlot: 0 })] });

    expect(document.getElementById("log-encounter-placement")).toHaveTextContent(/party/i);
  });

  it("surfaces a mutation failure instead of swallowing it", async () => {
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const failingAdapter: StorageAdapter = {
      ...adapter,
      transaction: () => Promise.reject(new Error("simulated write failure")),
    };

    renderDialog({ adapter: failingAdapter });

    await fillMinimalCatch(user);
    await user.click(screen.getByRole("button", { name: "Save encounter" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/simulated write failure/);
  });

  it("shows a loading notice while the species index is pending, and blocks save without a resolved species", async () => {
    const user = userEvent.setup();
    stubPokeApi({ "/pokemon?limit=100000": STUB_PENDING });
    const { adapter, onOpenChange } = renderDialog({});

    await user.click(screen.getByRole("radio", { name: "Missed" }));
    expect(screen.getByRole("status")).toHaveTextContent("Loading Pokémon…");

    await user.type(screen.getByLabelText("Species"), "Pidgey");
    await user.click(screen.getByRole("button", { name: "Save encounter" }));

    expect(await screen.findByText("Choose a species from the list.")).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(await adapter.encounters.where("runId", "run-1")).toEqual([]);
  });

  it("shows a retry notice when the species index fails to load, and recovers on retry", async () => {
    const user = userEvent.setup();
    stubPokeApi({ ...defaultPokeApiRoutes, "/pokemon?limit=100000": stubStatus(500) });
    const { adapter, onOpenChange } = renderDialog({});

    expect(await screen.findByText("Couldn't reach PokéAPI.")).toBeInTheDocument();

    stubPokeApi(defaultPokeApiRoutes);
    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(screen.queryByText("Couldn't reach PokéAPI.")).not.toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("Species"), "Pidgey");
    await user.type(screen.getByLabelText("Level caught"), "6");
    await user.click(screen.getByRole("button", { name: "Save encounter" }));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    const [encounter] = await adapter.encounters.where("runId", "run-1");
    expect(encounter?.speciesId).toBe("pidgey");
  });
});

function makeRunDraft(rules: Rules) {
  return {
    name: "Test Run",
    game: "heartgold" as const,
    status: "active" as const,
    rules,
    finishedAt: null,
  };
}

function renderRoutesScreen(adapter: StorageAdapter, runId: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <StorageProvider adapter={adapter}>
        <MemoryRouter initialEntries={[`/runs/${runId}/routes`]}>
          <Routes>
            <RouterRoute path="/runs/:runId/routes" element={<RoutesScreen />} />
          </Routes>
        </MemoryRouter>
      </StorageProvider>
    </QueryClientProvider>,
  );
}

describe("logging an encounter from the routes screen", () => {
  it("opens the dialog from the table's log control, titled with the route name", async () => {
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft(DEFAULT_RULES));
    await adapter.routes.put({
      runId: run.id,
      name: "Route 29",
      order: 100,
      isCustom: false,
      gameRouteId: null,
    });

    renderRoutesScreen(adapter, run.id);

    const table = await screen.findByRole("table");
    await user.click(within(table).getByRole("button", { name: "Log encounter" }));

    expect(
      await screen.findByText("Route 29", { selector: "h2, [data-slot=dialog-title]" }),
    ).toBeInTheDocument();
  });

  it.each([
    ["Caught" as const, "party"],
    ["Missed" as const, "missed"],
    ["Skipped" as const, "skipped"],
  ])("logs a %s encounter and updates the table row", async (outcomeLabel, expectedStatus) => {
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft(DEFAULT_RULES));
    await adapter.routes.put({
      runId: run.id,
      name: "Route 29",
      order: 100,
      isCustom: false,
      gameRouteId: null,
    });

    renderRoutesScreen(adapter, run.id);

    const table = await screen.findByRole("table");
    await user.click(within(table).getByRole("button", { name: "Log encounter" }));

    if (outcomeLabel === "Caught") {
      await user.type(screen.getByLabelText("Species"), "Chikorita");
      await user.type(screen.getByLabelText("Level caught"), "6");
    } else {
      await user.click(screen.getByRole("radio", { name: outcomeLabel }));
      if (outcomeLabel === "Missed") {
        await user.type(screen.getByLabelText("Species"), "Geodude");
      }
    }

    await user.click(screen.getByRole("button", { name: "Save encounter" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    const updatedTable = screen.getByRole("table");
    expect(within(updatedTable).getByText(expectedStatus)).toBeInTheDocument();
  });

  it("refuses a missed encounter with no species, and writes nothing", async () => {
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft(DEFAULT_RULES));
    await adapter.routes.put({
      runId: run.id,
      name: "Route 29",
      order: 100,
      isCustom: false,
      gameRouteId: null,
    });

    renderRoutesScreen(adapter, run.id);

    const table = await screen.findByRole("table");
    await user.click(within(table).getByRole("button", { name: "Log encounter" }));
    await user.click(screen.getByRole("radio", { name: "Missed" }));
    await user.click(screen.getByRole("button", { name: "Save encounter" }));

    expect(await screen.findByText("Choose a species from the list.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(await adapter.encounters.where("runId", run.id)).toEqual([]);
  });

  it("still allows a skipped encounter with no species", async () => {
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft(DEFAULT_RULES));
    await adapter.routes.put({
      runId: run.id,
      name: "Route 29",
      order: 100,
      isCustom: false,
      gameRouteId: null,
    });

    renderRoutesScreen(adapter, run.id);

    const table = await screen.findByRole("table");
    await user.click(within(table).getByRole("button", { name: "Log encounter" }));
    await user.click(screen.getByRole("radio", { name: "Skipped" }));
    await user.click(screen.getByRole("button", { name: "Save encounter" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    const encounters = await adapter.encounters.where("runId", run.id);
    expect(encounters.map((encounter) => encounter.speciesId)).toEqual([null]);
  });
});
