import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DEFAULT_RULES } from "@/domain/rules";
import { padMoveset } from "@/domain/moveset";
import type { Mon } from "@/domain/types";
import { POKEAPI_BASE } from "@/game/pokeapi/client";
import { speciesIndexFixture } from "@/test/pokeapi-fixtures";
import { createMemoryAdapter } from "@/storage/memory-adapter";
import { makeMon, makeRoute, makeRunDraft } from "@/test/factories";
import { overrideGame } from "@/test/override-game";
import { defaultPokeApiRoutes, stubPokeApi } from "@/test/pokeapi-fetch";
import { createWrapper } from "@/test/render";

import { EditMonDialog } from "./edit-mon-dialog";
import { LogEncounterDialog } from "./log-encounter-dialog";

const FILLED = {
  speciesId: "bellsprout",
  speciesIdCaught: "bellsprout",
  gender: "male",
  nature: "Jolly",
  ability: "chlorophyll",
  heldItem: "miracle-seed",
  shiny: true,
  moves: padMoveset(["vine-whip"]),
} satisfies Partial<Mon>;

const FIELD_LABELS = ["Nature", "Ability", "Held item", "Shiny"] as const;

let restore: (() => void) | undefined;

beforeEach(() => {
  stubPokeApi({
    ...defaultPokeApiRoutes,
    "/pokemon?limit=100000": {
      results: [
        ...speciesIndexFixture.results,
        { name: "chikorita", url: `${POKEAPI_BASE}/pokemon/152/` },
      ],
    },
  });
});

afterEach(() => {
  restore?.();
  restore = undefined;
});

async function setup(generation: number | null) {
  if (generation !== null) restore = overrideGame("heartgold", { generation });
  const adapter = createMemoryAdapter();
  await adapter.init();
  const run = await adapter.runs.put(makeRunDraft());
  return { adapter, run };
}

async function renderEdit(generation: number | null) {
  const { adapter, run } = await setup(generation);
  const mon = makeMon({ ...FILLED, runId: run.id });
  render(
    <EditMonDialog
      open
      onOpenChange={() => undefined}
      route={makeRoute()}
      mon={mon}
      rules={DEFAULT_RULES}
    />,
    { wrapper: createWrapper(adapter) },
  );
  return { adapter, mon };
}

async function renderLog(generation: number) {
  const { adapter, run } = await setup(generation);
  render(
    <LogEncounterDialog
      open
      onOpenChange={() => undefined}
      runId={run.id}
      route={makeRoute()}
      rules={DEFAULT_RULES}
      mons={[]}
      existingEncounters={[]}
    />,
    { wrapper: createWrapper(adapter) },
  );
  return { adapter, run };
}

describe("edit dialog fields by generation", () => {
  it("shows none of the five fields for generation 1", async () => {
    await renderEdit(1);

    await waitFor(() => {
      expect(screen.queryByLabelText("Nature")).toBeNull();
    });
    for (const label of FIELD_LABELS) {
      expect(screen.queryByLabelText(label)).toBeNull();
    }
    expect(screen.queryByRole("radiogroup", { name: "Gender" })).toBeNull();
    expect(screen.getByLabelText("Nickname")).toBeInTheDocument();
  });

  it("shows gender, held item and shiny but not nature or ability for generation 2", async () => {
    await renderEdit(2);

    await waitFor(() => {
      expect(screen.queryByLabelText("Nature")).toBeNull();
    });
    expect(screen.queryByLabelText("Ability")).toBeNull();
    expect(screen.getByRole("radiogroup", { name: "Gender" })).toBeInTheDocument();
    expect(screen.getByLabelText("Held item")).toBeInTheDocument();
    expect(screen.getByLabelText("Shiny")).toBeInTheDocument();
  });

  it("shows all five fields for a HeartGold run", async () => {
    await renderEdit(null);

    expect(await screen.findByText("grass")).toBeInTheDocument();
    for (const label of FIELD_LABELS) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole("radiogroup", { name: "Gender" })).toBeInTheDocument();
  });

  it("keeps the values of hidden fields when saving", async () => {
    const user = userEvent.setup();
    const { adapter, mon } = await renderEdit(1);
    await waitFor(() => {
      expect(screen.queryByLabelText("Nature")).toBeNull();
    });

    await user.clear(screen.getByLabelText("Nickname"));
    await user.type(screen.getByLabelText("Nickname"), "Bloom");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(async () => {
      expect((await adapter.mons.get(mon.id))?.nickname).toBe("Bloom");
    });
    const saved = await adapter.mons.get(mon.id);
    expect(saved).toMatchObject({
      gender: "male",
      nature: "Jolly",
      ability: "chlorophyll",
      heldItem: "miracle-seed",
      shiny: true,
    });
  });
});

describe("log dialog fields by generation", () => {
  it("shows none of the five fields for generation 1", async () => {
    await renderLog(1);

    await waitFor(() => {
      expect(screen.queryByLabelText("Nature")).toBeNull();
    });
    for (const label of FIELD_LABELS) {
      expect(screen.queryByLabelText(label)).toBeNull();
    }
    expect(screen.queryByRole("radiogroup", { name: "Gender" })).toBeNull();
    expect(screen.getByLabelText("Level caught")).toBeInTheDocument();
  });

  it("saves a new catch with nothing in the hidden fields", async () => {
    const user = userEvent.setup();
    const { adapter, run } = await renderLog(1);
    await waitFor(() => {
      expect(screen.queryByLabelText("Nature")).toBeNull();
    });

    await user.type(screen.getByLabelText("Species"), "Chikorita");
    await user.type(screen.getByLabelText("Level caught"), "6");
    await user.click(screen.getByRole("button", { name: "Save encounter" }));

    await waitFor(async () => {
      expect(await adapter.mons.where("runId", run.id)).toHaveLength(1);
    });
    const [mon] = await adapter.mons.where("runId", run.id);
    expect(mon).toMatchObject({
      gender: null,
      nature: null,
      ability: null,
      heldItem: null,
      shiny: false,
    });
  });

  it("shows all five fields for a HeartGold run", async () => {
    const { adapter, run } = await setup(null);
    render(
      <LogEncounterDialog
        open
        onOpenChange={() => undefined}
        runId={run.id}
        route={makeRoute()}
        rules={DEFAULT_RULES}
        mons={[]}
        existingEncounters={[]}
      />,
      { wrapper: createWrapper(adapter) },
    );

    for (const label of FIELD_LABELS) {
      expect(await screen.findByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole("radiogroup", { name: "Gender" })).toBeInTheDocument();
  });
});
