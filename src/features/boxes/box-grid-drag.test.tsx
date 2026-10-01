import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";

import { BOX_SIZE } from "@/domain/box-slots";
import { DEFAULT_RULES } from "@/domain/rules";
import type { Mon } from "@/domain/types";
import type { StorageAdapter } from "@/storage/adapter";
import { createMemoryAdapter } from "@/storage/memory-adapter";
import { StorageProvider } from "@/storage/storage-context";

import { BoxesScreen } from "./boxes-screen";

type MonDraft = Omit<Mon, "id" | "createdAt" | "updatedAt">;

function draft(runId: string, nickname: string, boxOrder: number): MonDraft {
  return {
    runId,
    encounterId: null,
    speciesId: "chikorita",
    speciesIdCaught: "chikorita",
    nickname,
    gender: null,
    level: 5,
    levelCaught: 5,
    nature: null,
    ability: null,
    heldItem: null,
    moves: [],
    status: "box",
    partySlot: null,
    boxOrder,
    caughtRouteId: null,
    shiny: false,
  };
}

async function seed(adapter: StorageAdapter, mons: Record<string, number>) {
  const run = await adapter.runs.put({
    name: "Test Run",
    game: "heartgold",
    status: "active",
    rules: DEFAULT_RULES,
    finishedAt: null,
  });
  const saved: Record<string, Mon> = {};
  for (const [name, slot] of Object.entries(mons)) {
    saved[name] = await adapter.mons.put(draft(run.id, name, slot));
  }
  return { run, saved };
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

const COLUMNS = 5;
const CELL = 110;

function stubLayout(liftedIndex: number): void {
  const cell = (index: number) =>
    new DOMRect((index % COLUMNS) * CELL, 100 + Math.floor(index / COLUMNS) * CELL, 100, 100);
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const item = this.closest("li");
    if (item?.parentElement?.tagName === "UL") {
      return cell(Array.from(item.parentElement.children).indexOf(item));
    }
    const group = this.closest("[aria-label='Choose box']");
    if (this.tagName === "BUTTON" && group) {
      return new DOMRect(Array.from(group.children).indexOf(this) * CELL, 0, 100, 40);
    }
    return cell(liftedIndex);
  });
}

function liveAnnouncement(): string {
  return document.querySelector("[id^=DndLiveRegion]")?.textContent ?? "";
}

function slotIndexOf(name: string): number {
  const item = screen.getByRole("button", { name: `Edit “${name}”` }).closest("li")!;
  return Array.from(item.parentElement!.children).indexOf(item);
}

