/**
 * In-memory reference implementation of `StorageAdapter`. Backed by `Map`s, not IndexedDB or
 * anything durable — its purpose is spec §10's need for a fast adapter to test the query layer
 * against (commit 9), and to prove that `adapter.contract.ts` is actually executable before the
 * Dexie implementation (commit 8) exists.
 *
 * Rows are never mutated in place: every `put` writes a brand-new object into the table's map.
 * That is what makes `transaction` rollback correct and cheap — a snapshot only needs a shallow
 * copy of each `Map` (`new Map(table)`), because existing entries are never touched again after
 * being copied in.
 */

import type { Draft, Timestamped, Run, Route, Encounter, Mon, Death, Fight } from "@/domain/types";
import { SCHEMA_VERSION } from "@/domain/schema";
import type { ExportBundle } from "@/domain/schema";

import type {
  StorageAdapter,
  Repository,
  RunIndexedKey,
  RouteIndexedKey,
  EncounterIndexedKey,
  MonIndexedKey,
  DeathIndexedKey,
  FightIndexedKey,
} from "./adapter";

interface Tables {
  runs: Map<string, Run>;
  routes: Map<string, Route>;
  encounters: Map<string, Encounter>;
  mons: Map<string, Mon>;
  deaths: Map<string, Death>;
  fights: Map<string, Fight>;
}

function createTables(): Tables {
  return {
    runs: new Map(),
    routes: new Map(),
    encounters: new Map(),
    mons: new Map(),
    deaths: new Map(),
    fights: new Map(),
  };
}

/** Shallow snapshot: safe because `put` always replaces, never mutates, a row in place. */
function cloneTables(tables: Tables): Tables {
  return {
    runs: new Map(tables.runs),
    routes: new Map(tables.routes),
    encounters: new Map(tables.encounters),
    mons: new Map(tables.mons),
    deaths: new Map(tables.deaths),
    fights: new Map(tables.fights),
  };
}

/** Restores `live` to hold exactly the entries `snapshot` held, in place. */
function restoreTable<T>(live: Map<string, T>, snapshot: Map<string, T>): void {
  live.clear();
  for (const [id, value] of snapshot) {
    live.set(id, value);
  }
}

/** `restoreMany` writes rows that came from outside the type system (a JSON backup file, an
 * M6 migration source) — validate at runtime even though `T` says these fields are required,
 * naming both the missing field and the row's id so a bad restore fails loud. Returns an `Error`
 * rather than throwing, so a caller can turn it into a rejected promise without a synchronous
 * throw escaping the method call. */
function restorableRowError<T extends Timestamped>(row: T): Error | undefined {
  const label = typeof row.id === "string" && row.id.length > 0 ? row.id : "(missing id)";
  if (typeof row.id !== "string" || row.id.length === 0) {
    return new Error(`restoreMany: row "${label}" is missing "id".`);
  }
  if (typeof row.createdAt !== "string" || row.createdAt.length === 0) {
    return new Error(`restoreMany: row "${label}" is missing "createdAt".`);
  }
  if (typeof row.updatedAt !== "string" || row.updatedAt.length === 0) {
    return new Error(`restoreMany: row "${label}" is missing "updatedAt".`);
  }
  return undefined;
}

