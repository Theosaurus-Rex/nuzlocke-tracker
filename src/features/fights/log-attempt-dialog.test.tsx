import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";

import { DEFAULT_RULES } from "@/domain/rules";
import type { Fight } from "@/domain/types";
import type { StorageAdapter } from "@/storage/adapter";
import { createMemoryAdapter } from "@/storage/memory-adapter";
import { StorageProvider } from "@/storage/storage-context";
import { defaultPokeApiRoutes, stubPokeApi } from "@/test/pokeapi-fetch";

import { FightsScreen } from "./fights-screen";

function fightDraft(
  runId: string,
  overrides: Partial<Fight>,
): Omit<Fight, "id" | "createdAt" | "updatedAt"> {
  return {
    runId,
    gameFightId: null,
    name: "Fight",
    kind: "gym",
    order: 1,
    grantsBadge: true,
    levelCap: 10,
    status: "pending",
    clearedAt: null,
    ...overrides,
  };
}

async function seed(adapter: StorageAdapter, gameFightId: string | null = "gym-bugsy") {
  const run = await adapter.runs.put({
    name: "Test Run",
    game: "heartgold",
    status: "active",
    rules: DEFAULT_RULES,
    finishedAt: null,
  });
  const bugsy = await adapter.fights.put(
    fightDraft(run.id, { gameFightId, name: "Bugsy", order: 1, levelCap: 17 }),
  );
  await adapter.fights.put(
    fightDraft(run.id, { gameFightId: "gym-whitney", name: "Whitney", order: 2, levelCap: 20 }),
  );
  const mon = await adapter.mons.put({
    runId: run.id,
    encounterId: null,
    speciesId: "geodude",
    speciesIdCaught: "geodude",
    nickname: "Rocky",
    gender: null,
    level: 12,
    levelCaught: 12,
    nature: null,
    ability: null,
    heldItem: null,
    moves: [],
    status: "party",
    partySlot: 0,
    boxOrder: null,
    caughtRouteId: null,
    shiny: false,
  });
  return { run, bugsy, mon };
}

function renderScreen(adapter: StorageAdapter, runId: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <StorageProvider adapter={adapter}>
        <MemoryRouter initialEntries={[`/runs/${runId}/fights`]}>
          <Routes>
            <Route path="/runs/:runId/fights" element={<FightsScreen />} />
          </Routes>
        </MemoryRouter>
      </StorageProvider>
    </QueryClientProvider>,
  );
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  const table = within(await screen.findByRole("table", { name: "Fights" }));
  await user.click(table.getByRole("button", { name: "Log attempt at Bugsy" }));
  return screen.findByRole("dialog");
}

async function fightRow(name: string) {
  const table = await screen.findByRole("table", { name: "Fights" });
  return within(table).getByText(name, { exact: false }).closest("tr")!;
}

beforeEach(() => {
  stubPokeApi(defaultPokeApiRoutes);
});

describe("LogAttemptDialog", () => {
  it("titles the dialog with the attempt only", async () => {
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const { run } = await seed(adapter);
    renderScreen(adapter, run.id);

    const dialog = await openDialog(user);
    expect(within(dialog).getByRole("heading")).toHaveTextContent(/^Attempt: Bugsy · Hive$/);
    expect(within(dialog).queryByText(/encounter/)).not.toBeInTheDocument();
  });

  it("clears the fight when won with no losses", async () => {
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const { run } = await seed(adapter);
    renderScreen(adapter, run.id);

    const dialog = await openDialog(user);
    expect(within(dialog).getByRole("radio", { name: "Won" })).toBeChecked();
    await user.click(within(dialog).getByRole("button", { name: "Save attempt" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(within(await fightRow("Bugsy")).getByText("Cleared")).toBeInTheDocument();
    expect(await fightRow("Whitney")).toHaveAttribute("aria-current", "step");
  });

  it("records a loss with the chosen killer and kills the mon on a win", async () => {
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const { run, mon, bugsy } = await seed(adapter);
    renderScreen(adapter, run.id);

    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole("checkbox", { name: /Rocky/ }));
    await user.click(within(dialog).getByRole("combobox", { name: /Killed by/ }));
    await user.click(await screen.findByRole("option", { name: "Kakuna · L15" }));
    await user.click(within(dialog).getByRole("button", { name: "Save attempt" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    const row = await fightRow("Bugsy");
    expect(within(row).getByText("“Rocky” Geodude")).toBeInTheDocument();
    expect(within(row).getByText("Cleared")).toBeInTheDocument();
    expect((await adapter.mons.get(mon.id))?.status).toBe("dead");
    const [death] = await adapter.deathsByFight(bugsy.id);
    expect(death?.cause).toMatchObject({ species: "kakuna", level: 15, move: null });
  });

  it("keeps the fight next when lost, and still kills the mon", async () => {
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const { run, mon } = await seed(adapter);
    renderScreen(adapter, run.id);

    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole("radio", { name: "Lost" }));
    await user.click(within(dialog).getByRole("checkbox", { name: /Rocky/ }));
    await user.click(within(dialog).getByRole("combobox", { name: /Killed by/ }));
    await user.click(await screen.findByRole("option", { name: "Scyther · L17" }));
    await user.click(within(dialog).getByRole("button", { name: "Save attempt" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(await fightRow("Bugsy")).toHaveAttribute("aria-current", "step");
    expect(within(await fightRow("Bugsy")).queryByText("Cleared")).not.toBeInTheDocument();
    expect((await adapter.mons.get(mon.id))?.status).toBe("dead");
  });

  it("blocks saving a ticked mon with no killer", async () => {
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const { run, mon } = await seed(adapter);
    renderScreen(adapter, run.id);

    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole("checkbox", { name: /Rocky/ }));
    await user.click(within(dialog).getByRole("button", { name: "Save attempt" }));

    expect(await within(dialog).findByText("Choose what killed it.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect((await adapter.mons.get(mon.id))?.status).toBe("party");
  });

  it("disables losses when the fight has no team data", async () => {
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const { run } = await seed(adapter, null);
    renderScreen(adapter, run.id);

    const dialog = await openDialog(user);
    expect(within(dialog).getByText(/no team data/)).toBeInTheDocument();
    expect(within(dialog).getByRole("checkbox", { name: /Rocky/ })).toBeDisabled();
  });
});