async function focusMon(name: string): Promise<void> {
  (await screen.findByRole("button", { name: `Edit “${name}”` })).focus();
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("dragging in the boxes grid", () => {
  it("moves a mon to an empty slot from the keyboard and says so", async () => {
    stubLayout(0);
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const { run, saved } = await seed(adapter, { Sprig: 0 });
    renderScreen(adapter, run.id);

    await focusMon("Sprig");
    await user.keyboard(" ");
    expect(liveAnnouncement()).toBe("Picked up “Sprig”. Box 1, slot 1.");
    await user.keyboard("{ArrowRight}{ArrowRight}");
    await user.keyboard(" ");

    await waitFor(async () => {
      expect(await adapter.mons.get(saved.Sprig!.id)).toMatchObject({ boxOrder: 2 });
    });
    expect(liveAnnouncement()).toBe("Moved “Sprig” to box 1, slot 3.");
  });

  it("swaps with the mon in the target slot and saves both", async () => {
    stubLayout(0);
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const { run, saved } = await seed(adapter, { Sprig: 0, Zubb: 1 });
    renderScreen(adapter, run.id);

    await focusMon("Sprig");
    await user.keyboard(" ");
    await user.keyboard("{ArrowRight}");
    await user.keyboard(" ");

    await waitFor(async () => {
      expect(await adapter.mons.get(saved.Sprig!.id)).toMatchObject({ boxOrder: 1 });
    });
    expect(await adapter.mons.get(saved.Zubb!.id)).toMatchObject({ boxOrder: 0 });
    expect(liveAnnouncement()).toBe("Swapped “Sprig” with “Zubb”.");
  });

  it("opens the edit dialog on Enter and does not start a drag", async () => {
    stubLayout(0);
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const { run } = await seed(adapter, { Sprig: 0 });
    renderScreen(adapter, run.id);

    await focusMon("Sprig");
    await user.keyboard("{Enter}");

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(liveAnnouncement()).toBe("");
  });

  it("does not open the edit dialog when Space drops the mon", async () => {
    stubLayout(0);
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const { run } = await seed(adapter, { Sprig: 0 });
    renderScreen(adapter, run.id);

    await focusMon("Sprig");
    await user.keyboard(" ");
    await user.keyboard("{ArrowRight}");
    await user.keyboard(" ");

    await waitFor(() => {
      expect(liveAnnouncement()).toBe("Moved “Sprig” to box 1, slot 2.");
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("cancels on Escape without saving", async () => {
    stubLayout(0);
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const { run, saved } = await seed(adapter, { Sprig: 0 });
    renderScreen(adapter, run.id);

    await focusMon("Sprig");
    await user.keyboard(" ");
    await user.keyboard("{ArrowRight}");
    await user.keyboard("{Escape}");

    expect(liveAnnouncement()).toBe("Cancelled. “Sprig” is back in box 1, slot 1.");
    expect(await adapter.mons.get(saved.Sprig!.id)).toMatchObject({ boxOrder: 0 });
  });

  it("opens edit on a click that moves under eight pixels", async () => {
    stubLayout(0);
    const adapter = createMemoryAdapter();
    const { run } = await seed(adapter, { Sprig: 0 });
    renderScreen(adapter, run.id);
    const button = await screen.findByRole("button", { name: "Edit “Sprig”" });

    fireEvent.mouseDown(button, { clientX: 10, clientY: 10, button: 0 });
    fireEvent.mouseMove(document, { clientX: 14, clientY: 10 });
    fireEvent.mouseUp(document, { clientX: 14, clientY: 10 });
    fireEvent.click(button);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(liveAnnouncement()).toBe("");
  });

  it("starts a mouse drag after eight pixels", async () => {
    stubLayout(0);
    const adapter = createMemoryAdapter();
    const { run } = await seed(adapter, { Sprig: 0 });
    renderScreen(adapter, run.id);
    const button = await screen.findByRole("button", { name: "Edit “Sprig”" });

    fireEvent.mouseDown(button, { clientX: 10, clientY: 10, button: 0 });
    fireEvent.mouseMove(document, { clientX: 30, clientY: 10 });

    await waitFor(() => {
      expect(liveAnnouncement()).toBe("Picked up “Sprig”. Box 1, slot 1.");
    });
    fireEvent.keyDown(document, { code: "Escape" });
  });

  describe("moving between boxes", () => {
    async function fullBoxSetup() {
      const adapter = createMemoryAdapter();
      const names: Record<string, number> = {};
      for (let slot = 0; slot < BOX_SIZE; slot += 1) {
        names[`m${String(slot)}`] = slot;
      }
      const { run, saved } = await seed(adapter, names);
      return { adapter, run, saved };
    }

    async function startOverBoxTwo(user: ReturnType<typeof userEvent.setup>) {
      await focusMon("m0");
      await user.keyboard(" ");
      await user.keyboard("{ArrowUp}{ArrowRight}");
      expect(liveAnnouncement()).toBe("Over Box 2. Hold to open it.");
    }

    const wait = (ms: number) => act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));

    function boxTwoIsOpen(): boolean {
      return screen.getByRole("button", { name: "Box 2" }).getAttribute("aria-pressed") === "true";
    }

    it("switches the box after hovering a box button for 500ms and drops there", async () => {
      stubLayout(0);
      const user = userEvent.setup();
      const { adapter, run, saved } = await fullBoxSetup();
      renderScreen(adapter, run.id);

      await startOverBoxTwo(user);
      await wait(600);
      expect(boxTwoIsOpen()).toBe(true);
      expect(screen.queryByRole("button", { name: "Edit “m0”" })).not.toBeInTheDocument();
      await user.keyboard("{ArrowDown}");
      await user.keyboard(" ");

      await waitFor(async () => {
        expect(await adapter.mons.get(saved.m0!.id)).toMatchObject({ boxOrder: BOX_SIZE + 1 });
      });
      expect(liveAnnouncement()).toBe("Moved “m0” to box 2, slot 2.");
    });

    it("does not switch when the hover is shorter than 500ms", async () => {
      stubLayout(0);
      const user = userEvent.setup();
      const { adapter, run } = await fullBoxSetup();
      renderScreen(adapter, run.id);

      await startOverBoxTwo(user);
      await wait(300);

      expect(boxTwoIsOpen()).toBe(false);
      await user.keyboard("{Escape}");
    });

    it("does nothing when dropped on a box button, and the pending switch is cleared", async () => {
      stubLayout(0);
      const user = userEvent.setup();
      const { adapter, run, saved } = await fullBoxSetup();
      renderScreen(adapter, run.id);

      await startOverBoxTwo(user);
      await wait(200);
      await user.keyboard(" ");
      await wait(500);

      expect(boxTwoIsOpen()).toBe(false);
      expect(await adapter.mons.get(saved.m0!.id)).toMatchObject({ boxOrder: 0 });
    });

    it("clears the pending switch when the drag is cancelled", async () => {
      stubLayout(0);
      const user = userEvent.setup();
      const { adapter, run } = await fullBoxSetup();
      renderScreen(adapter, run.id);

      await startOverBoxTwo(user);
      await wait(200);
      await user.keyboard("{Escape}");
      await wait(500);

      expect(boxTwoIsOpen()).toBe(false);
    });
  });

  it("puts the mon back and says so when saving fails", async () => {
    stubLayout(0);
    const user = userEvent.setup();
    const base = createMemoryAdapter();
    const adapter: StorageAdapter = {
      ...base,
      transaction: () => Promise.reject(new Error("simulated failure")),
    };
    const { run } = await seed(adapter, { Sprig: 0 });
    renderScreen(adapter, run.id);

    await focusMon("Sprig");
    await user.keyboard(" ");
    await user.keyboard("{ArrowRight}");
    await user.keyboard(" ");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not move that Pokémon. Nothing was changed.",
    );
    expect(slotIndexOf("Sprig")).toBe(0);
  });

  it("shows the mon in its new slot while the move is saving", async () => {
    stubLayout(0);
    const user = userEvent.setup();
    const base = createMemoryAdapter();
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const adapter: StorageAdapter = {
      ...base,
      transaction: async (fn) => {
        await held;
        return base.transaction(fn);
      },
    };
    const { run } = await seed(adapter, { Sprig: 0 });
    renderScreen(adapter, run.id);

    await focusMon("Sprig");
    await user.keyboard(" ");
    await user.keyboard("{ArrowRight}{ArrowRight}");
    await user.keyboard(" ");

    await waitFor(() => expect(slotIndexOf("Sprig")).toBe(2));
    await act(async () => {
      release();
      await held;
    });
    await waitFor(() => expect(slotIndexOf("Sprig")).toBe(2));
  });
});
