/**
 * Reusable contract test suite for `StorageAdapter`, named `.contract.ts` rather than `.test.ts`
 * so Vitest does not collect it on its own. Test files invoke it directly.
 *
 * Every assertion is written against the promises `StorageAdapter`'s interface makes, never
 * against one implementation's internals.
 */

import { describe, it, expect, beforeEach } from "vitest";

import type { Draft, Run, Route, Encounter, Mon, Death, Fight, Cause } from "@/domain/types";
import { SCHEMA_VERSION, isExportBundle } from "@/domain/schema";

import type { StorageAdapter } from "./adapter";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Honest domain fixtures: real Run/Route/Encounter/Mon/Death/Fight drafts, not `as any` stubs.

function makeRunDraft(overrides: Partial<Draft<Run>> = {}): Draft<Run> {
  return {
    name: "Test Run",
    game: "heartgold",
    status: "active",
    rules: {
      dupesClause: false,
      speciesClause: false,
      shinyClause: false,
      nicknamesRequired: false,
      levelCaps: false,
      setMode: false,
      hardcore: false,
      randomiser: {
        enabled: false,
        wildEncounters: false,
        trainers: false,
        starters: false,
        abilities: false,
        items: false,
        moves: false,
        evolutions: false,
      },
      customClause: null,
    },
    finishedAt: null,
    ...overrides,
  };
}

function makeRouteDraft(runId: string, overrides: Partial<Draft<Route>> = {}): Draft<Route> {
  return {
    runId,
    name: "Route 29",
    order: 1,
    isCustom: false,
    gameRouteId: null,
    ...overrides,
  };
}

function makeEncounterDraft(
  runId: string,
  routeId: string,
  overrides: Partial<Draft<Encounter>> = {},
): Draft<Encounter> {
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

function makeMonDraft(runId: string, overrides: Partial<Draft<Mon>> = {}): Draft<Mon> {
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
    ...overrides,
  };
}

function makeDeathDraft(
  runId: string,
  monId: string,
  overrides: Partial<Draft<Death>> = {},
): Draft<Death> {
  return {
    runId,
    monId,
    level: 10,
    routeId: null,
    cause: { type: "wild", species: "geodude", level: 10, move: "Rock Throw" },
    diedAt: "2026-01-01T00:00:00.000Z",
    notes: null,
    ...overrides,
  };
}

function makeFightDraft(runId: string, overrides: Partial<Draft<Fight>> = {}): Draft<Fight> {
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

/** A short, real delay so two `put`s land in different milliseconds, without mocking the clock
 * (fake timers risk interfering with the Dexie-backed adapter). */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 5));
}

