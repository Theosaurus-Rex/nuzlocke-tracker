/**
 * Covers `edit-mon-dialog.tsx`: pre-fill from an existing caught mon, each field saving its new
 * value, the read-only species and level-caught fields, and validation via `validateAmendment`.
 */

import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_RULES } from "@/domain/rules";
import type { Mon, Route, Rules } from "@/domain/types";
import type { StorageAdapter } from "@/storage/adapter";
import { createMemoryAdapter } from "@/storage/memory-adapter";
import { StorageProvider } from "@/storage/storage-context";
import { findMenuTrigger, stubPokeApiWithEvolutions } from "@/test/pokeapi-fetch";

import { EditMonDialog } from "./edit-mon-dialog";

const TIMESTAMP = "2026-09-17T00:00:00.000Z";

function makeRoute(overrides: Partial<Route> = {}): Route {
  return {
    id: "route-1",
    runId: "run-1",
    name: "Sprout Tower",
    order: 100,
    isCustom: false,
    gameRouteId: "route-1",
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

function makeMon(overrides: Partial<Mon> = {}): Mon {
  return {
    id: "mon-1",
    runId: "run-1",
    encounterId: "encounter-1",
    speciesId: "bellsprout",
    speciesIdCaught: "bellsprout",
    nickname: "Sprig",
    gender: "male",
    level: 18,
    levelCaught: 6,
    nature: "Jolly",
    ability: "Chlorophyll",
    heldItem: "Miracle Seed",
    moves: ["vine-whip", "growth"],
    status: "party",
    partySlot: 0,
    boxOrder: null,
    caughtRouteId: "route-1",
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

function createWrapper(
  adapter: StorageAdapter,
): ({ children }: { children: ReactNode }) => ReactNode {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }): ReactNode {
    return (
      <QueryClientProvider client={queryClient}>
        <StorageProvider adapter={adapter}>{children}</StorageProvider>
      </QueryClientProvider>
    );
  };
}

function renderDialog(overrides: {
  adapter?: StorageAdapter;
  route?: Route;
  mon?: Mon;
  rules?: Rules;
}) {
  const adapter = overrides.adapter ?? createMemoryAdapter();
  const route = overrides.route ?? makeRoute();
  const mon = overrides.mon ?? makeMon();

  const view = render(
    <EditMonDialog
      open
      onOpenChange={() => undefined}
      route={route}
      mon={mon}
      rules={overrides.rules ?? DEFAULT_RULES}
    />,
    { wrapper: createWrapper(adapter) },
  );

  return { ...view, adapter, route, mon };
}

describe("EditMonDialog", () => {
  it("shows the route name as the dialog title", () => {
    renderDialog({ route: makeRoute({ name: "New Bark Town" }) });

    expect(screen.getByRole("dialog", { name: "New Bark Town" })).toBeInTheDocument();
  });

  it("shows the mon's species type inline, resolved for the run's generation", async () => {
    renderDialog({ mon: makeMon({ speciesId: "bellsprout" }) });

    expect(await screen.findByText("grass")).toBeInTheDocument();
  });

  it("pre-fills every field from the mon being edited", () => {
    renderDialog({});

    expect(screen.getByLabelText("Nickname")).toHaveValue("Sprig");
    expect(screen.getByRole("radio", { name: "Male", checked: true })).toBeInTheDocument();
    expect(screen.getByLabelText("Current level")).toHaveValue("18");
    expect(screen.getByLabelText("Nature")).toHaveTextContent("Jolly");
    expect(screen.getByLabelText("Ability")).toHaveValue("Chlorophyll");
    expect(screen.getByLabelText("Held item")).toHaveValue("Miracle Seed");
  });

  it("pre-fills the moveset from the mon being edited", () => {
    renderDialog({ mon: makeMon({ moves: ["vine-whip", "growth"] }) });

    expect(screen.getByText("Vine Whip")).toBeInTheDocument();
    expect(screen.getByText("Growth")).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText("+ move")).toHaveLength(2);
  });

  it("saves changed moves onto the mon", async () => {
    const user = userEvent.setup();
    const { adapter, mon } = renderDialog({ mon: makeMon({ moves: ["vine-whip", "growth"] }) });

    await user.click(screen.getByRole("button", { name: "Remove Growth" }));
    await user.type(screen.getAllByPlaceholderText("+ move")[0]!, "Tackle");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(async () => {
      const saved = await adapter.mons.get(mon.id);
      expect(saved?.moves).toEqual(["vine-whip", "tackle"]);
    });
  });

  it("shows species and level caught, read-only", async () => {
    const user = userEvent.setup();
    renderDialog({ mon: makeMon({ speciesId: "bellsprout", levelCaught: 6 }) });

    const species = screen.getByLabelText("Species");
    const levelCaught = screen.getByLabelText("Level caught");

    expect(species).toHaveValue("Bellsprout");
    expect(levelCaught).toHaveValue("6");
    expect(species).toHaveAttribute("readOnly");
    expect(levelCaught).toHaveAttribute("readOnly");

    await user.type(species, "zzz");
    await user.type(levelCaught, "9");

    expect(species).toHaveValue("Bellsprout");
    expect(levelCaught).toHaveValue("6");
  });

  it("saves a new nickname", async () => {
    const user = userEvent.setup();
    const { adapter, mon } = renderDialog({});

    const nickname = screen.getByLabelText("Nickname");
    await user.clear(nickname);
    await user.type(nickname, "Bloom");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(async () => {
      const saved = await adapter.mons.get(mon.id);
      expect(saved?.nickname).toBe("Bloom");
    });
  });

  it("saves a new gender", async () => {
    const user = userEvent.setup();
    const { adapter, mon } = renderDialog({});

    await user.click(screen.getByRole("radio", { name: "Female" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(async () => {
      const saved = await adapter.mons.get(mon.id);
      expect(saved?.gender).toBe("female");
    });
  });

  it("saves a new current level", async () => {
    const user = userEvent.setup();
    const { adapter, mon } = renderDialog({});

    const level = screen.getByLabelText("Current level");
    await user.clear(level);
    await user.type(level, "25");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(async () => {
      const saved = await adapter.mons.get(mon.id);
      expect(saved?.level).toBe(25);
    });
  });

  it("saves a new nature", async () => {
    const user = userEvent.setup();
    const { adapter, mon } = renderDialog({});

    await user.click(screen.getByLabelText("Nature"));
    await user.click(await screen.findByRole("option", { name: "Adamant" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(async () => {
      const saved = await adapter.mons.get(mon.id);
      expect(saved?.nature).toBe("Adamant");
    });
  });

  it("saves a new ability", async () => {
    const user = userEvent.setup();
    const { adapter, mon } = renderDialog({});

    const ability = screen.getByLabelText("Ability");
    await user.clear(ability);
    await user.type(ability, "Overgrow");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(async () => {
      const saved = await adapter.mons.get(mon.id);
      expect(saved?.ability).toBe("Overgrow");
    });
  });

  it("saves a new held item", async () => {
    const user = userEvent.setup();
    const { adapter, mon } = renderDialog({});

    const heldItem = screen.getByLabelText("Held item");
    await user.clear(heldItem);
    await user.type(heldItem, "Leftovers");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(async () => {
      const saved = await adapter.mons.get(mon.id);
      expect(saved?.heldItem).toBe("Leftovers");
    });
  });

  it("rejects a level below the level caught, writes nothing, and leaves the dialog open", async () => {
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const putSpy = vi.spyOn(adapter.mons, "put");
    renderDialog({ adapter, mon: makeMon({ levelCaught: 6, level: 18 }) });

    const level = screen.getByLabelText("Current level");
    await user.clear(level);
    await user.type(level, "3");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText("Current level cannot be below the level it was caught at."),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(putSpy).not.toHaveBeenCalled();
  });

  it("rejects a blank nickname when the clause is on, writes nothing", async () => {
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const putSpy = vi.spyOn(adapter.mons, "put");
    renderDialog({ adapter, rules: { ...DEFAULT_RULES, nicknamesRequired: true } });

    const nickname = screen.getByLabelText(/^Nickname/);
    await user.clear(nickname);
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText(/requires a nickname/i)).toBeInTheDocument();
    expect(putSpy).not.toHaveBeenCalled();
  });

  it("accepts a blank nickname when the clause is off", async () => {
    const user = userEvent.setup();
    const { adapter, mon } = renderDialog({
      mon: makeMon({ nickname: "Sprig" }),
      rules: { ...DEFAULT_RULES, nicknamesRequired: false },
    });

    const nickname = screen.getByLabelText("Nickname");
    await user.clear(nickname);
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(async () => {
      const saved = await adapter.mons.get(mon.id);
      expect(saved?.nickname).toBeNull();
    });
  });

  it("saves an edit to a dead mon and leaves it dead", async () => {
    const user = userEvent.setup();
    const { adapter, mon } = renderDialog({ mon: makeMon({ status: "dead", partySlot: null }) });

    const nickname = screen.getByLabelText("Nickname");
    await user.clear(nickname);
    await user.type(nickname, "Bloom");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(async () => {
      const saved = await adapter.mons.get(mon.id);
      expect(saved?.nickname).toBe("Bloom");
      expect(saved?.status).toBe("dead");
    });
  });

  it("surfaces a mutation failure instead of swallowing it", async () => {
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const failingAdapter: StorageAdapter = {
      ...adapter,
      mons: {
        ...adapter.mons,
        put: () => Promise.reject(new Error("simulated write failure")),
      },
    };

    renderDialog({ adapter: failingAdapter });

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/simulated write failure/);
  });

  it("evolves on save", async () => {
    stubPokeApiWithEvolutions();
    const user = userEvent.setup();
    const { adapter, mon } = renderDialog({});

    await user.click(await findMenuTrigger());
    await user.click(await screen.findByRole("menuitem", { name: "Weepinbell" }));

    expect(screen.getByLabelText("Species")).toHaveValue("Weepinbell");
    expect(screen.getByText(/Evolved from Bellsprout/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(async () => {
      const saved = await adapter.mons.get(mon.id);
      expect(saved?.speciesId).toBe("weepinbell");
      expect(saved?.speciesIdCaught).toBe("bellsprout");
    });
  });

  it("saves an evolve with other edits in one write", async () => {
    stubPokeApiWithEvolutions();
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const putSpy = vi.spyOn(adapter.mons, "put");
    const { mon } = renderDialog({ adapter });

    await user.click(await findMenuTrigger());
    await user.click(await screen.findByRole("menuitem", { name: "Weepinbell" }));

    const level = screen.getByLabelText("Current level");
    await user.clear(level);
    await user.type(level, "25");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(async () => {
      const saved = await adapter.mons.get(mon.id);
      expect(saved?.speciesId).toBe("weepinbell");
      expect(saved?.level).toBe(25);
    });
    expect(putSpy).toHaveBeenCalledTimes(1);
  });

  it("does not save an evolve on cancel", async () => {
    stubPokeApiWithEvolutions();
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const mon = makeMon();
    await adapter.mons.put(mon);
    renderDialog({ adapter, mon });

    await user.click(await findMenuTrigger());
    await user.click(await screen.findByRole("menuitem", { name: "Weepinbell" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    const saved = await adapter.mons.get(mon.id);
    expect(saved?.speciesId).toBe("bellsprout");
  });

  it("blocks the evolve when validation fails", async () => {
    stubPokeApiWithEvolutions();
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const putSpy = vi.spyOn(adapter.mons, "put");
    renderDialog({ adapter, mon: makeMon({ levelCaught: 6, level: 18 }) });

    await user.click(await findMenuTrigger());
    await user.click(await screen.findByRole("menuitem", { name: "Weepinbell" }));

    const level = screen.getByLabelText("Current level");
    await user.clear(level);
    await user.type(level, "3");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText("Current level cannot be below the level it was caught at."),
    ).toBeInTheDocument();
    expect(putSpy).not.toHaveBeenCalled();
  });

  it("steps twice and undoes to the original", async () => {
    stubPokeApiWithEvolutions();
    const user = userEvent.setup();
    renderDialog({});

    await user.click(await findMenuTrigger());
    await user.click(await screen.findByRole("menuitem", { name: "Weepinbell" }));
    expect(screen.getByLabelText("Species")).toHaveValue("Weepinbell");

    await user.click(await findMenuTrigger());
    await user.click(await screen.findByRole("menuitem", { name: "Victreebel" }));
    expect(screen.getByLabelText("Species")).toHaveValue("Victreebel");

    await user.click(screen.getByRole("button", { name: "Undo" }));

    expect(screen.getByLabelText("Species")).toHaveValue("Bellsprout");
    expect(screen.queryByText(/Evolved from/)).not.toBeInTheDocument();
  });

  it("shows the full species picker in a randomised run", async () => {
    const user = userEvent.setup();
    const { adapter, mon } = renderDialog({
      rules: {
        ...DEFAULT_RULES,
        randomiser: { ...DEFAULT_RULES.randomiser, enabled: true, evolutions: true },
      },
    });

    await user.click(screen.getByRole("button", { name: "Evolve" }));

    const species = screen.getByLabelText("Species");
    await user.clear(species);
    await user.type(species, "Pidgey");

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(async () => {
      const saved = await adapter.mons.get(mon.id);
      expect(saved?.speciesId).toBe("pidgey");
    });
  });

  it("refuses to save an unresolved species pick in a randomised run", async () => {
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const putSpy = vi.spyOn(adapter.mons, "put");
    renderDialog({
      adapter,
      rules: {
        ...DEFAULT_RULES,
        randomiser: { ...DEFAULT_RULES.randomiser, enabled: true, evolutions: true },
      },
    });

    await user.click(screen.getByRole("button", { name: "Evolve" }));

    const species = screen.getByLabelText("Species");
    await user.clear(species);
    await user.type(species, "Pidg");

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Pick a species from the list, or undo.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(putSpy).not.toHaveBeenCalled();
  });

  it("undoes a randomised pick back to the read-only field", async () => {
    const user = userEvent.setup();
    renderDialog({
      rules: {
        ...DEFAULT_RULES,
        randomiser: { ...DEFAULT_RULES.randomiser, enabled: true, evolutions: true },
      },
    });

    await user.click(screen.getByRole("button", { name: "Evolve" }));

    const species = screen.getByLabelText("Species");
    await user.clear(species);
    await user.type(species, "Pidgey");

    await user.click(screen.getByRole("button", { name: "Undo" }));

    const restored = screen.getByLabelText("Species");
    expect(restored).toHaveValue("Bellsprout");
    expect(restored).toHaveAttribute("readOnly");
    expect(screen.queryByRole("combobox", { name: "Species" })).not.toBeInTheDocument();
  });

  it("ties the evolved note to the species field for assistive tech", async () => {
    stubPokeApiWithEvolutions();
    const user = userEvent.setup();
    renderDialog({});

    await user.click(await findMenuTrigger());
    await user.click(await screen.findByRole("menuitem", { name: "Weepinbell" }));

    expect(screen.getByLabelText("Species")).toHaveAccessibleDescription(/Evolved from Bellsprout/);
  });

  it("ties the evolved note to the picker field in a randomised run", async () => {
    const user = userEvent.setup();
    renderDialog({
      rules: {
        ...DEFAULT_RULES,
        randomiser: { ...DEFAULT_RULES.randomiser, enabled: true, evolutions: true },
      },
    });

    await user.click(screen.getByRole("button", { name: "Evolve" }));

    const species = screen.getByLabelText("Species");
    await user.clear(species);
    await user.type(species, "Pidgey");

    expect(species).toHaveAccessibleDescription(/Evolved from Bellsprout/);
  });

  it("ignores the evolutions sub-toggle while the randomiser itself is off", async () => {
    stubPokeApiWithEvolutions();
    const user = userEvent.setup();
    renderDialog({
      rules: {
        ...DEFAULT_RULES,
        randomiser: { ...DEFAULT_RULES.randomiser, enabled: false, evolutions: true },
      },
    });

    await user.click(await findMenuTrigger());
    expect(await screen.findByRole("menuitem", { name: "Weepinbell" })).toBeInTheDocument();
  });

  it("keeps the read-only field when the randomiser is on but evolutions are not", async () => {
    stubPokeApiWithEvolutions();
    const user = userEvent.setup();
    renderDialog({
      rules: {
        ...DEFAULT_RULES,
        randomiser: { ...DEFAULT_RULES.randomiser, enabled: true, evolutions: false },
      },
    });

    await user.click(await findMenuTrigger());
    expect(await screen.findByRole("menuitem", { name: "Weepinbell" })).toBeInTheDocument();
    expect(screen.getByLabelText("Species")).toHaveAttribute("readOnly");
  });
});
