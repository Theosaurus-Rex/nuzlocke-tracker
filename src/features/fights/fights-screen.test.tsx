import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";

import { DEFAULT_RULES } from "@/domain/rules";
import type { Fight, Rules } from "@/domain/types";
import type { StorageAdapter } from "@/storage/adapter";
import { createMemoryAdapter } from "@/storage/memory-adapter";
import { StorageProvider } from "@/storage/storage-context";

import { FightsScreen } from "./fights-screen";

type FightDraft = Omit<Fight, "id" | "createdAt" | "updatedAt">;

function fightDraft(runId: string, overrides: Partial<FightDraft>): FightDraft {
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

async function seed(adapter: StorageAdapter, rules: Rules = { ...DEFAULT_RULES, levelCaps: true }) {
  const run = await adapter.runs.put({
    name: "Test Run",
    game: "heartgold",
    status: "active",
    rules,
    finishedAt: null,
  });
  const falkner = await adapter.fights.put(
    fightDraft(run.id, {
      gameFightId: "gym-falkner",
      name: "Falkner",
      order: 1,
      levelCap: 13,
      status: "cleared",
    }),
  );
  const bugsy = await adapter.fights.put(
    fightDraft(run.id, { gameFightId: "gym-bugsy", name: "Bugsy", order: 2, levelCap: 17 }),
  );
  await adapter.fights.put(
    fightDraft(run.id, {
      gameFightId: "elite-four-will",
      name: "Will",
      kind: "elite_four",
      order: 3,
      grantsBadge: false,
      levelCap: 50,
    }),
  );
  const mon = await adapter.mons.put({
    runId: run.id,
    encounterId: null,
    speciesId: "caterpie",
    speciesIdCaught: "caterpie",
    nickname: "Nibbles",
    gender: null,
    level: 5,
    levelCaught: 5,
    nature: null,
    ability: null,
    heldItem: null,
    moves: [],
    status: "dead",
    partySlot: null,
    boxOrder: null,
    caughtRouteId: null,
    shiny: false,
  });
  await adapter.deaths.put({
    runId: run.id,
    monId: mon.id,
    level: 7,
    routeId: null,
    cause: {
      type: "trainer",
      fightId: falkner.id,
      trainerName: null,
      species: "pidgey",
      level: 9,
      move: null,
    },
    diedAt: "2020-01-01T00:00:00.000Z",
    notes: null,
  });
  return { run, falkner, bugsy };
}

function renderScreen(adapter: StorageAdapter, runId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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

async function findTable() {
  const element = await screen.findByRole("table", { name: "Fights" });
  return Object.assign(within(element), { element });
}

function rowFor(table: { element: HTMLElement }, text: string): HTMLElement {
  const row = within(table.element).getByText(text, { exact: false }).closest("tr");
  if (row === null) throw new Error(`no row for ${text}`);
  return row;
}

describe("FightsScreen", () => {
  it("lists the sections in order with their headers", async () => {
    const adapter = createMemoryAdapter();
    const { run } = await seed(adapter);
    renderScreen(adapter, run.id);

    const table = await findTable();
    const headers = table.getAllByRole("columnheader", { name: /^(Johto|Elite Four)$/ });
    expect(headers.map((h) => h.textContent)).toEqual(["Johto", "Elite Four"]);
    expect(table.getByText("Falkner · Zephyr")).toBeInTheDocument();
    expect(table.getByText("Will")).toBeInTheDocument();
  });

  it("marks a cleared fight as cleared and no other", async () => {
    const adapter = createMemoryAdapter();
    const { run } = await seed(adapter);
    renderScreen(adapter, run.id);

    const table = await findTable();
    expect(within(rowFor(table, "Falkner")).getByText("Cleared")).toBeInTheDocument();
    expect(table.getAllByText("Cleared")).toHaveLength(1);
  });

  it("marks only the first uncleared fight as the next one", async () => {
    const adapter = createMemoryAdapter();
    const { run } = await seed(adapter);
    renderScreen(adapter, run.id);

    const table = await findTable();
    expect(rowFor(table, "Bugsy")).toHaveAttribute("aria-current", "step");
    expect(rowFor(table, "Falkner")).not.toHaveAttribute("aria-current");
    expect(rowFor(table, "Will")).not.toHaveAttribute("aria-current");
  });

  it("shows a loss on its own fight's row with the mon's name", async () => {
    const adapter = createMemoryAdapter();
    const { run } = await seed(adapter);
    renderScreen(adapter, run.id);

    const table = await findTable();
    expect(within(rowFor(table, "Falkner")).getByText("“Nibbles” Caterpie")).toBeInTheDocument();
    expect(within(rowFor(table, "Bugsy")).queryByText(/Nibbles/)).not.toBeInTheDocument();
  });

  it("shows the badge count and level cap in the header", async () => {
    const adapter = createMemoryAdapter();
    const { run } = await seed(adapter);
    renderScreen(adapter, run.id);

    await findTable();
    expect(screen.getAllByText("1 of 2 badges").length).toBeGreaterThan(0);
    expect(screen.getByText("Cap L17")).toBeInTheDocument();
  });

  it("hides the level cap when level caps are off", async () => {
    const adapter = createMemoryAdapter();
    const { run } = await seed(adapter, { ...DEFAULT_RULES, levelCaps: false });
    renderScreen(adapter, run.id);

    await findTable();
    expect(screen.queryByText(/Cap L/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/· cap/)).not.toBeInTheDocument();
  });

  it("shows a gym badge in colour once cleared and muted until then", async () => {
    const adapter = createMemoryAdapter();
    const { run } = await seed(adapter);
    renderScreen(adapter, run.id);

    const table = await findTable();
    const cleared = rowFor(table, "Falkner").querySelector("img");
    expect(cleared).toHaveAttribute("src", expect.stringMatching(/\/badges\/9\.png$/));
    expect(cleared).toHaveAttribute("data-muted", "false");
    expect(rowFor(table, "Bugsy").querySelector("img")).toHaveAttribute("data-muted", "true");
  });

  it("shows no badge image on an Elite Four row", async () => {
    const adapter = createMemoryAdapter();
    const { run } = await seed(adapter);
    renderScreen(adapter, run.id);

    const table = await findTable();
    expect(rowFor(table, "Will").querySelector("img")).toBeNull();
  });

  it("shows the same muted states in the phone list", async () => {
    const adapter = createMemoryAdapter();
    const { run } = await seed(adapter);
    renderScreen(adapter, run.id);

    await findTable();
    const list = within(screen.getByRole("group", { name: "Fights" }));
    const item = (text: string) => list.getByText(text, { exact: false }).closest("li")!;
    expect(item("Falkner").querySelector("img")).toHaveAttribute("data-muted", "false");
    expect(item("Bugsy").querySelector("img")).toHaveAttribute("data-muted", "true");
    expect(item("Will").querySelector("img")).toBeNull();
  });

  it("offers Log on the next fight only", async () => {
    const adapter = createMemoryAdapter();
    const { run } = await seed(adapter);
    renderScreen(adapter, run.id);

    const table = await findTable();
    expect(table.getAllByRole("button", { name: /^Log attempt at/ })).toHaveLength(1);
    expect(table.getByRole("button", { name: "Log attempt at Bugsy" })).toBeInTheDocument();
  });

  it("returns a cleared fight to pending after confirming the undo", async () => {
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const { run } = await seed(adapter);
    renderScreen(adapter, run.id);

    const table = await findTable();
    await user.click(table.getByRole("button", { name: "Undo clear of Falkner" }));
    expect(table.getByText("Cleared")).toBeInTheDocument();
    await user.click(table.getByRole("button", { name: "Confirm undo" }));

    await waitFor(() => {
      expect(table.queryByText("Cleared")).not.toBeInTheDocument();
    });
    expect(rowFor(table, "Falkner")).toHaveAttribute("aria-current", "step");
  });

  describe("custom fights", () => {
    const isBefore = (first: HTMLElement, second: HTMLElement) =>
      Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

    async function openDialog(user: ReturnType<typeof userEvent.setup>) {
      await user.click(await screen.findByRole("button", { name: "Add fight" }));
      return screen.findByRole("dialog");
    }

    it("adds a fight before the next fight by default", async () => {
      const user = userEvent.setup();
      const adapter = createMemoryAdapter();
      const { run } = await seed(adapter);
      renderScreen(adapter, run.id);

      const dialog = within(await openDialog(user));
      expect(dialog.getByRole("combobox", { name: "Comes before" })).toHaveTextContent("Bugsy");
      await user.type(dialog.getByRole("textbox", { name: "Name" }), "Rematch");
      await user.click(dialog.getByRole("button", { name: "Add fight" }));

      const table = await findTable();
      await waitFor(() => {
        expect(table.getByText("Rematch")).toBeInTheDocument();
      });
      expect(isBefore(rowFor(table, "Falkner"), rowFor(table, "Rematch"))).toBe(true);
      expect(isBefore(rowFor(table, "Rematch"), rowFor(table, "Bugsy"))).toBe(true);
      expect(rowFor(table, "Rematch")).toHaveAttribute("aria-current", "step");
    });

    it("numbers repeated fight names, counting cleared ones", async () => {
      const user = userEvent.setup();
      const adapter = createMemoryAdapter();
      const run = await adapter.runs.put({
        name: "Test Run",
        game: "heartgold",
        status: "active",
        rules: DEFAULT_RULES,
        finishedAt: null,
      });
      await adapter.fights.put(
        fightDraft(run.id, {
          name: "Silver",
          kind: "rival",
          order: 1,
          grantsBadge: false,
          status: "cleared",
          clearedAt: "2020-01-01T00:00:00.000Z",
        }),
      );
      for (const order of [2, 3]) {
        await adapter.fights.put(
          fightDraft(run.id, { name: "Silver", kind: "rival", order, grantsBadge: false }),
        );
      }
      renderScreen(adapter, run.id);

      const dialog = within(await openDialog(user));
      const select = dialog.getByRole("combobox", { name: "Comes before" });
      expect(select).toHaveTextContent("Silver (2)");
      await user.click(select);
      expect(await screen.findByRole("option", { name: "Silver (3)" })).toBeInTheDocument();
      expect(screen.queryByRole("option", { name: "Silver (1)" })).not.toBeInTheDocument();
    });

    it("lets the fight go before a later fight", async () => {
      const user = userEvent.setup();
      const adapter = createMemoryAdapter();
      const { run } = await seed(adapter);
      renderScreen(adapter, run.id);

      const dialog = within(await openDialog(user));
      await user.type(dialog.getByRole("textbox", { name: "Name" }), "Rematch");
      await user.click(dialog.getByRole("combobox", { name: "Comes before" }));
      await user.click(await screen.findByRole("option", { name: "Will" }));
      await user.click(dialog.getByRole("button", { name: "Add fight" }));

      const table = await findTable();
      await waitFor(() => {
        expect(table.getByText("Rematch")).toBeInTheDocument();
      });
      expect(isBefore(rowFor(table, "Bugsy"), rowFor(table, "Rematch"))).toBe(true);
      expect(isBefore(rowFor(table, "Rematch"), rowFor(table, "Will"))).toBe(true);
      expect(rowFor(table, "Bugsy")).toHaveAttribute("aria-current", "step");
    });

    it("changes the header cap when the new fight is next and has a cap", async () => {
      const user = userEvent.setup();
      const adapter = createMemoryAdapter();
      const { run } = await seed(adapter);
      renderScreen(adapter, run.id);

      expect(await screen.findByText("Cap L17")).toBeInTheDocument();
      const dialog = within(await openDialog(user));
      await user.type(dialog.getByRole("textbox", { name: "Name" }), "Rematch");
      await user.type(dialog.getByRole("textbox", { name: "Level cap (optional)" }), "15");
      await user.click(dialog.getByRole("button", { name: "Add fight" }));

      expect(await screen.findByText("Cap L15")).toBeInTheDocument();
    });

    it("keeps only digits typed into the level cap", async () => {
      const user = userEvent.setup();
      const adapter = createMemoryAdapter();
      const { run } = await seed(adapter);
      renderScreen(adapter, run.id);

      const dialog = within(await openDialog(user));
      const cap = dialog.getByRole("textbox", { name: "Level cap (optional)" });
      await user.type(cap, "2a5");

      expect(cap).toHaveValue("25");
    });

    it("requires a name", async () => {
      const user = userEvent.setup();
      const adapter = createMemoryAdapter();
      const { run } = await seed(adapter);
      renderScreen(adapter, run.id);

      const dialog = within(await openDialog(user));
      await user.type(dialog.getByRole("textbox", { name: "Name" }), "   ");
      await user.click(dialog.getByRole("button", { name: "Add fight" }));

      expect(dialog.getByText("Fight name is required.")).toBeInTheDocument();
      expect(await adapter.fights.where("runId", run.id)).toHaveLength(3);
    });

    it.each(["0", "101"])("refuses a level cap of %s", async (cap) => {
      const user = userEvent.setup();
      const adapter = createMemoryAdapter();
      const { run } = await seed(adapter);
      renderScreen(adapter, run.id);

      const dialog = within(await openDialog(user));
      await user.type(dialog.getByRole("textbox", { name: "Name" }), "Rematch");
      await user.type(dialog.getByRole("textbox", { name: "Level cap (optional)" }), cap);
      await user.click(dialog.getByRole("button", { name: "Add fight" }));

      expect(dialog.getByText(/Level cap must be a whole number/)).toBeInTheDocument();
      expect(await adapter.fights.where("runId", run.id)).toHaveLength(3);
    });

    it("hides Comes before and adds at the end when every fight is cleared", async () => {
      const user = userEvent.setup();
      const adapter = createMemoryAdapter();
      const { run } = await seed(adapter);
      for (const fight of await adapter.fights.where("runId", run.id)) {
        await adapter.fights.put({
          ...fight,
          status: "cleared",
          clearedAt: "2020-01-01T00:00:00.000Z",
        });
      }
      renderScreen(adapter, run.id);

      const dialog = within(await openDialog(user));
      expect(dialog.queryByRole("combobox", { name: "Comes before" })).not.toBeInTheDocument();
      await user.type(dialog.getByRole("textbox", { name: "Name" }), "Epilogue");
      await user.click(dialog.getByRole("button", { name: "Add fight" }));

      const table = await findTable();
      await waitFor(() => {
        expect(rowFor(table, "Epilogue")).toBeInTheDocument();
      });
      const last = (await adapter.fights.where("runId", run.id)).sort(
        (a, b) => b.order - a.order,
      )[0];
      expect(last?.name).toBe("Epilogue");
    });

    it("offers Delete only on a pending custom fight and removes it", async () => {
      const user = userEvent.setup();
      const adapter = createMemoryAdapter();
      const { run } = await seed(adapter);
      await adapter.fights.put(
        fightDraft(run.id, { name: "Rematch", kind: "custom", order: 4, grantsBadge: false }),
      );
      await adapter.fights.put(
        fightDraft(run.id, {
          name: "Old",
          kind: "custom",
          order: 0,
          grantsBadge: false,
          status: "cleared",
          clearedAt: "2020-01-01T00:00:00.000Z",
        }),
      );
      renderScreen(adapter, run.id);

      const table = await findTable();
      expect(table.getAllByRole("button", { name: /^Delete / })).toHaveLength(1);
      await user.click(table.getByRole("button", { name: "Delete Rematch" }));

      await waitFor(() => {
        expect(table.queryByText("Rematch")).not.toBeInTheDocument();
      });
      expect(table.queryByRole("button", { name: /^Delete / })).not.toBeInTheDocument();
    });

    it("lets a custom fight be logged", async () => {
      const user = userEvent.setup();
      const adapter = createMemoryAdapter();
      const { run } = await seed(adapter);
      await adapter.fights.put(
        fightDraft(run.id, { name: "Rematch", kind: "custom", order: 0, grantsBadge: false }),
      );
      renderScreen(adapter, run.id);

      const table = await findTable();
      await user.click(table.getByRole("button", { name: "Log attempt at Rematch" }));

      expect(await screen.findByRole("dialog")).toHaveTextContent("Attempt: Rematch");
    });
  });
});
