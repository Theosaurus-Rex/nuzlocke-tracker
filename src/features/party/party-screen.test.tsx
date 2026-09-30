import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";

import { DEFAULT_RULES } from "@/domain/rules";
import type { Mon } from "@/domain/types";
import type { StorageAdapter } from "@/storage/adapter";
import { createMemoryAdapter } from "@/storage/memory-adapter";
import { StorageProvider } from "@/storage/storage-context";
import { defaultPokeApiRoutes, stubPokeApi } from "@/test/pokeapi-fetch";

import { PartyScreen, partyMembers } from "./party-screen";

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
    status: "party",
    partySlot: 0,
    boxOrder: null,
    caughtRouteId: null,
    shiny: false,
    ...overrides,
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
        <MemoryRouter initialEntries={[`/runs/${runId}/party`]}>
          <Routes>
            <Route path="/runs/:runId/party" element={<PartyScreen />} />
          </Routes>
        </MemoryRouter>
      </StorageProvider>
    </QueryClientProvider>,
  );
}

async function cardHeadings(): Promise<string[]> {
  const headings = await screen.findAllByRole("heading", { level: 2 });
  return headings.map((heading) => heading.textContent ?? "");
}

beforeEach(() => {
  stubPokeApi(defaultPokeApiRoutes);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function fireTouch(target: Element, type: string, x: number, y: number): void {
  const touch = { identifier: 1, target, clientX: x, clientY: y, pageX: x, pageY: y };
  const event = new TouchEvent(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "touches", { value: type === "touchend" ? [] : [touch] });
  Object.defineProperty(event, "changedTouches", { value: [touch] });
  fireEvent(target, event);
}

function liveAnnouncement(): string {
  return document.querySelector("[id^=DndLiveRegion]")?.textContent ?? "";
}

function stubTwoColumnLayout(): void {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const item = this.closest("li[style]") ?? (this.tagName === "LI" ? this : null);
    const siblings = item?.parentElement ? Array.from(item.parentElement.children) : [];
    const index = item ? siblings.indexOf(item) : 0;
    const left = (index % 2) * 300;
    const top = Math.floor(index / 2) * 300;
    return new DOMRect(left, top, 250, 250);
  });
}

describe("partyMembers", () => {
  it("keeps only party mons, ordered by slot across gaps", () => {
    const mon = (id: string, overrides: Partial<Mon>): Mon => ({
      ...makeMonDraft("run-1", overrides),
      id,
      createdAt: "2026-09-27T00:00:00.000Z",
      updatedAt: "2026-09-27T00:00:00.000Z",
    });
    const result = partyMembers([
      mon("e", { partySlot: 5 }),
      mon("boxed", { status: "box", partySlot: null, boxOrder: 0 }),
      mon("a", { partySlot: 0 }),
      mon("dead", { status: "dead", partySlot: null }),
      mon("c", { partySlot: 2 }),
    ]);
    expect(result.map((m) => m.id)).toEqual(["a", "c", "e"]);
  });

  it("sorts a party mon with no slot last, not first", () => {
    const mon = (id: string, overrides: Partial<Mon>): Mon => ({
      ...makeMonDraft("run-1", overrides),
      id,
      createdAt: "2026-09-27T00:00:00.000Z",
      updatedAt: "2026-09-27T00:00:00.000Z",
    });
    const result = partyMembers([
      mon("no-slot", { partySlot: null }),
      mon("a", { partySlot: 0 }),
      mon("c", { partySlot: 3 }),
    ]);
    expect(result.map((m) => m.id)).toEqual(["a", "c", "no-slot"]);
  });
});

