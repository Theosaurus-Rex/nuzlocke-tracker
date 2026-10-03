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

const RANDOMISED_RULES: Rules = {
  ...DEFAULT_RULES,
  randomiser: { ...DEFAULT_RULES.randomiser, enabled: true, evolutions: true },
};

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
    shiny: false,
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
  route?: Route | null;
  mon?: Mon;
  rules?: Rules;
}) {
  const adapter = overrides.adapter ?? createMemoryAdapter();
  const route = overrides.route === undefined ? makeRoute() : overrides.route;
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

  it("opens for a mon with no route, titled by the mon", () => {
    renderDialog({ route: null, mon: makeMon({ caughtRouteId: null, nickname: "Sprig" }) });

    expect(screen.getByRole("dialog", { name: "“Sprig”" })).toBeInTheDocument();
    expect(screen.getByLabelText("Current level")).toHaveValue("18");
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

  it("keeps only digits typed into the current level", async () => {
    const user = userEvent.setup();
    renderDialog({});

    const level = screen.getByLabelText("Current level");
    await user.clear(level);
    await user.type(level, "2a5");

    expect(level).toHaveValue("25");
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
      expect(saved?.ability).toBe("overgrow");
    });
  });

  it("opens an old typed ability as the matching selection and saves its PokéAPI name", async () => {
    const user = userEvent.setup();
    const { adapter, mon } = renderDialog({ mon: makeMon({ ability: "Chlorophyll" }) });
    await adapter.mons.put(mon);

    expect(screen.getByLabelText("Ability")).toHaveValue("Chlorophyll");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(async () => {
      expect((await adapter.mons.get(mon.id))?.ability).toBe("chlorophyll");
    });
  });

  it("clears an old ability the list does not know when the dialog saves", async () => {
    const user = userEvent.setup();
    const { adapter, mon } = renderDialog({ mon: makeMon({ ability: "Gooey Typo" }) });
    await adapter.mons.put(mon);

    await waitFor(() => {
      expect(screen.getByLabelText("Ability")).toHaveValue("");
    });
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(async () => {
      expect((await adapter.mons.get(mon.id))?.ability).toBeNull();
    });
  });

  it("saves null when the ability is cleared", async () => {
    const user = userEvent.setup();
    const { adapter, mon } = renderDialog({});
    await adapter.mons.put(mon);

    await user.clear(screen.getByLabelText("Ability"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(async () => {
      expect((await adapter.mons.get(mon.id))?.ability).toBeNull();
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
      expect(saved?.heldItem).toBe("leftovers");
    });
  });

  it("opens an old typed item as the matching selection and saves its PokéAPI name", async () => {
    const user = userEvent.setup();
    const { adapter, mon } = renderDialog({});
    await adapter.mons.put(mon);

    expect(screen.getByLabelText("Held item")).toHaveValue("Miracle Seed");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(async () => {
      expect((await adapter.mons.get(mon.id))?.heldItem).toBe("miracle-seed");
    });
  });

  it("clears an old item the list does not know when the dialog saves", async () => {
    const user = userEvent.setup();
    const { adapter, mon } = renderDialog({ mon: makeMon({ heldItem: "Gooey Typo" }) });
    await adapter.mons.put(mon);

    await waitFor(() => {
      expect(screen.getByLabelText("Held item")).toHaveValue("");
    });
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(async () => {
      expect((await adapter.mons.get(mon.id))?.heldItem).toBeNull();
    });
  });

  it("saves null when the held item is cleared", async () => {
    const user = userEvent.setup();
    const { adapter, mon } = renderDialog({});
    await adapter.mons.put(mon);

    await user.clear(screen.getByLabelText("Held item"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(async () => {
      expect((await adapter.mons.get(mon.id))?.heldItem).toBeNull();
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
      transaction: (fn) => fn(failingAdapter),
    };

    renderDialog({ adapter: failingAdapter });

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/simulated write failure/);
  });

  it("pre-fills the shiny toggle from the mon being edited", () => {
    renderDialog({ mon: makeMon({ shiny: true }) });

    expect(screen.getByLabelText("Shiny")).toHaveAttribute("aria-pressed", "true");
  });

  it("toggles shiny and saves the new value", async () => {
    const user = userEvent.setup();
    const { adapter, mon } = renderDialog({ mon: makeMon({ shiny: false }) });

    const toggle = screen.getByLabelText("Shiny");
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(async () => {
      const saved = await adapter.mons.get(mon.id);
      expect(saved?.shiny).toBe(true);
    });
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
    const { adapter, mon } = renderDialog({ rules: RANDOMISED_RULES });

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

  it("opens the suggestion list while typing and saves the picked option", async () => {
    const user = userEvent.setup();
    const { adapter, mon } = renderDialog({ rules: RANDOMISED_RULES });

    await user.click(screen.getByRole("button", { name: "Evolve" }));

    const species = screen.getByLabelText("Species");
    await user.clear(species);
    await user.type(species, "Pid");

    await user.click(await screen.findByRole("option", { name: "Pidgey" }));
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
    renderDialog({ adapter, rules: RANDOMISED_RULES });

    await user.click(screen.getByRole("button", { name: "Evolve" }));

    const species = screen.getByLabelText("Species");
    await user.clear(species);
    await user.type(species, "Pidg");
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Pick a species from the list, or undo.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(putSpy).not.toHaveBeenCalled();
  });

  it("offers Undo after a blocked save so the player is never stuck picking", async () => {
    const user = userEvent.setup();
    renderDialog({ rules: RANDOMISED_RULES });

    await user.click(screen.getByRole("button", { name: "Evolve" }));

    const species = screen.getByLabelText("Species");
    await user.clear(species);
    await user.type(species, "Pidg");
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    const undo = await screen.findByRole("button", { name: "Undo" });
    await user.click(undo);

    const restored = screen.getByLabelText("Species");
    expect(restored).toHaveValue("Bellsprout");
    expect(restored).toHaveAttribute("readOnly");
  });

  it("undoes a randomised pick back to the read-only field", async () => {
    const user = userEvent.setup();
    renderDialog({ rules: RANDOMISED_RULES });

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

  it("returns focus to the species field after Undo", async () => {
    stubPokeApiWithEvolutions();
    const user = userEvent.setup();
    renderDialog({});

    await user.click(await findMenuTrigger());
    await user.click(await screen.findByRole("menuitem", { name: "Weepinbell" }));
    await user.click(screen.getByRole("button", { name: "Undo" }));

    expect(screen.getByLabelText("Species")).toHaveFocus();
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
    renderDialog({ rules: RANDOMISED_RULES });

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

describe("EditMonDialog placement", () => {
  async function seedParty(adapter: StorageAdapter, count: number): Promise<void> {
    for (let slot = 0; slot < count; slot++) {
      await adapter.mons.put(makeMon({ id: `party-${slot}`, partySlot: slot }));
    }
  }

  function placement(): HTMLElement {
    return document.getElementById("edit-mon-placement")!;
  }

  it("shows the mon's current placement", () => {
    const boxed = renderDialog({ mon: makeMon({ status: "box", partySlot: null }) });
    expect(placement()).toHaveTextContent("Box");
    boxed.unmount();

    renderDialog({ mon: makeMon({ status: "party" }) });
    expect(placement()).toHaveTextContent("Party");
  });

  it("disables Party with a reason when the party is full and the mon is boxed", async () => {
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    await seedParty(adapter, 6);
    renderDialog({ adapter, mon: makeMon({ status: "box", partySlot: null }) });

    expect(await screen.findByText("Party is full")).toBeInTheDocument();
    await user.click(placement());
    expect(await screen.findByRole("option", { name: "Party" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("keeps Party enabled when the mon is one of the full party", async () => {
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    await seedParty(adapter, 6);
    const mon = (await adapter.mons.get("party-2"))!;
    renderDialog({ adapter, mon });

    await user.click(placement());
    expect(await screen.findByRole("option", { name: "Party" })).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.queryByText("Party is full")).not.toBeInTheDocument();
  });

  it("boxes the mon when Box is chosen and saved", async () => {
    const user = userEvent.setup();
    const adapter = createMemoryAdapter();
    const mon = makeMon();
    await adapter.mons.put(mon);
    renderDialog({ adapter, mon });

    await user.click(placement());
    await user.click(await screen.findByRole("option", { name: "Box" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(async () => {
      const saved = await adapter.mons.get(mon.id);
      expect(saved?.status).toBe("box");
      expect(saved?.partySlot).toBeNull();
    });
  });

  it("shows no placement control for a dead mon", () => {
    renderDialog({ mon: makeMon({ status: "dead", partySlot: null }) });

    expect(placement()).toBeNull();
    expect(screen.queryByText("Placement")).not.toBeInTheDocument();
  });
});
