import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";

import { DEFAULT_RULES } from "@/domain/rules";
import type { Mon } from "@/domain/types";
import type { StorageAdapter } from "@/storage/adapter";
import { createMemoryAdapter } from "@/storage/memory-adapter";
import { StorageProvider } from "@/storage/storage-context";
import { defaultPokeApiRoutes, stubPokeApi } from "@/test/pokeapi-fetch";

import { GraveyardScreen } from "./graveyard-screen";

async function seed(adapter: StorageAdapter, mons: Partial<Mon>[]) {
  const run = await adapter.runs.put({
    name: "Test Run",
    game: "heartgold",
    status: "active",
    rules: DEFAULT_RULES,
    finishedAt: null,
  });
  const route = await adapter.routes.put({
    runId: run.id,
    name: "Dark Cave",
    order: 1,
    isCustom: false,
    gameRouteId: null,
  });
  for (const overrides of mons) {
    await adapter.mons.put({
      runId: run.id,
      encounterId: null,
      speciesId: "geodude",
      speciesIdCaught: "geodude",
      nickname: null,
      gender: null,
      level: 19,
      levelCaught: 12,
      nature: null,
      ability: null,
      heldItem: null,
      moves: [],
      status: "party",
      partySlot: 0,
      boxOrder: null,
      caughtRouteId: route.id,
      shiny: false,
      ...overrides,
    });
  }
  return run;
}

function renderScreen(adapter: StorageAdapter, runId: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <StorageProvider adapter={adapter}>
        <MemoryRouter initialEntries={[`/runs/${runId}/graveyard`]}>
          <Routes>
            <Route path="/runs/:runId/graveyard" element={<GraveyardScreen />} />
          </Routes>
        </MemoryRouter>
      </StorageProvider>
    </QueryClientProvider>,
  );
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  const button = await screen.findByRole("button", { name: "Log a death" });
  await waitFor(() => {
    expect(button).toBeEnabled();
  });
  await user.click(button);
  return screen.findByRole("dialog");
}

const TWO_LIVING: Partial<Mon>[] = [
  { nickname: "Rocky", speciesId: "geodude", partySlot: 0 },
  { nickname: "Sprig", speciesId: "pidgey", status: "box", partySlot: null, boxOrder: 0 },
  { nickname: "Ghost", speciesId: "clefairy", status: "dead", partySlot: null },
];

beforeEach(() => {
  stubPokeApi(defaultPokeApiRoutes);
});

describe("LogDeathDialog", () => {
  it("offers only living mons, party first", async () => {
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const run = await seed(adapter, TWO_LIVING);
    renderScreen(adapter, run.id);

    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole("combobox", { name: /Who died/ }));

    const options = (await screen.findAllByRole("option")).map((o) => o.textContent);
    expect(options).toHaveLength(2);
    expect(options[0]).toContain("“Rocky” Geodude");
    expect(options[1]).toContain("“Sprig” Pidgey");
    expect(options.join()).not.toContain("Ghost");
  });

  it("disables the header button when nobody is alive", async () => {
    const adapter = createMemoryAdapter();
    const run = await seed(adapter, [{ status: "dead", partySlot: null }]);
    renderScreen(adapter, run.id);

    expect(await screen.findByRole("button", { name: "Log a death" })).toBeDisabled();
  });

  it("hides the trainer field for a wild cause", async () => {
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const run = await seed(adapter, TWO_LIVING);
    renderScreen(adapter, run.id);
    const dialog = await openDialog(user);

    expect(within(dialog).getByLabelText(/Trainer/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "wild" }));

    expect(within(dialog).queryByLabelText(/Trainer/)).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText("Species")).toBeInTheDocument();
  });

  it("swaps the attacker fields for a status select on STATUS", async () => {
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const run = await seed(adapter, TWO_LIVING);
    renderScreen(adapter, run.id);
    const dialog = await openDialog(user);

    await user.click(within(dialog).getByRole("button", { name: "status" }));

    expect(within(dialog).queryByLabelText("Species")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Level")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Move")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("combobox", { name: /Lost to/ })).toHaveTextContent("Poison");
  });

  it("shows errors and saves nothing when Lost to is empty", async () => {
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const run = await seed(adapter, TWO_LIVING);
    renderScreen(adapter, run.id);
    const dialog = await openDialog(user);

    expect(within(dialog).queryByText(/Choose a species/)).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Send to graveyard" }));

    expect(await within(dialog).findByText("Choose a species from the list.")).toBeInTheDocument();
    expect(within(dialog).getByText("Choose a move from the list.")).toBeInTheDocument();
    expect(within(dialog).getByText("Enter a level from 1 to 100.")).toBeInTheDocument();
    expect(await adapter.deaths.getAll()).toHaveLength(0);
    expect((await adapter.mons.getAll()).filter((m) => m.status === "dead")).toHaveLength(1);
  });

  it("saves a trainer death, closes, and shows the new card", async () => {
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const run = await seed(adapter, TWO_LIVING);
    renderScreen(adapter, run.id);
    const dialog = await openDialog(user);

    await user.type(within(dialog).getByLabelText("Species"), "Pidgey");
    await user.type(within(dialog).getByLabelText("Level"), "20");
    await user.type(within(dialog).getByLabelText("Move"), "Tackle");
    await user.type(within(dialog).getByLabelText(/Trainer/), "Joey");
    await user.click(within(dialog).getByRole("button", { name: "Send to graveyard" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(await screen.findByText("Joey's Pidgey — Tackle")).toBeInTheDocument();
    const [death] = await adapter.deaths.getAll();
    expect(death?.cause).toMatchObject({ type: "trainer", trainerName: "Joey", fightId: null });
    expect(death?.level).toBe(19);
    expect(death?.notes).toBeNull();
  });
});
