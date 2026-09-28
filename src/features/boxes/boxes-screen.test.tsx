import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";

import { DEFAULT_RULES } from "@/domain/rules";
import type { Mon } from "@/domain/types";
import type { StorageAdapter } from "@/storage/adapter";
import { createMemoryAdapter } from "@/storage/memory-adapter";
import { StorageProvider } from "@/storage/storage-context";

import { BoxesScreen, boxedMons } from "./boxes-screen";

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
});