export function runAdapterContractTests(
  name: string,
  createAdapter: () => Promise<StorageAdapter>,
): void {
  describe(name, () => {
    let adapter: StorageAdapter;

    beforeEach(async () => {
      adapter = await createAdapter();
    });

    describe("get", () => {
      it("returns undefined for an unknown id", async () => {
        expect(await adapter.runs.get("does-not-exist")).toBeUndefined();
      });
    });

    describe("put", () => {
      it("assigns a uuid when none is given", async () => {
        const run = await adapter.runs.put(makeRunDraft());
        expect(run.id).toMatch(UUID_PATTERN);
      });

      it("preserves a supplied id", async () => {
        const run = await adapter.runs.put(makeRunDraft({ id: "run-fixed-id" }));
        expect(run.id).toBe("run-fixed-id");
      });

      it("stamps updatedAt on write and recovers createdAt from the stored row when the update draft carries no timestamps", async () => {
        // `src/domain/transitions.ts` returns `Draft<T>` with an `id` and no timestamps: this is
        // the path the app actually takes on every write after the first. Spreading a full
        // returned row here (`{ ...first }`) would let the draft carry `createdAt` itself and
        // pass even if the adapter never consulted the stored row, so this deliberately doesn't.
        const first = await adapter.runs.put(makeRunDraft({ id: "run-1" }));
        await tick();
        const second = await adapter.runs.put({
          id: "run-1",
          ...makeRunDraft({ name: "Renamed Run" }),
        });

        expect(second.createdAt).toBe(first.createdAt);
        expect(second.updatedAt > first.updatedAt).toBe(true);
        expect(second.name).toBe("Renamed Run");
      });

      it("recovers createdAt from the stored row for mons, matching what catchEncounter actually returns", async () => {
        // Same shape of regression, exercised on the other table where a `Draft<Mon>` with no
        // timestamps is the real production path (`catchEncounter` in transitions.ts).
        const run = await adapter.runs.put(makeRunDraft());
        const first = await adapter.mons.put(makeMonDraft(run.id, { id: "mon-1" }));
        await tick();
        const second = await adapter.mons.put({
          id: "mon-1",
          ...makeMonDraft(run.id, { level: 6 }),
        });

        expect(second.createdAt).toBe(first.createdAt);
        expect(second.updatedAt > first.updatedAt).toBe(true);
        expect(second.level).toBe(6);
      });

      it("ignores a supplied createdAt on update, preserving the stored row's original", async () => {
        // The round-trip path: a caller supplies a full row, including `createdAt`, on an
        // update. `adapter.ts` promises the stored row's original always wins. This uses a
        // deliberately wrong value to prove it's discarded rather than accepted by coincidence.
        const first = await adapter.runs.put(makeRunDraft({ id: "run-1" }));
        await tick();
        const second = await adapter.runs.put({
          ...first,
          createdAt: "1999-01-01T00:00:00.000Z",
          name: "Renamed Again",
        });

        expect(second.createdAt).toBe(first.createdAt);
        expect(second.createdAt).not.toBe("1999-01-01T00:00:00.000Z");
      });

      it("ignores a supplied updatedAt on update, always stamping the current time", async () => {
        // Mirrors the createdAt round-trip test above, for the other timestamp. Import replays
        // whole rows carrying their own old `updatedAt`, and every downstream merge/sync
        // heuristic reads it. `adapter.ts` promises it's stamped on every write regardless of
        // what the draft carries. This proves the stale supplied value is discarded, not
        // accepted because it happened to be unset.
        const first = await adapter.runs.put(makeRunDraft({ id: "run-1" }));
        await tick();
        const second = await adapter.runs.put({
          ...first,
          updatedAt: "1999-01-01T00:00:00.000Z",
          name: "Renamed Again",
        });

        expect(second.updatedAt).not.toBe("1999-01-01T00:00:00.000Z");
        expect(second.updatedAt > first.updatedAt).toBe(true);
      });

      it("ignores a supplied updatedAt on insert, always stamping the current time", async () => {
        // The insert half of the same promise: a brand-new id whose draft already carries a
        // stale `updatedAt` (an imported row that has never touched this store before) must
        // still be stamped fresh, not have the supplied value honoured.
        const run = await adapter.runs.put(
          makeRunDraft({ id: "run-imported", updatedAt: "1999-01-01T00:00:00.000Z" }),
        );

        expect(run.updatedAt).not.toBe("1999-01-01T00:00:00.000Z");
      });

      it("is an upsert: putting the same id twice yields one row with the later values", async () => {
        await adapter.runs.put(makeRunDraft({ id: "run-1", name: "First Name" }));
        await adapter.runs.put(makeRunDraft({ id: "run-1", name: "Second Name" }));

        const all = await adapter.runs.getAll();
        expect(all).toHaveLength(1);
        expect(all[0]?.name).toBe("Second Name");
      });
    });

    describe("putMany", () => {
      it("round-trips all rows", async () => {
        const run = await adapter.runs.put(makeRunDraft());
        const results = await adapter.routes.putMany([
          makeRouteDraft(run.id, { id: "route-1", order: 1 }),
          makeRouteDraft(run.id, { id: "route-2", order: 2 }),
          makeRouteDraft(run.id, { id: "route-3", order: 3 }),
        ]);

        expect(results.map((route) => route.id)).toEqual(["route-1", "route-2", "route-3"]);
        expect(await adapter.routes.getAll()).toHaveLength(3);
      });
    });

    describe("restoreMany", () => {
      // `put`'s "ignores a supplied updatedAt" tests above are the other half of this contract.
      // They stay unchanged, so a future edit can't quietly swap the two methods' semantics.
      // `put` always re-stamps `updatedAt`. `restoreMany` never does.

      it("preserves id, createdAt and updatedAt exactly, including a deliberately old updatedAt", async () => {
        const run: Run = {
          id: "run-1",
          createdAt: "2019-01-01T00:00:00.000Z",
          updatedAt: "2020-01-01T00:00:00.000Z",
          ...makeRunDraft(),
        };

        const [result] = await adapter.runs.restoreMany([run]);

        expect(result).toEqual(run);
        expect(await adapter.runs.get("run-1")).toEqual(run);
      });

      it("is an upsert: restoring over an existing id replaces it and keeps the incoming timestamps", async () => {
        const first = await adapter.runs.put(makeRunDraft({ id: "run-1" }));
        const replacement: Run = {
          ...first,
          name: "Restored Name",
          createdAt: "2018-01-01T00:00:00.000Z",
          updatedAt: "2019-06-01T00:00:00.000Z",
        };

        const [result] = await adapter.runs.restoreMany([replacement]);

        expect(result).toEqual(replacement);
        const stored = await adapter.runs.get("run-1");
        expect(stored).toEqual(replacement);
        expect(stored?.createdAt).toBe("2018-01-01T00:00:00.000Z");
        expect(stored?.updatedAt).toBe("2019-06-01T00:00:00.000Z");

        const all = await adapter.runs.getAll();
        expect(all).toHaveLength(1);
      });

      it("stores a copy: mutating the caller's row after restoreMany does not change what was stored", async () => {
        const row: Run = {
          id: "run-1",
          createdAt: "2019-01-01T00:00:00.000Z",
          updatedAt: "2020-01-01T00:00:00.000Z",
          ...makeRunDraft(),
        };

        await adapter.runs.restoreMany([row]);
        row.name = "Mutated After Restore";

        const stored = await adapter.runs.get("run-1");
        expect(stored?.name).toBe("Test Run");
      });

      it("throws naming the field and the row id when id is missing", async () => {
        const row = {
          ...makeRunDraft(),
          createdAt: "2020-01-01T00:00:00.000Z",
          updatedAt: "2020-01-01T00:00:00.000Z",
        } as unknown as Run;

        await expect(adapter.runs.restoreMany([row])).rejects.toThrow(/"id"/);
      });

      it("throws naming the field and the row id when createdAt is missing", async () => {
        const row = {
          id: "run-missing-createdAt",
          ...makeRunDraft(),
          updatedAt: "2020-01-01T00:00:00.000Z",
        } as unknown as Run;

        await expect(adapter.runs.restoreMany([row])).rejects.toThrow(
          /run-missing-createdAt.*"createdAt"/,
        );
      });

      it("throws naming the field and the row id when updatedAt is missing", async () => {
        const row = {
          id: "run-missing-updatedAt",
          createdAt: "2020-01-01T00:00:00.000Z",
          ...makeRunDraft(),
        } as unknown as Run;

        await expect(adapter.runs.restoreMany([row])).rejects.toThrow(
          /run-missing-updatedAt.*"updatedAt"/,
        );
      });
    });

    describe("getAll / delete", () => {
      it("getAll returns everything; delete removes one and leaves the rest", async () => {
        const run = await adapter.runs.put(makeRunDraft());
        await adapter.routes.putMany([
          makeRouteDraft(run.id, { id: "route-1" }),
          makeRouteDraft(run.id, { id: "route-2" }),
          makeRouteDraft(run.id, { id: "route-3" }),
        ]);

        await adapter.routes.delete("route-2");

        const remaining = await adapter.routes.getAll();
        expect(remaining.map((route) => route.id).sort()).toEqual(["route-1", "route-3"]);
      });
    });

    describe("where", () => {
      it("filters mons by runId", async () => {
        const runA = await adapter.runs.put(makeRunDraft());
        const runB = await adapter.runs.put(makeRunDraft());
        const monA = await adapter.mons.put(makeMonDraft(runA.id, { id: "mon-a" }));
        await adapter.mons.put(makeMonDraft(runB.id, { id: "mon-b" }));

        expect(await adapter.mons.where("runId", runA.id)).toEqual([monA]);
      });

      it("filters mons by status", async () => {
        const run = await adapter.runs.put(makeRunDraft());
        const partyMon = await adapter.mons.put(
          makeMonDraft(run.id, { id: "mon-party", status: "party" }),
        );
        await adapter.mons.put(
          makeMonDraft(run.id, { id: "mon-box", status: "box", partySlot: null }),
        );

        expect(await adapter.mons.where("status", "party")).toEqual([partyMon]);
      });

      it("filters encounters by routeId", async () => {
        const run = await adapter.runs.put(makeRunDraft());
        const encounterOnRoute = await adapter.encounters.put(
          makeEncounterDraft(run.id, "route-1", { id: "enc-a" }),
        );
        await adapter.encounters.put(makeEncounterDraft(run.id, "route-2", { id: "enc-b" }));

        expect(await adapter.encounters.where("routeId", "route-1")).toEqual([encounterOnRoute]);
      });

      it("returns [] when nothing matches", async () => {
        const run = await adapter.runs.put(makeRunDraft());
        await adapter.mons.put(makeMonDraft(run.id));

        expect(await adapter.mons.where("runId", "no-such-run")).toEqual([]);
      });

      it("rejects null on an indexed nullable field: IndexedDB cannot index null", async () => {
        // Both implementations must agree here. The in-memory adapter could otherwise happily
        // match rows whose field is null, while IndexedDB simply never indexes them. Two
        // implementations of one interface quietly disagreeing is exactly what this suite exists
        // to catch.
        const run = await adapter.runs.put(makeRunDraft());
        await adapter.mons.put(makeMonDraft(run.id, { encounterId: null }));

        await expect(adapter.mons.where("encounterId", null)).rejects.toThrow(/null/i);
      });
    });

    describe("transaction", () => {
      it("commits every write when the callback resolves", async () => {
        const run = await adapter.runs.put(makeRunDraft());

        await adapter.transaction(async (tx) => {
          await tx.encounters.put(
            makeEncounterDraft(run.id, "route-1", {
              id: "enc-1",
              status: "caught",
              monId: "mon-1",
            }),
          );
          await tx.mons.put(makeMonDraft(run.id, { id: "mon-1" }));
        });

        expect(await adapter.encounters.get("enc-1")).toBeDefined();
        expect(await adapter.mons.get("mon-1")).toBeDefined();
      });

      it("rolls back every write when the callback throws, leaving the store exactly as it was", async () => {
        const run = await adapter.runs.put(makeRunDraft());
        const encounterBefore = await adapter.encounters.put(
          makeEncounterDraft(run.id, "route-1", { id: "enc-1", status: "open" }),
        );

        await expect(
          adapter.transaction(async (tx) => {
            // Mirrors catchEncounter (spec §5): an encounter update and a new mon, together.
            await tx.encounters.put({ ...encounterBefore, status: "caught", monId: "mon-1" });
            await tx.mons.put(makeMonDraft(run.id, { id: "mon-1" }));
            throw new Error("simulated failure mid-transaction");
          }),
        ).rejects.toThrow("simulated failure mid-transaction");

        expect(await adapter.mons.get("mon-1")).toBeUndefined();
        expect(await adapter.encounters.get("enc-1")).toEqual(encounterBefore);
        expect(await adapter.encounters.getAll()).toEqual([encounterBefore]);
        expect(await adapter.mons.getAll()).toEqual([]);
      });

      it("rolls back an earlier write when a later one rejects of its own accord", async () => {
        await expect(
          adapter.transaction(async (tx) => {
            // Mirrors persistCreateRun: a run, then its routes. The rejection comes from inside
            // the adapter rather than a throw in the callback, which is the shape a caller
            // actually hits.
            const run = await tx.runs.put(makeRunDraft());
            await tx.routes.restoreMany([
              { ...makeRouteDraft(run.id), createdAt: "", updatedAt: "" } as Route,
            ]);
          }),
        ).rejects.toThrow(/missing "id"/);

        expect(await adapter.runs.getAll()).toEqual([]);
        expect(await adapter.routes.getAll()).toEqual([]);
      });
    });

    describe("exportAll", () => {
      it("returns schemaVersion, exportedAt and every row per table", async () => {
        const run = await adapter.runs.put(makeRunDraft());
        const route = await adapter.routes.put(makeRouteDraft(run.id));

        const bundle = await adapter.exportAll();

        expect(bundle.schemaVersion).toBe(SCHEMA_VERSION);
        expect(typeof bundle.exportedAt).toBe("string");
        expect(bundle.runs).toEqual([run]);
        expect(bundle.routes).toEqual([route]);
        expect(bundle.encounters).toEqual([]);
        expect(bundle.mons).toEqual([]);
        expect(bundle.deaths).toEqual([]);
        expect(bundle.fights).toEqual([]);
      });

      it("output satisfies isExportBundle", async () => {
        await adapter.runs.put(makeRunDraft());

        expect(isExportBundle(await adapter.exportAll())).toBe(true);
      });
    });

    describe("clear", () => {
      it("empties every table", async () => {
        const run = await adapter.runs.put(makeRunDraft());
        await adapter.routes.put(makeRouteDraft(run.id));
        await adapter.encounters.put(makeEncounterDraft(run.id, "route-1"));
        await adapter.mons.put(makeMonDraft(run.id));
        await adapter.deaths.put(makeDeathDraft(run.id, "mon-1"));
        await adapter.fights.put(makeFightDraft(run.id));

        await adapter.clear();

        expect(await adapter.runs.getAll()).toEqual([]);
        expect(await adapter.routes.getAll()).toEqual([]);
        expect(await adapter.encounters.getAll()).toEqual([]);
        expect(await adapter.mons.getAll()).toEqual([]);
        expect(await adapter.deaths.getAll()).toEqual([]);
        expect(await adapter.fights.getAll()).toEqual([]);
      });
    });

    describe("deathsByFight", () => {
      it("returns only trainer deaths matching the fight, excluding wild/status/other and other fights", async () => {
        const run = await adapter.runs.put(makeRunDraft());

        const matching = await adapter.deaths.put(
          makeDeathDraft(run.id, "mon-1", {
            cause: {
              type: "trainer",
              fightId: "fight-1",
              trainerName: null,
              species: "spearow",
              level: 12,
              move: "Peck",
            },
          }),
        );
        await adapter.deaths.put(
          makeDeathDraft(run.id, "mon-2", {
            cause: {
              type: "trainer",
              fightId: "fight-2",
              trainerName: null,
              species: "rattata",
              level: 12,
              move: "Tackle",
            },
          }),
        );
        await adapter.deaths.put(
          makeDeathDraft(run.id, "mon-3", {
            cause: { type: "wild", species: "geodude", level: 10, move: "Rock Throw" },
          }),
        );
        await adapter.deaths.put(
          makeDeathDraft(run.id, "mon-4", {
            cause: { type: "status", status: "poison" },
          }),
        );
        await adapter.deaths.put(
          makeDeathDraft(run.id, "mon-5", {
            cause: { type: "other", detail: "walked into a wall" },
          }),
        );

        expect(await adapter.deathsByFight("fight-1")).toEqual([matching]);
      });

      it("returns [] when no death matches the fight", async () => {
        const run = await adapter.runs.put(makeRunDraft());
        await adapter.deaths.put(
          makeDeathDraft(run.id, "mon-1", {
            cause: { type: "wild", species: "geodude", level: 10, move: "Rock Throw" },
          }),
        );

        expect(await adapter.deathsByFight("fight-404")).toEqual([]);
      });

      it("excludes a non-trainer cause carrying a stray fightId, as a malformed JSON import could produce", async () => {
        // `Cause`'s type system forbids `fightId` outside the `trainer` variant, so this row
        // cannot arise from any write path this app makes today. But `isExportBundle` (see
        // domain/schema.ts) validates only the export envelope, not individual rows, and JSON
        // import hands the adapter whatever a user's file contains, hand-edited or written by an
        // older schema. The cast below reproduces exactly that: data the type system says cannot
        // exist, but that a real import can still put in front of this method. Without the
        // `cause.type === 'trainer'` filter, the sparse `cause.fightId` index would match this
        // row and report a poison death as a casualty of the named fight.
        const run = await adapter.runs.put(makeRunDraft());

        const matching = await adapter.deaths.put(
          makeDeathDraft(run.id, "mon-1", {
            cause: {
              type: "trainer",
              fightId: "fight-1",
              trainerName: null,
              species: "spearow",
              level: 12,
              move: "Peck",
            },
          }),
        );
        await adapter.deaths.put(
          makeDeathDraft(run.id, "mon-2", {
            cause: { type: "status", status: "poison", fightId: "fight-1" } as unknown as Cause,
          }),
        );

        expect(await adapter.deathsByFight("fight-1")).toEqual([matching]);
      });
    });
  });
}
