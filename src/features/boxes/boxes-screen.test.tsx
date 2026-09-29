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

async function cardHeadings(): Promise<string[]> {
  const headings = await screen.findAllByRole("heading", { level: 2 });
  return headings.map((heading) => heading.textContent ?? "");
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

  it("orders by box order across gaps and puts a null order last", () => {
    const at = "2026-09-27T00:00:00.000Z";
    const result = boxedMons([
      mon("none", at, { boxOrder: null }),
      mon("c", at, { boxOrder: 7 }),
      mon("a", at, { boxOrder: 0 }),
      mon("b", at, { boxOrder: 3 }),
    ]);
    expect(result.map((m) => m.id)).toEqual(["a", "b", "c", "none"]);
  });

  it("breaks a tie on box order by creation time, whatever the input order", () => {
    const result = boxedMons([
      mon("late", "2026-09-27T00:00:03.000Z", { boxOrder: 1 }),
      mon("early", "2026-09-27T00:00:01.000Z", { boxOrder: 1 }),
      mon("mid", "2026-09-27T00:00:02.000Z", { boxOrder: 1 }),
    ]);
    expect(result.map((m) => m.id)).toEqual(["early", "mid", "late"]);
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

    expect(await cardHeadings()).toEqual(["“First”", "“Second”"]);
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
      await screen.findByText("“Sprig”");

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
      expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
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
