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
    expect(within(dialog).queryByLabelText(/Move/)).not.toBeInTheDocument();
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
    expect(within(dialog).queryByText("Choose a move from the list.")).not.toBeInTheDocument();
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
    await user.type(within(dialog).getByLabelText(/Move/), "Tackle");
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

  it("saves a wild death with no move", async () => {
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const run = await seed(adapter, TWO_LIVING);
    renderScreen(adapter, run.id);
    const dialog = await openDialog(user);

    await user.click(within(dialog).getByRole("button", { name: "wild" }));
    await user.type(within(dialog).getByLabelText("Species"), "Pidgey");
    await user.type(within(dialog).getByLabelText("Level"), "20");
    await user.click(within(dialog).getByRole("button", { name: "Send to graveyard" }));

    expect(await screen.findByText("wild Pidgey")).toBeInTheDocument();
    const [death] = await adapter.deaths.getAll();
    expect(death?.cause).toMatchObject({ type: "wild", move: null });
  });
});

describe("editing a death", () => {
  async function seedWithDeaths() {
    const adapter = createMemoryAdapter();
    const run = await seed(adapter, [
      { nickname: "Rocky", speciesId: "geodude", partySlot: 0 },
      { nickname: "Ghost", speciesId: "clefairy", status: "dead", partySlot: null },
      { nickname: "Fern", speciesId: "pidgey", status: "dead", partySlot: null },
    ]);
    const [route] = await adapter.routes.getAll();
    const mons = await adapter.mons.getAll();
    const byName = (name: string) => mons.find((m) => m.nickname === name)!;
    await adapter.deaths.put({
      runId: run.id,
      monId: byName("Ghost").id,
      level: 19,
      routeId: route!.id,
      cause: {
        type: "trainer",
        fightId: null,
        trainerName: "Joey",
        species: "pidgey",
        level: 20,
        move: "tackle",
      },
      diedAt: "2026-09-29T10:00:00.000Z",
      notes: "too brave",
    });
    await adapter.deaths.put({
      runId: run.id,
      monId: byName("Fern").id,
      level: 18,
      routeId: null,
      cause: { type: "status", status: "burn" },
      diedAt: "2026-09-29T09:00:00.000Z",
      notes: null,
    });
    return { adapter, run };
  }

  it("opens filled in for a trainer death", async () => {
    const user = userEvent.setup();
    const { adapter, run } = await seedWithDeaths();
    renderScreen(adapter, run.id);

    await user.click(await screen.findByRole("button", { name: "Edit death of “Ghost”" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Edit death")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Species")).toHaveValue("Pidgey");
    expect(within(dialog).getByLabelText("Level")).toHaveValue("20");
    expect(within(dialog).getByLabelText(/Move/)).toHaveValue("Tackle");
    expect(within(dialog).getByLabelText(/Trainer/)).toHaveValue("Joey");
    expect(within(dialog).getByRole("combobox", { name: "Where" })).toHaveTextContent("Dark Cave");
    expect(within(dialog).getByLabelText(/Notes/)).toHaveValue("too brave");
    expect(within(dialog).getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });

  it("opens the death that was clicked, filled in for a status death", async () => {
    const user = userEvent.setup();
    const { adapter, run } = await seedWithDeaths();
    renderScreen(adapter, run.id);

    await user.click(await screen.findByRole("button", { name: "Edit death of “Fern”" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("combobox", { name: /Lost to/ })).toHaveTextContent("Burn");
    expect(within(dialog).getByRole("combobox", { name: "Where" })).toHaveTextContent("Unknown");
    expect(within(dialog).getByText("“Fern” Pidgey")).toBeInTheDocument();
  });

  it("shows who died as a fixed row, not a control", async () => {
    const user = userEvent.setup();
    const { adapter, run } = await seedWithDeaths();
    renderScreen(adapter, run.id);

    await user.click(await screen.findByRole("button", { name: "Edit death of “Ghost”" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("group", { name: "Who died" })).toHaveTextContent(
      "“Ghost” Clefairy",
    );
    expect(within(dialog).queryByRole("combobox", { name: /Who died/ })).not.toBeInTheDocument();
  });

  it("saves a changed trainer name, closes, and updates the card", async () => {
    const user = userEvent.setup();
    const { adapter, run } = await seedWithDeaths();
    renderScreen(adapter, run.id);
    await user.click(await screen.findByRole("button", { name: "Edit death of “Ghost”" }));
    const dialog = await screen.findByRole("dialog");

    await user.clear(within(dialog).getByLabelText(/Trainer/));
    await user.type(within(dialog).getByLabelText(/Trainer/), "Bugsy");
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(await screen.findByText("Bugsy's Pidgey — Tackle")).toBeInTheDocument();
    expect(await adapter.deaths.getAll()).toHaveLength(2);
  });

  it("keeps the fight a trainer death is linked to when only the notes change", async () => {
    const user = userEvent.setup();
    const { adapter, run } = await seedWithDeaths();
    const linked = (await adapter.deaths.getAll()).find((d) => d.cause.type === "trainer")!;
    await adapter.deaths.put({
      ...linked,
      cause: {
        type: "trainer",
        fightId: "fight-1",
        trainerName: null,
        species: "pidgey",
        level: 20,
        move: null,
      },
    });
    renderScreen(adapter, run.id);
    await user.click(await screen.findByRole("button", { name: "Edit death of “Ghost”" }));
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByLabelText(/Notes/), "!");
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    const stored = await adapter.deaths.get(linked.id);
    expect(stored?.cause).toMatchObject({ fightId: "fight-1", trainerName: null });
  });

  it("still opens the log form empty", async () => {
    const user = userEvent.setup();
    const { adapter, run } = await seedWithDeaths();
    renderScreen(adapter, run.id);

    const dialog = await openDialog(user);

    expect(within(dialog).getByText("Log a death")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Species")).toHaveValue("");
    expect(within(dialog).getByLabelText("Level")).toHaveValue("");
  });
});

describe("undoing a death", () => {
  async function openEdit(user: ReturnType<typeof userEvent.setup>, partyCount = 1) {
    const adapter = createMemoryAdapter();
    const living = Array.from({ length: partyCount }, (_, slot) => ({
      nickname: `Mate${String(slot)}`,
      partySlot: slot,
    }));
    const run = await seed(adapter, [
      ...living,
      { nickname: "Ghost", speciesId: "clefairy", status: "dead", partySlot: null },
    ]);
    const ghost = (await adapter.mons.getAll()).find((m) => m.nickname === "Ghost")!;
    await adapter.deaths.put({
      runId: run.id,
      monId: ghost.id,
      level: 19,
      routeId: null,
      cause: { type: "status", status: "burn" },
      diedAt: "2026-09-29T10:00:00.000Z",
      notes: "too brave",
    });
    renderScreen(adapter, run.id);
    await user.click(await screen.findByRole("button", { name: "Edit death of “Ghost”" }));
    return { adapter, dialog: await screen.findByRole("dialog") };
  }

  it("offers the button when editing but not when logging", async () => {
    const user = userEvent.setup();
    const { dialog } = await openEdit(user);
    expect(within(dialog).getByRole("button", { name: "This wasn't a death" })).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    const logDialog = await openDialog(user);
    expect(
      within(logDialog).queryByRole("button", { name: "This wasn't a death" }),
    ).not.toBeInTheDocument();
  });

  it("asks for confirmation with Box chosen", async () => {
    const user = userEvent.setup();
    const { dialog } = await openEdit(user);

    await user.click(within(dialog).getByRole("button", { name: "This wasn't a death" }));

    expect(
      within(dialog).getByText("Bring “Ghost” back? This deletes the death record."),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("combobox", { name: "Placement" })).toHaveTextContent("Box");
  });

  it("keeps edited fields when going back", async () => {
    const user = userEvent.setup();
    const { dialog } = await openEdit(user);
    await user.type(within(dialog).getByLabelText(/Notes/), "!");

    await user.click(within(dialog).getByRole("button", { name: "This wasn't a death" }));
    await user.click(within(dialog).getByRole("button", { name: "Back" }));

    expect(within(dialog).getByLabelText(/Notes/)).toHaveValue("too brave!");
  });

  it("brings the mon back to the box, closes and removes the card", async () => {
    const user = userEvent.setup();
    const { adapter, dialog } = await openEdit(user);

    await user.click(within(dialog).getByRole("button", { name: "This wasn't a death" }));
    await user.click(within(dialog).getByRole("button", { name: "Bring back" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Edit death of “Ghost”" }),
      ).not.toBeInTheDocument();
    });
    expect(await adapter.deaths.getAll()).toHaveLength(0);
    const ghost = (await adapter.mons.getAll()).find((m) => m.nickname === "Ghost");
    expect(ghost?.status).toBe("box");
  });

  it("greys out Party when the party is full", async () => {
    const user = userEvent.setup();
    const { dialog } = await openEdit(user, 6);

    await user.click(within(dialog).getByRole("button", { name: "This wasn't a death" }));
    await user.click(within(dialog).getByRole("combobox", { name: "Placement" }));

    expect(await screen.findByRole("option", { name: "Party" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(within(dialog).getByText("Party is full")).toBeInTheDocument();
  });
});
