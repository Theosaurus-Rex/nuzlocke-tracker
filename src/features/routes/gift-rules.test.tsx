import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";

import { DEFAULT_RULES } from "@/domain/rules";
import type { Rules } from "@/domain/types";
import { createMemoryAdapter } from "@/storage/memory-adapter";
import { StorageProvider } from "@/storage/storage-context";
import { defaultPokeApiRoutes, stubPokeApi } from "@/test/pokeapi-fetch";

import { RoutesScreen } from "./routes-screen";

beforeEach(() => {
  stubPokeApi(defaultPokeApiRoutes);
});

const ROUTES = [
  { name: "Starter", gameRouteId: "starter" },
  { name: "Route 29", gameRouteId: "route-29" },
  { name: "New Bark Town", gameRouteId: "new-bark-town" },
];

export async function seedGiftRun(rules: Partial<Rules>) {
  const adapter = createMemoryAdapter();
  await adapter.init();
  const run = await adapter.runs.put({
    name: "Run",
    game: "heartgold",
    status: "active",
    rules: { ...DEFAULT_RULES, ...rules },
    finishedAt: null,
  });
  const routes = [];
  for (const [index, route] of ROUTES.entries()) {
    routes.push(
      await adapter.routes.put({
        runId: run.id,
        name: route.name,
        order: index + 1,
        isCustom: false,
        gameRouteId: route.gameRouteId,
      }),
    );
  }
  return { adapter, run, routes };
}

export function renderRoutes(adapter: ReturnType<typeof createMemoryAdapter>, runId: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <StorageProvider adapter={adapter}>
        <MemoryRouter initialEntries={[`/runs/${runId}/routes`]}>
          <Routes>
            <Route path="/runs/:runId/routes" element={<RoutesScreen />} />
          </Routes>
        </MemoryRouter>
      </StorageProvider>
    </QueryClientProvider>,
  );
}

async function card(name: string): Promise<HTMLElement> {
  const list = await screen.findByRole("list");
  return within(list).getByText(name).closest("li") as HTMLElement;
}

describe("No gifts", () => {
  it("greys a gift-only route, labels it and cannot log it", async () => {
    const { adapter, run } = await seedGiftRun({ noGifts: true });
    renderRoutes(adapter, run.id);

    const starter = await card("Starter");
    expect(within(starter).getByText("No gifts")).toBeInTheDocument();
    expect(starter).toHaveClass("opacity-50");
    expect(within(starter).queryByRole("button", { name: "Log encounter" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Log Starter" })).toBeNull();
  });

  it("leaves a mixed route loggable", async () => {
    const { adapter, run } = await seedGiftRun({ noGifts: true });
    renderRoutes(adapter, run.id);

    const mixed = await card("Route 29");
    expect(within(mixed).queryByText("No gifts")).toBeNull();
    expect(mixed).not.toHaveClass("opacity-50");
    expect(within(mixed).getByRole("button", { name: "Log encounter" })).toBeInTheDocument();
  });

  it("leaves gift-only routes out of the totals", async () => {
    const { adapter, run } = await seedGiftRun({ noGifts: true });
    renderRoutes(adapter, run.id);

    await card("Starter");
    expect(screen.getByText("0 / 2")).toBeInTheDocument();
  });

  it("does nothing when the rule is off", async () => {
    const { adapter, run } = await seedGiftRun({});
    renderRoutes(adapter, run.id);

    const starter = await card("Starter");
    expect(within(starter).queryByText("No gifts")).toBeNull();
    expect(within(starter).getByRole("button", { name: "Log encounter" })).toBeInTheDocument();
    expect(screen.getByText("0 / 3")).toBeInTheDocument();
  });
});