function createRepository<T extends Timestamped, TIndexed extends keyof T>(
  table: Map<string, T>,
): Repository<T, TIndexed> {
  function put(record: Draft<T>): Promise<T> {
    const id = record.id ?? crypto.randomUUID();
    const existing = table.get(id);
    const now = new Date().toISOString();
    const createdAt = existing ? existing.createdAt : (record.createdAt ?? now);

    const next = { ...record, id, createdAt, updatedAt: now } as T;
    table.set(id, next);
    return Promise.resolve(next);
  }

  return {
    get(id) {
      return Promise.resolve(table.get(id));
    },
    getAll() {
      return Promise.resolve(Array.from(table.values()));
    },
    where(field, value) {
      if (value === null || value === undefined) {
        return Promise.reject(
          new Error(
            `where("${String(field)}", ${String(value)}) is not supported: IndexedDB cannot ` +
              "index null values, so a nullable field can't be queried through where(). Use a " +
              "named adapter method instead (see deathsByFight).",
          ),
        );
      }
      return Promise.resolve(Array.from(table.values()).filter((row) => row[field] === value));
    },
    put,
    async putMany(records) {
      const results: T[] = [];
      for (const record of records) {
        results.push(await put(record));
      }
      return results;
    },
    delete(id) {
      table.delete(id);
      return Promise.resolve();
    },
    restoreMany(rows) {
      // Validate every row before writing any of them: a restore either lands whole or not at
      // all, matching `importBundle`'s single-transaction guarantee. Validation failures are
      // returned as a rejected promise, not a synchronous throw, so a caller can `await` or
      // `.catch()` this the same way as every other `Repository` method.
      for (const row of rows) {
        const error = restorableRowError(row);
        if (error) {
          return Promise.reject(error);
        }
      }
      const results: T[] = [];
      for (const row of rows) {
        const next = { ...row };
        table.set(next.id, next);
        results.push(next);
      }
      return Promise.resolve(results);
    },
  };
}

class MemoryStorageAdapter implements StorageAdapter {
  private readonly tables: Tables;

  readonly runs: Repository<Run, RunIndexedKey>;
  readonly routes: Repository<Route, RouteIndexedKey>;
  readonly encounters: Repository<Encounter, EncounterIndexedKey>;
  readonly mons: Repository<Mon, MonIndexedKey>;
  readonly deaths: Repository<Death, DeathIndexedKey>;
  readonly fights: Repository<Fight, FightIndexedKey>;

  constructor() {
    this.tables = createTables();
    this.runs = createRepository<Run, RunIndexedKey>(this.tables.runs);
    this.routes = createRepository<Route, RouteIndexedKey>(this.tables.routes);
    this.encounters = createRepository<Encounter, EncounterIndexedKey>(this.tables.encounters);
    this.mons = createRepository<Mon, MonIndexedKey>(this.tables.mons);
    this.deaths = createRepository<Death, DeathIndexedKey>(this.tables.deaths);
    this.fights = createRepository<Fight, FightIndexedKey>(this.tables.fights);
  }

  init(): Promise<void> {
    return Promise.resolve();
  }

  async transaction<T>(fn: (tx: StorageAdapter) => Promise<T>): Promise<T> {
    const snapshot = cloneTables(this.tables);
    try {
      return await fn(this);
    } catch (error) {
      restoreTable(this.tables.runs, snapshot.runs);
      restoreTable(this.tables.routes, snapshot.routes);
      restoreTable(this.tables.encounters, snapshot.encounters);
      restoreTable(this.tables.mons, snapshot.mons);
      restoreTable(this.tables.deaths, snapshot.deaths);
      restoreTable(this.tables.fights, snapshot.fights);
      throw error;
    }
  }

  exportAll(): Promise<ExportBundle> {
    return Promise.resolve({
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      runs: Array.from(this.tables.runs.values()),
      routes: Array.from(this.tables.routes.values()),
      encounters: Array.from(this.tables.encounters.values()),
      mons: Array.from(this.tables.mons.values()),
      deaths: Array.from(this.tables.deaths.values()),
      fights: Array.from(this.tables.fights.values()),
    });
  }

  clear(): Promise<void> {
    this.tables.runs.clear();
    this.tables.routes.clear();
    this.tables.encounters.clear();
    this.tables.mons.clear();
    this.tables.deaths.clear();
    this.tables.fights.clear();
    return Promise.resolve();
  }

  deathsByFight(fightId: string): Promise<Death[]> {
    return Promise.resolve(
      Array.from(this.tables.deaths.values()).filter(
        (death) => death.cause.type === "trainer" && death.cause.fightId === fightId,
      ),
    );
  }
}

export function createMemoryAdapter(): StorageAdapter {
  return new MemoryStorageAdapter();
}
