import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";

import { DEFAULT_RULES } from "@/domain/rules";
import type { Mon } from "@/domain/types";
import type { StorageAdapter } from "@/storage/adapter";
import { createMemoryAdapter } from "@/storage/memory-adapter";
import { StorageProvider } from "@/storage/storage-context";

import { BoxesScreen, boxedMons } from "./boxes-screen";
import { BOX_VIEW_STORAGE_KEY } from "./use-box-view";

type MonDraft = Omit<Mon, "id" | "createdAt" | "updatedAt">;

function makeMonDraft(runId: string, overrides: Partial<Mon> = {}): MonDraft {
  return {
    runId,
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
    status: "box",
    partySlot: null,
    boxOrder: 0,
    caughtRouteId: null,
    shiny: false,
    ...overrides,
  };
}

function mon(id: string, createdAt: string, overrides: Partial<Mon> = {}): Mon {
  return {
    ...makeMonDraft("run-1", overrides),
    id,
    createdAt,
    updatedAt: createdAt,
  };
}

async function seedRun(adapter: StorageAdapter) {
  return adapter.runs.put({
    name: "Test Run",
    game: "heartgold",
    status: "active",
    rules: DEFAULT_RULES,
    finishedAt: null,
  });
}

function renderScreen(adapter: StorageAdapter, runId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <StorageProvider adapter={adapter}>
        <MemoryRouter initialEntries={[`/runs/${runId}/boxes`]}>
          <Routes>
            <Route path="/runs/:runId/boxes" element={<BoxesScreen />} />
          </Routes>
        </MemoryRouter>
      </StorageProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

async function gridNames(): Promise<string[]> {
  const buttons = await screen.findAllByRole("button", { name: /^Edit / });
  return buttons.map((button) => (button.getAttribute("aria-label") ?? "").replace("Edit ", ""));
}

async function openList(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "List" }));
}

async function tableNames(): Promise<string[]> {
  const table = await screen.findByRole("table");
  return within(table)
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell").at(1)?.textContent ?? "");
}

describe("boxedMons", () => {
  it("keeps only boxed mons", () => {
    const result = boxedMons([
      mon("party", "2026-09-27T00:00:00.000Z", { status: "party", partySlot: 0, boxOrder: null }),
      mon("boxed", "2026-09-27T00:00:00.000Z"),
      mon("dead", "2026-09-27T00:00:00.000Z", { status: "dead", boxOrder: null }),
    ]);
    expect(result.map((m) => m.id)).toEqual(["boxed"]);
  });

  it("orders by slot across gaps and fills a null order into the lowest free slot", () => {
    const at = "2026-09-27T00:00:00.000Z";
    const result = boxedMons([
      mon("none", at, { boxOrder: null }),
      mon("c", at, { boxOrder: 7 }),
      mon("a", at, { boxOrder: 0 }),
      mon("b", at, { boxOrder: 3 }),
    ]);
    expect(result.map((m) => m.id)).toEqual(["a", "none", "b", "c"]);
  });

  it("gives a shared slot to the earliest catch and moves the rest to free slots", () => {
    const result = boxedMons([
      mon("late", "2026-09-27T00:00:03.000Z", { boxOrder: 1 }),
      mon("early", "2026-09-27T00:00:01.000Z", { boxOrder: 1 }),
      mon("mid", "2026-09-27T00:00:02.000Z", { boxOrder: 1 }),
    ]);
    expect(result.map((m) => m.id)).toEqual(["mid", "early", "late"]);
  });

  it("breaks a tie between null orders by creation time", () => {
    const result = boxedMons([
      mon("late", "2026-09-27T00:00:02.000Z", { boxOrder: null }),
      mon("early", "2026-09-27T00:00:01.000Z", { boxOrder: null }),
    ]);
    expect(result.map((m) => m.id)).toEqual(["early", "late"]);
  });
});

