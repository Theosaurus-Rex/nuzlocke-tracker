import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";

import { DEFAULT_RULES } from "@/domain/rules";
import type { Fight, Mon } from "@/domain/types";
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

async function seedRun(adapter: StorageAdapter, rules = DEFAULT_RULES) {
  return adapter.runs.put({
    name: "Test Run",
    game: "heartgold",
    status: "active",
    rules,
    finishedAt: null,
  });
}

async function seedFight(adapter: StorageAdapter, runId: string, overrides: Partial<Fight>) {
  return adapter.fights.put({
    runId,
    gameFightId: null,
    name: "Falkner",
    kind: "gym",
    order: 1,
    grantsBadge: true,
    levelCap: 13,
    status: "pending",
    clearedAt: null,
    ...overrides,
  });
}

async function seedCapRun(adapter: StorageAdapter, levels: number[], rules = DEFAULT_RULES) {
  const run = await seedRun(adapter, rules);
  const falkner = await seedFight(adapter, run.id, { order: 1, levelCap: 13 });
  await seedFight(adapter, run.id, { name: "Bugsy", order: 2, levelCap: 19 });
  for (const [index, level] of levels.entries()) {
    await adapter.mons.put(
      makeMonDraft(run.id, { nickname: `Mon${String(level)}`, level, partySlot: index }),
    );
  }
  return { run, falkner };
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

  it("shows six empty tiles for an empty party and keeps the count", async () => {
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);

    renderScreen(adapter, run.id);

    expect(await screen.findAllByRole("button", { name: /^empty · / })).toHaveLength(6);
    expect(screen.getByText("0 of 6")).toBeInTheDocument();
    expect(screen.queryByText("No one in your party yet")).not.toBeInTheDocument();
  });

  it("shows one empty tile per free slot", async () => {
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);
    for (let slot = 0; slot < 4; slot += 1) {
      await adapter.mons.put(makeMonDraft(run.id, { partySlot: slot }));
    }

    renderScreen(adapter, run.id);

    expect(await screen.findAllByRole("button", { name: /^empty · / })).toHaveLength(2);
  });

  it("disables the tiles and says the box is empty when nothing is boxed", async () => {
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);
    await adapter.mons.put(makeMonDraft(run.id, { partySlot: 0 }));

    renderScreen(adapter, run.id);

    const tiles = await screen.findAllByRole("button", { name: "empty · box is empty" });
    expect(tiles).toHaveLength(5);
    for (const tile of tiles) {
      expect(tile).toBeDisabled();
    }
    expect(screen.getAllByText("empty · box is empty")).toHaveLength(5);
  });

  it("gives empty tiles no reorder handle", async () => {
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);

    renderScreen(adapter, run.id);

    await screen.findAllByRole("button", { name: /^empty · / });
    expect(screen.queryByRole("button", { name: /Reorder/ })).not.toBeInTheDocument();
  });

  describe("adding from the box", () => {
    async function seedMixed() {
      const adapter = createMemoryAdapter();
      const run = await seedRun(adapter);
      await adapter.mons.put(makeMonDraft(run.id, { nickname: "Lead", partySlot: 0 }));
      await adapter.mons.put(
        makeMonDraft(run.id, {
          nickname: "Rocky",
          speciesId: "geodude",
          status: "box",
          partySlot: null,
          boxOrder: 0,
          level: 12,
        }),
      );
      await adapter.mons.put(
        makeMonDraft(run.id, {
          nickname: "Zippy",
          speciesId: "pidgey",
          status: "box",
          partySlot: null,
          boxOrder: 1,
        }),
      );
      await adapter.mons.put(
        makeMonDraft(run.id, { nickname: "Gone", status: "dead", partySlot: null }),
      );
      return { adapter, run };
    }

    it("lists only boxed mons in the picker", async () => {
      const user = userEvent.setup();
      const { adapter, run } = await seedMixed();
      renderScreen(adapter, run.id);

      await user.click(
        (await screen.findAllByRole("button", { name: "empty · add from box" }))[0]!,
      );

      const dialog = await screen.findByRole("dialog", { name: "Add to party" });
      expect(
        within(dialog).getByRole("button", { name: "Add “Rocky” to the party" }),
      ).toBeVisible();
      expect(within(dialog).getByText("L12")).toBeInTheDocument();
      expect(
        within(dialog).getByRole("button", { name: "Add “Zippy” to the party" }),
      ).toBeVisible();
      expect(within(dialog).getAllByRole("button", { name: /to the party/ })).toHaveLength(2);
    });

    it("narrows the list as you search and says when nothing matches", async () => {
      const user = userEvent.setup();
      const { adapter, run } = await seedMixed();
      renderScreen(adapter, run.id);
      await user.click(
        (await screen.findAllByRole("button", { name: "empty · add from box" }))[0]!,
      );
      const dialog = await screen.findByRole("dialog", { name: "Add to party" });

      await user.type(within(dialog).getByLabelText("Search boxes"), "zip");
      expect(within(dialog).getAllByRole("button", { name: /to the party/ })).toHaveLength(1);
      expect(
        within(dialog).getByRole("button", { name: "Add “Zippy” to the party" }),
      ).toBeVisible();

      await user.clear(within(dialog).getByLabelText("Search boxes"));
      await user.type(within(dialog).getByLabelText("Search boxes"), "qqq");
      expect(within(dialog).getByText("No boxed mons match “qqq”")).toBeInTheDocument();
    });

    it("moves the picked mon into the party, closes the dialog and drops a tile", async () => {
      const user = userEvent.setup();
      const { adapter, run } = await seedMixed();
      renderScreen(adapter, run.id);
      await user.click(
        (await screen.findAllByRole("button", { name: "empty · add from box" }))[0]!,
      );

      await user.click(await screen.findByRole("button", { name: "Add “Rocky” to the party" }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
      expect(await cardHeadings()).toEqual(["“Lead”", "“Rocky”"]);
      expect(screen.getAllByRole("button", { name: "empty · add from box" })).toHaveLength(4);
      expect(screen.getByText("2 of 6")).toBeInTheDocument();
    });

    it("says so and keeps the dialog open when saving fails", async () => {
      const user = userEvent.setup();
      const base = createMemoryAdapter();
      const adapter: StorageAdapter = {
        ...base,
        transaction: () => Promise.reject(new Error("simulated failure")),
      };
      const run = await seedRun(adapter);
      await adapter.mons.put(
        makeMonDraft(run.id, { nickname: "Rocky", status: "box", partySlot: null, boxOrder: 0 }),
      );
      renderScreen(adapter, run.id);
      await user.click(
        (await screen.findAllByRole("button", { name: "empty · add from box" }))[0]!,
      );

      await user.click(await screen.findByRole("button", { name: "Add “Rocky” to the party" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Could not add “Rocky” to the party. Nothing was changed.",
      );
      expect(screen.getByRole("dialog", { name: "Add to party" })).toBeInTheDocument();
    });
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

  describe("level cap warnings", () => {
    const capRules = { ...DEFAULT_RULES, levelCaps: true };

    it("shows the count and the cap when one party mon is over", async () => {
      const adapter = createMemoryAdapter();
      const { run, falkner } = await seedCapRun(adapter, [20, 19, 10], capRules);
      await adapter.fights.put({ ...falkner, status: "cleared" });
      renderScreen(adapter, run.id);

      expect((await screen.findAllByText("1 over cap")).length).toBeGreaterThan(0);
      expect(screen.getByText("cap L19")).toBeInTheDocument();
    });

    it("tags only the over mon's card, not one exactly at the cap", async () => {
      const adapter = createMemoryAdapter();
      const { run, falkner } = await seedCapRun(adapter, [20, 19, 10], capRules);
      await adapter.fights.put({ ...falkner, status: "cleared" });
      renderScreen(adapter, run.id);

      const tags = await screen.findAllByText("Over cap L19");
      expect(tags).toHaveLength(1);
      expect(tags[0]?.closest("li")).toHaveTextContent("Mon20");
    });

    it("shows the cap but no chip when nothing is over", async () => {
      const adapter = createMemoryAdapter();
      const { run, falkner } = await seedCapRun(adapter, [19, 10], capRules);
      await adapter.fights.put({ ...falkner, status: "cleared" });
      renderScreen(adapter, run.id);

      expect(await screen.findByText("cap L19")).toBeInTheDocument();
      expect(screen.queryByText(/over cap/i)).toBeNull();
    });

    it("shows nothing cap-related when the rule is off", async () => {
      const adapter = createMemoryAdapter();
      const { run } = await seedCapRun(adapter, [50], { ...DEFAULT_RULES, levelCaps: false });
      renderScreen(adapter, run.id);

      await screen.findByText("“Mon50”");
      expect(screen.queryByText(/cap L/i)).toBeNull();
      expect(screen.queryByText(/over cap/i)).toBeNull();
    });

    it("raises the cap once a fight is cleared", async () => {
      const adapter = createMemoryAdapter();
      const { run } = await seedCapRun(adapter, [15], capRules);
      renderScreen(adapter, run.id);

      expect(await screen.findByText("cap L13")).toBeInTheDocument();
      expect(screen.getAllByText("Over cap L13")).toHaveLength(1);
    });

    it("moves the cap to the next fight after a clear, so the mon is no longer over", async () => {
      const adapter = createMemoryAdapter();
      const { run, falkner } = await seedCapRun(adapter, [15], capRules);
      await adapter.fights.put({ ...falkner, status: "cleared" });
      renderScreen(adapter, run.id);

      expect(await screen.findByText("cap L19")).toBeInTheDocument();
      expect(screen.queryByText(/over cap/i)).toBeNull();
    });

    it("does not count boxed mons", async () => {
      const adapter = createMemoryAdapter();
      const { run, falkner } = await seedCapRun(adapter, [10], capRules);
      await adapter.fights.put({ ...falkner, status: "cleared" });
      await adapter.mons.put(
        makeMonDraft(run.id, { level: 50, status: "box", partySlot: null, boxOrder: 0 }),
      );
      renderScreen(adapter, run.id);

      expect(await screen.findByText("cap L19")).toBeInTheDocument();
      expect(screen.queryByText(/over cap/i)).toBeNull();
    });
  });
});