describe("PartyScreen", () => {
  it("shows party mons in slot order, not creation order, and skips box and dead mons", async () => {
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);
    await adapter.mons.put(makeMonDraft(run.id, { nickname: "Last", partySlot: 5 }));
    await adapter.mons.put(makeMonDraft(run.id, { nickname: "First", partySlot: 0 }));
    await adapter.mons.put(
      makeMonDraft(run.id, { nickname: "Boxed", status: "box", partySlot: null, boxOrder: 0 }),
    );
    await adapter.mons.put(
      makeMonDraft(run.id, { nickname: "Gone", status: "dead", partySlot: null }),
    );
    await adapter.mons.put(makeMonDraft(run.id, { nickname: "Middle", partySlot: 2 }));

    renderScreen(adapter, run.id);

    expect(await cardHeadings()).toEqual(["“First”", "“Middle”", "“Last”"]);
    expect(screen.getByText("3 of 6")).toBeInTheDocument();
  });

  it("names the route a mon was caught on", async () => {
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);
    const route = await adapter.routes.put({
      runId: run.id,
      name: "Route 29",
      order: 1,
      isCustom: false,
      gameRouteId: null,
    });
    await adapter.mons.put(makeMonDraft(run.id, { caughtRouteId: route.id }));

    renderScreen(adapter, run.id);

    const item = await screen.findByText("no item");
    expect(item.closest("p")?.textContent).toBe("no item · Route 29");
  });

  it("says so when the party is empty", async () => {
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);

    renderScreen(adapter, run.id);

    expect(await screen.findByText("No one in your party yet")).toBeInTheDocument();
    expect(screen.getByText("0 of 6")).toBeInTheDocument();
  });

  it("opens the edit dialog for the tapped mon, and a saved level shows on its card", async () => {
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);
    await adapter.mons.put(makeMonDraft(run.id, { nickname: "First", partySlot: 0, level: 7 }));
    await adapter.mons.put(makeMonDraft(run.id, { nickname: "Second", partySlot: 1, level: 9 }));
    renderScreen(adapter, run.id);

    await user.click(await screen.findByRole("button", { name: "Edit “Second”" }));

    const level = await screen.findByLabelText("Current level");
    expect(level).toHaveValue("9");
    await user.clear(level);
    await user.type(level, "12");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText(/L12/)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText(/L7/)).toBeInTheDocument();
  });

  it("titles the edit dialog with the route the mon was caught on", async () => {
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);
    const route = await adapter.routes.put({
      runId: run.id,
      name: "Route 29",
      order: 1,
      isCustom: false,
      gameRouteId: null,
    });
    await adapter.mons.put(makeMonDraft(run.id, { nickname: "Sprig", caughtRouteId: route.id }));
    renderScreen(adapter, run.id);

    await user.click(await screen.findByRole("button", { name: "Edit “Sprig”" }));

    expect(await screen.findByRole("dialog", { name: "Route 29" })).toBeInTheDocument();
  });

  it("gives every card a reorder handle named after the mon", async () => {
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);
    await adapter.mons.put(makeMonDraft(run.id, { nickname: "First", partySlot: 0 }));
    await adapter.mons.put(makeMonDraft(run.id, { nickname: "Second", partySlot: 1 }));
    renderScreen(adapter, run.id);

    expect(await screen.findByRole("button", { name: "Reorder “First”" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reorder “Second”" })).toBeInTheDocument();
  });

  it("shows both reorder hints", async () => {
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);
    await adapter.mons.put(makeMonDraft(run.id, { nickname: "First" }));
    renderScreen(adapter, run.id);

    expect(await screen.findByText("Drag cards to reorder the party")).toBeInTheDocument();
    expect(screen.getByText("Long-press a card to reorder the party")).toBeInTheDocument();
  });

  it("opens the edit dialog on Enter over the edit button without starting a drag", async () => {
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);
    await adapter.mons.put(makeMonDraft(run.id, { nickname: "First", partySlot: 0 }));
    await adapter.mons.put(makeMonDraft(run.id, { nickname: "Second", partySlot: 1 }));
    renderScreen(adapter, run.id);

    (await screen.findByRole("button", { name: "Edit “Second”" })).focus();
    await user.keyboard("{Enter}");

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(liveAnnouncement()).toBe("");
  });

  it("reorders from the keyboard and writes the slots", async () => {
    stubTwoColumnLayout();
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);
    const first = await adapter.mons.put(makeMonDraft(run.id, { nickname: "First", partySlot: 0 }));
    const second = await adapter.mons.put(
      makeMonDraft(run.id, { nickname: "Second", partySlot: 3 }),
    );
    renderScreen(adapter, run.id);

    (await screen.findByRole("button", { name: "Reorder “First”" })).focus();
    await user.keyboard(" ");
    await user.keyboard("{ArrowRight}");
    await user.keyboard(" ");

    await waitFor(async () => {
      expect(await adapter.mons.get(first.id)).toMatchObject({ partySlot: 1 });
    });
    expect(await adapter.mons.get(second.id)).toMatchObject({ partySlot: 0 });
    expect(await cardHeadings()).toEqual(["“Second”", "“First”"]);
  });

  it("shows the new order at once, before the save finishes", async () => {
    stubTwoColumnLayout();
    const user = userEvent.setup();
    const base = createMemoryAdapter();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const adapter: StorageAdapter = {
      ...base,
      transaction: (fn) => gate.then(() => base.transaction(fn)),
    };
    const run = await seedRun(adapter);
    await adapter.mons.put(makeMonDraft(run.id, { nickname: "First", partySlot: 0 }));
    await adapter.mons.put(makeMonDraft(run.id, { nickname: "Second", partySlot: 1 }));
    renderScreen(adapter, run.id);

    (await screen.findByRole("button", { name: "Reorder “First”" })).focus();
    await user.keyboard(" ");
    await user.keyboard("{ArrowRight}");
    await user.keyboard(" ");

    expect(await cardHeadings()).toEqual(["“Second”", "“First”"]);
    release();
    await waitFor(async () => {
      expect((await base.mons.where("runId", run.id)).map((m) => m.partySlot).sort()).toEqual([
        0, 1,
      ]);
    });
    expect(await cardHeadings()).toEqual(["“Second”", "“First”"]);
  });

  it("does not start a drag when a touch moves past the tolerance before the long-press", async () => {
    stubTwoColumnLayout();
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);
    await adapter.mons.put(makeMonDraft(run.id, { nickname: "First", partySlot: 0 }));
    await adapter.mons.put(makeMonDraft(run.id, { nickname: "Second", partySlot: 1 }));
    renderScreen(adapter, run.id);
    const card = (await screen.findByRole("button", { name: "Edit “First”" })).closest("li")!;

    fireTouch(card, "touchstart", 10, 10);
    fireTouch(card, "touchmove", 10, 30);
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(liveAnnouncement()).toBe("");
    expect(
      (await adapter.mons.get((await adapter.mons.where("runId", run.id))[0]!.id))?.partySlot,
    ).toBe(0);
    fireTouch(card, "touchend", 10, 30);
    expect(await cardHeadings()).toEqual(["“First”", "“Second”"]);
  });

  it("puts the order back and says so when saving fails", async () => {
    stubTwoColumnLayout();
    const user = userEvent.setup();
    const base = createMemoryAdapter();
    const adapter: StorageAdapter = {
      ...base,
      transaction: () => Promise.reject(new Error("simulated failure")),
    };
    const run = await seedRun(adapter);
    await adapter.mons.put(makeMonDraft(run.id, { nickname: "First", partySlot: 0 }));
    await adapter.mons.put(makeMonDraft(run.id, { nickname: "Second", partySlot: 1 }));
    renderScreen(adapter, run.id);

    (await screen.findByRole("button", { name: "Reorder “First”" })).focus();
    await user.keyboard(" ");
    await user.keyboard("{ArrowRight}");
    await user.keyboard(" ");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not save the new order. Nothing was changed.",
    );
    expect(await cardHeadings()).toEqual(["“First”", "“Second”"]);
  });
});