describe("BoxesScreen", () => {
  it("shows boxed mons in order and skips party and dead mons", async () => {
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);
    await adapter.mons.put(makeMonDraft(run.id, { nickname: "Second", boxOrder: 4 }));
    await adapter.mons.put(makeMonDraft(run.id, { nickname: "First", boxOrder: 1 }));
    await adapter.mons.put(
      makeMonDraft(run.id, { nickname: "Partied", status: "party", partySlot: 0, boxOrder: null }),
    );
    await adapter.mons.put(
      makeMonDraft(run.id, { nickname: "Gone", status: "dead", boxOrder: null }),
    );

    renderScreen(adapter, run.id);

    expect(await gridNames()).toEqual(["“First”", "“Second”"]);
    expect(screen.getByText("2 stored")).toBeInTheDocument();
  });

  it("says so when the boxes are empty", async () => {
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);

    renderScreen(adapter, run.id);

    expect(await screen.findByText("No one in your boxes yet")).toBeInTheDocument();
    expect(screen.getByText("0 stored")).toBeInTheDocument();
  });

  describe("view toggle", () => {
    async function setup() {
      const adapter = createMemoryAdapter();
      const run = await seedRun(adapter);
      await adapter.mons.put(makeMonDraft(run.id, { nickname: "Sprig" }));
      return { adapter, runId: run.id };
    }

    it("starts on grid and switches to list when clicked", async () => {
      const { adapter, runId } = await setup();
      renderScreen(adapter, runId);
      await screen.findByRole("button", { name: "Edit “Sprig”" });

      expect(screen.getByRole("button", { name: "Grid" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "false");

      fireEvent.click(screen.getByRole("button", { name: "List" }));

      expect(screen.getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "Grid" })).toHaveAttribute("aria-pressed", "false");
    });

    it("remembers the choice after the screen remounts", async () => {
      const { adapter, runId } = await setup();
      const first = renderScreen(adapter, runId);
      fireEvent.click(await screen.findByRole("button", { name: "List" }));
      first.unmount();

      renderScreen(adapter, runId);

      expect(await screen.findByRole("button", { name: "List" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    it("falls back to grid when the stored value is not a known view", async () => {
      localStorage.setItem(BOX_VIEW_STORAGE_KEY, "banana");
      const { adapter, runId } = await setup();

      renderScreen(adapter, runId);

      expect(await screen.findByRole("button", { name: "Grid" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    it("falls back to grid when storage cannot be read", async () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("blocked");
      });
      const { adapter, runId } = await setup();

      renderScreen(adapter, runId);

      expect(await screen.findByRole("button", { name: "Grid" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    it("still switches view when storage cannot be written", async () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("blocked");
      });
      const errors: unknown[] = [];
      const onError = (event: ErrorEvent) => {
        event.preventDefault();
        errors.push(event.error);
      };
      window.addEventListener("error", onError);
      const { adapter, runId } = await setup();
      renderScreen(adapter, runId);

      fireEvent.click(await screen.findByRole("button", { name: "List" }));
      window.removeEventListener("error", onError);

      expect(errors).toEqual([]);
      expect(screen.getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "true");
    });

    it("lists boxed mons in box order in the list view", async () => {
      const adapter = createMemoryAdapter();
      const run = await seedRun(adapter);
      await adapter.mons.put(makeMonDraft(run.id, { nickname: "Second", boxOrder: 4 }));
      await adapter.mons.put(makeMonDraft(run.id, { nickname: "First", boxOrder: 1 }));
      await adapter.mons.put(
        makeMonDraft(run.id, {
          nickname: "Partied",
          status: "party",
          partySlot: 0,
          boxOrder: null,
        }),
      );
      renderScreen(adapter, run.id);

      fireEvent.click(await screen.findByRole("button", { name: "List" }));

      const table = await screen.findByRole("table");
      const names = within(table)
        .getAllByRole("row")
        .slice(1)
        .map((row) => within(row).getAllByRole("cell").at(1)?.textContent);
      expect(names).toEqual(["“First”", "“Second”"]);
      expect(screen.queryByText("Tap a Pokémon to edit it.")).not.toBeInTheDocument();
    });
  });

  describe("sorting and searching", () => {
    async function setup(drafts: Partial<Mon>[]) {
      const adapter = createMemoryAdapter();
      const run = await seedRun(adapter);
      for (const [boxOrder, draft] of drafts.entries()) {
        await adapter.mons.put(makeMonDraft(run.id, { boxOrder, ...draft }));
      }
      renderScreen(adapter, run.id);
    }

    async function chooseSort(user: ReturnType<typeof userEvent.setup>, label: string) {
      await user.click(await screen.findByRole("combobox", { name: "Sort boxes" }));
      await user.click(await screen.findByRole("option", { name: label }));
    }

    function phoneNames(): string[] {
      const list = screen.getByRole("list");
      return within(list)
        .getAllByRole("listitem")
        .map(
          (item) =>
            within(item)
              .getByRole("button", { name: /^Edit / })
              .getAttribute("aria-label") ?? "",
        );
    }

    it("starts in slot order with nothing sorted", async () => {
      const user = userEvent.setup();
      await setup([
        { nickname: "Low", level: 5 },
        { nickname: "High", level: 9 },
      ]);
      await openList(user);

      expect(await tableNames()).toEqual(["“Low”", "“High”"]);
      expect(screen.getByRole("combobox", { name: "Sort boxes" })).toHaveTextContent(
        "Sort: Caught",
      );
      expect(screen.getByRole("button", { name: "Sort direction: ascending" })).toBeDisabled();
    });

    it("reorders the table when the Lvl header is clicked", async () => {
      const user = userEvent.setup();
      await setup([
        { nickname: "Low", level: 5 },
        { nickname: "High", level: 9 },
        { nickname: "Mid", level: 7 },
      ]);
      await openList(user);

      await user.click(
        within(await screen.findByRole("columnheader", { name: "Lvl" })).getByRole("button"),
      );

      expect(await tableNames()).toEqual(["“Low”", "“Mid”", "“High”"]);
    });

    it("sorts the phone list with the sort control and its direction button", async () => {
      const user = userEvent.setup();
      await setup([
        { nickname: "Low", level: 5 },
        { nickname: "High", level: 9 },
        { nickname: "Mid", level: 7 },
      ]);
      await openList(user);

      await chooseSort(user, "Level");
      expect(phoneNames()).toEqual(["Edit “Low”", "Edit “Mid”", "Edit “High”"]);

      await user.click(screen.getByRole("button", { name: "Sort direction: ascending" }));
      expect(
        screen.getByRole("button", { name: "Sort direction: descending" }),
      ).toBeInTheDocument();
      expect(phoneNames()).toEqual(["Edit “High”", "Edit “Mid”", "Edit “Low”"]);

      await chooseSort(user, "Caught");
      expect(phoneNames()).toEqual(["Edit “Low”", "Edit “High”", "Edit “Mid”"]);
    });

    it("shares one sort between the table and the phone list", async () => {
      const user = userEvent.setup();
      await setup([
        { nickname: "Low", level: 5 },
        { nickname: "High", level: 9 },
      ]);
      await openList(user);

      await user.click(
        within(await screen.findByRole("columnheader", { name: "Lvl" })).getByRole("button"),
      );
      await user.click(
        within(screen.getByRole("columnheader", { name: "Lvl" })).getByRole("button"),
      );

      expect(phoneNames()).toEqual(["Edit “High”", "Edit “Low”"]);
      expect(screen.getByRole("combobox", { name: "Sort boxes" })).toHaveTextContent("Sort: Level");
    });

    it("narrows the table as you type", async () => {
      const user = userEvent.setup();
      await setup([{ nickname: "Sprig" }, { nickname: "Zubb" }, { nickname: "Spark" }]);
      await openList(user);

      await user.type(screen.getByRole("textbox", { name: "Search boxes" }), "sp");

      expect(await tableNames()).toEqual(["“Sprig”", "“Spark”"]);
    });

    it("says nothing matches, and still counts everyone stored", async () => {
      const user = userEvent.setup();
      await setup([{ nickname: "Sprig" }, { nickname: "Zubb" }]);
      await openList(user);

      await user.type(screen.getByRole("textbox", { name: "Search boxes" }), "qq");

      expect(await screen.findByText("No boxed mons match “qq”")).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(screen.getByText("2 stored")).toBeInTheDocument();
      expect(screen.queryByText("No one in your boxes yet")).not.toBeInTheDocument();
    });

    it("brings the rows back when the search is cleared", async () => {
      const user = userEvent.setup();
      await setup([{ nickname: "Sprig" }, { nickname: "Zubb" }]);
      await openList(user);
      await user.type(screen.getByRole("textbox", { name: "Search boxes" }), "qq");

      await user.click(await screen.findByRole("button", { name: "Clear search" }));

      expect(await tableNames()).toEqual(["“Sprig”", "“Zubb”"]);
    });

    it("hides sort and search in grid view and shows them in list view", async () => {
      const user = userEvent.setup();
      await setup([{ nickname: "Sprig" }]);
      await screen.findByRole("button", { name: "Edit “Sprig”" });

      expect(screen.queryByRole("combobox", { name: "Sort boxes" })).not.toBeInTheDocument();
      expect(screen.queryByRole("textbox", { name: "Search boxes" })).not.toBeInTheDocument();

      await openList(user);

      expect(screen.getByRole("combobox", { name: "Sort boxes" })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: "Search boxes" })).toBeInTheDocument();
    });

    it("has no search box for an empty box", async () => {
      const user = userEvent.setup();
      await setup([]);
      await openList(user);

      await screen.findByText("No one in your boxes yet");
      expect(screen.queryByRole("textbox", { name: "Search boxes" })).not.toBeInTheDocument();
    });
  });

  describe("editing a mon", () => {
    async function setup() {
      const adapter = createMemoryAdapter();
      const run = await seedRun(adapter);
      await adapter.mons.put(makeMonDraft(run.id, { nickname: "First", boxOrder: 0, level: 7 }));
      await adapter.mons.put(makeMonDraft(run.id, { nickname: "Second", boxOrder: 1, level: 9 }));
      renderScreen(adapter, run.id);
    }

    it("opens the dialog for the tapped grid card", async () => {
      const user = userEvent.setup();
      await setup();

      await user.click(await screen.findByRole("button", { name: "Edit “Second”" }));

      expect(await screen.findByLabelText("Current level")).toHaveValue("9");
    });

    it("opens the dialog for the tapped list row", async () => {
      const user = userEvent.setup();
      await setup();
      await user.click(await screen.findByRole("button", { name: "List" }));

      const table = await screen.findByRole("table");
      await user.click(within(table).getByRole("button", { name: "Edit “Second”" }));

      expect(await screen.findByLabelText("Current level")).toHaveValue("9");
    });
  });
});
