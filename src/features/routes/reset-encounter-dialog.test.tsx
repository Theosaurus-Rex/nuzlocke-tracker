import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_RULES } from "@/domain/rules";
import { buildRouteRows, type RouteRow } from "@/domain/route-rows";
import type { Death, Encounter, Fight, Mon, Route, Run } from "@/domain/types";
import { createMemoryAdapter } from "@/storage/memory-adapter";
import type { StorageAdapter } from "@/storage/adapter";
import { StorageProvider } from "@/storage/storage-context";

import { describeReset, ResetEncounterDialog } from "./reset-encounter-dialog";

const TIMESTAMP = "2026-09-17T00:00:00.000Z";

function makeMon(overrides: Partial<Mon> = {}): Mon {
  return {
    ...makeMonDraft("run-1", "encounter-1"),
    id: "mon-1",
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

function makeFight(overrides: Partial<Fight> = {}): Fight {
  return {
    ...makeFightDraft("run-1"),
    id: "fight-1",
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

function makeDeath(overrides: Partial<Death> = {}): Death {
  return {
    id: "death-1",
    runId: "run-1",
    monId: "mon-1",
    level: 12,
    routeId: null,
    cause: { type: "wild", species: "geodude", level: 10, move: "Rock Throw" },
    diedAt: TIMESTAMP,
    notes: null,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

describe("describeReset", () => {
  it("says the route goes back to not encountered when there is no mon", () => {
    expect(describeReset({ routeName: "Route 30", mon: null, death: null, fights: [] })).toBe(
      "Reset Route 30? It goes back to not encountered.",
    );
  });

  it("names the mon by nickname and species when it has a nickname", () => {
    const mon = makeMon({ nickname: "Sprig" });
    expect(describeReset({ routeName: "Route 30", mon, death: null, fights: [] })).toBe(
      "Reset Route 30? This also deletes Sprig the Bellsprout. This can't be undone.",
    );
  });

  it("names the mon by species alone when it has no nickname", () => {
    const mon = makeMon({ nickname: null });
    expect(describeReset({ routeName: "Route 30", mon, death: null, fights: [] })).toBe(
      "Reset Route 30? This also deletes Bellsprout. This can't be undone.",
    );
  });

  it("names the fight a trainer death happened in", () => {
    const mon = makeMon({ nickname: "Sprig" });
    const fight = makeFight({ id: "fight-1", name: "Falkner" });
    const death = makeDeath({
      cause: {
        type: "trainer",
        fightId: fight.id,
        trainerName: null,
        species: "pidgey",
        level: 9,
        move: "Gust",
      },
    });
    expect(describeReset({ routeName: "Route 30", mon, death, fights: [fight] })).toBe(
      "Reset Route 30? This also deletes Sprig the Bellsprout and the record of its death to Falkner. This can't be undone.",
    );
  });

  it("names a trainer with no fight by their trainerName", () => {
    const mon = makeMon({ nickname: "Sprig" });
    const death = makeDeath({
      cause: {
        type: "trainer",
        fightId: null,
        trainerName: "Youngster Joey",
        species: "rattata",
        level: 6,
        move: "Tackle",
      },
    });
    expect(describeReset({ routeName: "Route 30", mon, death, fights: [] })).toBe(
      "Reset Route 30? This also deletes Sprig the Bellsprout and the record of its death to Youngster Joey. This can't be undone.",
    );
  });

  it("says only the record of its death when the fight it points to isn't in the list", () => {
    const mon = makeMon({ nickname: "Sprig" });
    const death = makeDeath({
      cause: {
        type: "trainer",
        fightId: "missing-fight",
        trainerName: null,
        species: "pidgey",
        level: 9,
        move: "Gust",
      },
    });
    expect(describeReset({ routeName: "Route 30", mon, death, fights: [] })).toBe(
      "Reset Route 30? This also deletes Sprig the Bellsprout and the record of its death. This can't be undone.",
    );
  });

  it("says only the record of its death for a wild death", () => {
    const mon = makeMon({ nickname: "Sprig" });
    const death = makeDeath();
    expect(describeReset({ routeName: "Route 30", mon, death, fights: [] })).toBe(
      "Reset Route 30? This also deletes Sprig the Bellsprout and the record of its death. This can't be undone.",
    );
  });
});

function makeRunDraft(overrides: Partial<Run> = {}): Omit<Run, "id" | "createdAt" | "updatedAt"> {
  return {
    name: "Test Run",
    game: "heartgold",
    status: "active",
    rules: DEFAULT_RULES,
    finishedAt: null,
    ...overrides,
  };
}

function makeRouteDraft(
  runId: string,
  overrides: Partial<Route> = {},
): Omit<Route, "id" | "createdAt" | "updatedAt"> {
  return {
    runId,
    name: "Route 30",
    order: 100,
    isCustom: false,
    gameRouteId: null,
    ...overrides,
  };
}

function makeEncounterDraft(
  runId: string,
  routeId: string,
  overrides: Partial<Encounter> = {},
): Omit<Encounter, "id" | "createdAt" | "updatedAt"> {
  return {
    runId,
    routeId,
    status: "open",
    speciesId: null,
    level: null,
    monId: null,
    notes: null,
    ...overrides,
  };
}

function makeMonDraft(
  runId: string,
  encounterId: string,
  overrides: Partial<Mon> = {},
): Omit<Mon, "id" | "createdAt" | "updatedAt"> {
  return {
    runId,
    encounterId,
    speciesId: "bellsprout",
    speciesIdCaught: "bellsprout",
    nickname: null,
    gender: null,
    level: 12,
    levelCaught: 8,
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

function makeFightDraft(
  runId: string,
  overrides: Partial<Fight> = {},
): Omit<Fight, "id" | "createdAt" | "updatedAt"> {
  return {
    runId,
    gameFightId: null,
    name: "Falkner",
    kind: "gym",
    order: 1,
    grantsBadge: true,
    levelCap: 15,
    status: "pending",
    clearedAt: null,
    ...overrides,
  };
}

async function seedRunAndRoute(adapter: StorageAdapter): Promise<{ run: Run; route: Route }> {
  const run = await adapter.runs.put(makeRunDraft());
  const route = await adapter.routes.put(makeRouteDraft(run.id, { name: "Route 30" }));
  return { run, route };
}

async function seedMissedRow(adapter: StorageAdapter): Promise<RouteRow> {
  const { run, route } = await seedRunAndRoute(adapter);
  const encounter = await adapter.encounters.put(
    makeEncounterDraft(run.id, route.id, { status: "missed" }),
  );
  return buildRouteRows({ routes: [route], encounters: [encounter], mons: [] })[0]!;
}

async function seedCaughtRow(adapter: StorageAdapter): Promise<RouteRow> {
  const { run, route } = await seedRunAndRoute(adapter);
  const encounter = await adapter.encounters.put(makeEncounterDraft(run.id, route.id));
  const mon = await adapter.mons.put(makeMonDraft(run.id, encounter.id, { nickname: "Sprig" }));
  const caught = await adapter.encounters.put({ ...encounter, status: "caught", monId: mon.id });
  return buildRouteRows({ routes: [route], encounters: [caught], mons: [mon] })[0]!;
}

async function seedDeadRowWithFight(
  adapter: StorageAdapter,
): Promise<{ row: RouteRow; death: Death; fight: Fight }> {
  const { run, route } = await seedRunAndRoute(adapter);
  const encounter = await adapter.encounters.put(makeEncounterDraft(run.id, route.id));
  const mon = await adapter.mons.put(
    makeMonDraft(run.id, encounter.id, { nickname: "Sprig", status: "dead", partySlot: null }),
  );
  const caught = await adapter.encounters.put({ ...encounter, status: "caught", monId: mon.id });
  const fight = await adapter.fights.put(makeFightDraft(run.id));
  const death = await adapter.deaths.put({
    runId: run.id,
    monId: mon.id,
    level: 12,
    routeId: route.id,
    cause: {
      type: "trainer",
      fightId: fight.id,
      trainerName: null,
      species: "pidgey",
      level: 9,
      move: "Gust",
    },
    diedAt: TIMESTAMP,
    notes: null,
  });
  const row = buildRouteRows({ routes: [route], encounters: [caught], mons: [mon] })[0]!;
  return { row, death, fight };
}

async function findReadyResetButton(): Promise<HTMLElement> {
  return waitFor(() => {
    const button = screen.getByRole("button", { name: "Reset encounter" });
    expect(button).toBeEnabled();
    return button;
  });
}

function renderDialog(adapter: StorageAdapter, row: RouteRow, onClose = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <StorageProvider adapter={adapter}>
        <ResetEncounterDialog row={row} onClose={onClose} />
      </StorageProvider>
    </QueryClientProvider>,
  );
  return { onClose };
}

describe("ResetEncounterDialog", () => {
  it("shows the describeReset message for the row", async () => {
    const adapter = createMemoryAdapter();
    const row = await seedMissedRow(adapter);

    renderDialog(adapter, row);

    expect(
      await screen.findByText("Reset Route 30? It goes back to not encountered."),
    ).toBeInTheDocument();
  });

  it("shows the death clause naming the fight, for a dead mon caught in a fight", async () => {
    const adapter = createMemoryAdapter();
    const { row } = await seedDeadRowWithFight(adapter);

    renderDialog(adapter, row);

    expect(
      await screen.findByText(
        "Reset Route 30? This also deletes Sprig the Bellsprout and the record of its death to Falkner. This can't be undone.",
      ),
    ).toBeInTheDocument();
  });

  it("disables Reset and shows a loading line until death and fight data have loaded", async () => {
    const adapter = createMemoryAdapter();
    const { row } = await seedDeadRowWithFight(adapter);

    const actualDeaths = await adapter.deaths.where("runId", row.route.runId);
    let resolveDeaths: (deaths: Death[]) => void = () => undefined;
    const pendingDeaths = new Promise<Death[]>((resolve) => {
      resolveDeaths = resolve;
    });
    vi.spyOn(adapter.deaths, "where").mockReturnValueOnce(pendingDeaths);

    renderDialog(adapter, row);

    const resetButton = await screen.findByRole("button", { name: "Reset encounter" });
    expect(resetButton).toBeDisabled();
    expect(screen.getByText("Checking what this removes…")).toBeInTheDocument();
    expect(screen.queryByText(/This also deletes/)).not.toBeInTheDocument();

    resolveDeaths(actualDeaths);

    await waitFor(() => {
      expect(resetButton).toBeEnabled();
    });
    expect(
      await screen.findByText(
        "Reset Route 30? This also deletes Sprig the Bellsprout and the record of its death to Falkner. This can't be undone.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the load error and keeps Reset disabled when the deaths query fails", async () => {
    const adapter = createMemoryAdapter();
    const row = await seedCaughtRow(adapter);
    vi.spyOn(adapter.deaths, "where").mockRejectedValueOnce(new Error("offline"));

    renderDialog(adapter, row);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not check what this removes: offline.",
    );
    expect(screen.getByRole("button", { name: "Reset encounter" })).toBeDisabled();
  });

  it("starts focus on Cancel", async () => {
    const adapter = createMemoryAdapter();
    const row = await seedCaughtRow(adapter);

    renderDialog(adapter, row);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    });
  });

  it("calls onClose and deletes nothing when Cancel is clicked", async () => {
    const adapter = createMemoryAdapter();
    const row = await seedCaughtRow(adapter);
    const encounterId = row.encounter!.id;

    const { onClose } = renderDialog(adapter, row);

    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(await adapter.encounters.get(encounterId)).toEqual(row.encounter);
    expect(await adapter.mons.get(row.mon!.id)).toEqual(row.mon);
  });

  it("deletes the encounter and mon and calls onClose when Reset encounter is confirmed", async () => {
    const adapter = createMemoryAdapter();
    const row = await seedCaughtRow(adapter);
    const encounterId = row.encounter!.id;
    const monId = row.mon!.id;

    const { onClose } = renderDialog(adapter, row);

    await userEvent.click(await findReadyResetButton());

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    expect(await adapter.encounters.get(encounterId)).toBeUndefined();
    expect(await adapter.mons.get(monId)).toBeUndefined();
  });

  it("shows the error and deletes nothing when the mutation fails", async () => {
    const adapter = createMemoryAdapter();
    const row = await seedCaughtRow(adapter);
    const encounterId = row.encounter!.id;
    const monId = row.mon!.id;
    vi.spyOn(adapter.encounters, "delete").mockRejectedValueOnce(new Error("boom"));

    const { onClose } = renderDialog(adapter, row);

    await userEvent.click(await findReadyResetButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not reset the encounter: boom. Nothing was removed.",
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(await adapter.encounters.get(encounterId)).toEqual(row.encounter);
    expect(await adapter.mons.get(monId)).toEqual(row.mon);
  });
});
