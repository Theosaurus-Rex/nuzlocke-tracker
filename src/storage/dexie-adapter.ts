/**
 * Dexie/IndexedDB storage adapter. See
 * docs/superpowers/specs/2026-09-17-nuzlocke-scaffold-design.md section 7 and CLAUDE.md hard
 * rules 1-5.
 *
 * `deaths` carries a nested `cause.fightId` index (a dotted keypath Dexie supports directly).
 * The index is sparse: only rows whose `cause` is the `trainer` variant appear in it, which is
 * what makes `deathsByFight` an index lookup rather than a full table scan. The method still
 * filters for `cause.type === 'trainer'` afterwards so its contract holds even if that sparse
 * behaviour ever changed.
 *
 * `transaction` maps to `db.transaction('rw', ...)`. The scope callback must run with no
 * intervening `await` on anything other than what Dexie itself returns — Dexie tracks the active
 * transaction through its own promise zone, and an `await` on a non-Dexie promise between opening
 * the transaction and invoking the caller's callback can silently drop out of it.
 */

import Dexie from "dexie";
import type { Table, Transaction, IndexableType } from "dexie";

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

const DEFAULT_DATABASE_NAME = "nuzlocke-tracker";

const TABLE_NAMES = ["runs", "routes", "encounters", "mons", "deaths", "fights"] as const;
type TableName = (typeof TABLE_NAMES)[number];

/**
 * The Dexie subclass. Version 1 schema per spec section 7 — plain `id` primary keys throughout
 * (hard rule 2 forbids autoincrement, so none of these use `++id`).
 */
class NuzlockeDexie extends Dexie {
  declare runs: Table<Run, string>;
  declare routes: Table<Route, string>;
  declare encounters: Table<Encounter, string>;
  declare mons: Table<Mon, string>;
  declare deaths: Table<Death, string>;
  declare fights: Table<Fight, string>;

  constructor(databaseName: string) {
    super(databaseName);
    this.version(1).stores({
      runs: "id, status",
      routes: "id, runId",
      encounters: "id, runId, routeId, monId",
      mons: "id, runId, status, encounterId",
      deaths: "id, runId, monId, cause.fightId",
      fights: "id, runId, status",
    });
  }
}

/**
 * Either the database itself or a `Transaction` obtained from `db.transaction(...)`. Both expose
 * `.table(name)`, and calling it on the transaction is what makes a `Repository` built from it
 * join that transaction rather than starting an independent one.
 */
type TableSource = NuzlockeDexie | Transaction;

function isDexieDb(source: TableSource): source is NuzlockeDexie {
  return source instanceof Dexie;
}

function getTable<T, TKey>(source: TableSource, name: TableName): Table<T, TKey> {
  // `Dexie#table` and `Transaction#table` are both callable as `(name: string) => Table`, but
  // their overload sets aren't compatible with each other, so TypeScript won't call `.table`
  // directly on the union — branch on the concrete type instead.
  if (isDexieDb(source)) {
    return source.table(name);
  }
  return source.table(name) as Table<T, TKey>;
}

interface DexieTables {
  runs: Table<Run, string>;
  routes: Table<Route, string>;
  encounters: Table<Encounter, string>;
  mons: Table<Mon, string>;
  deaths: Table<Death, string>;
  fights: Table<Fight, string>;
}

function buildTables(source: TableSource): DexieTables {
  return {
    runs: getTable<Run, string>(source, "runs"),
    routes: getTable<Route, string>(source, "routes"),
    encounters: getTable<Encounter, string>(source, "encounters"),
    mons: getTable<Mon, string>(source, "mons"),
    deaths: getTable<Death, string>(source, "deaths"),
    fights: getTable<Fight, string>(source, "fights"),
  };
}

/** One table's worth of CRUD, backed directly by a Dexie `Table` (top-level, or bound to a
 * running transaction — see `DexieStorageAdapter.transaction`). */
class DexieRepository<T extends Timestamped, TIndexed extends keyof T> implements Repository<
  T,
  TIndexed
> {
  private readonly table: Table<T, string>;

  constructor(table: Table<T, string>) {
    this.table = table;
  }

  get(id: string): Promise<T | undefined> {
    return this.table.get(id);
  }

  getAll(): Promise<T[]> {
    return this.table.toArray();
  }

  where<K extends TIndexed>(field: K, value: T[K]): Promise<T[]> {
    if (value === null || value === undefined) {
      return Promise.reject(
        new Error(
          `where("${String(field)}", ${String(value)}) is not supported: IndexedDB cannot ` +
            "index null values, so a nullable field can't be queried through where(). Use a " +
            "named adapter method instead (see deathsByFight).",
        ),
      );
    }

    return this.table
      .where(String(field))
      .equals(value as unknown as IndexableType)
      .toArray();
  }

  async put(record: Draft<T>): Promise<T> {
    const id = record.id ?? crypto.randomUUID();
    const existing = await this.table.get(id);
    const now = new Date().toISOString();
    const createdAt = existing ? existing.createdAt : (record.createdAt ?? now);

    const next = { ...record, id, createdAt, updatedAt: now } as T;
    await this.table.put(next);
    return next;
  }

  async putMany(records: Draft<T>[]): Promise<T[]> {
    const results: T[] = [];
    for (const record of records) {
      results.push(await this.put(record));
    }
    return results;
  }

  async delete(id: string): Promise<void> {
    await this.table.delete(id);
  }
}

class DexieStorageAdapter implements StorageAdapter {
  private readonly db: NuzlockeDexie;
  private readonly tables: DexieTables;

  readonly runs: Repository<Run, RunIndexedKey>;
  readonly routes: Repository<Route, RouteIndexedKey>;
  readonly encounters: Repository<Encounter, EncounterIndexedKey>;
  readonly mons: Repository<Mon, MonIndexedKey>;
  readonly deaths: Repository<Death, DeathIndexedKey>;
  readonly fights: Repository<Fight, FightIndexedKey>;

  constructor(db: NuzlockeDexie, source: TableSource = db) {
    this.db = db;
    this.tables = buildTables(source);
    this.runs = new DexieRepository(this.tables.runs);
    this.routes = new DexieRepository(this.tables.routes);
    this.encounters = new DexieRepository(this.tables.encounters);
    this.mons = new DexieRepository(this.tables.mons);
    this.deaths = new DexieRepository(this.tables.deaths);
    this.fights = new DexieRepository(this.tables.fights);
  }

  async init(): Promise<void> {
    if (!this.db.isOpen()) {
      await this.db.open();
    }
  }

  transaction<T>(fn: (tx: StorageAdapter) => Promise<T>): Promise<T> {
    const tableRefs = TABLE_NAMES.map((name) => this.db.table(name));
    // `fn` is invoked directly as the scope's return value — no `await` sits between entering
    // the transaction and running it, which is what keeps this inside Dexie's transaction zone.
    return this.db.transaction("rw", tableRefs, (trans) =>
      fn(new DexieStorageAdapter(this.db, trans)),
    );
  }

  async exportAll(): Promise<ExportBundle> {
    const [runs, routes, encounters, mons, deaths, fights] = await Promise.all([
      this.runs.getAll(),
      this.routes.getAll(),
      this.encounters.getAll(),
      this.mons.getAll(),
      this.deaths.getAll(),
      this.fights.getAll(),
    ]);

    return {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      runs,
      routes,
      encounters,
      mons,
      deaths,
      fights,
    };
  }

  async clear(): Promise<void> {
    await Promise.all([
      this.tables.runs.clear(),
      this.tables.routes.clear(),
      this.tables.encounters.clear(),
      this.tables.mons.clear(),
      this.tables.deaths.clear(),
      this.tables.fights.clear(),
    ]);
  }

  async deathsByFight(fightId: string): Promise<Death[]> {
    const matches = await this.tables.deaths.where("cause.fightId").equals(fightId).toArray();
    return matches.filter(
      (death) => death.cause.type === "trainer" && death.cause.fightId === fightId,
    );
  }
}

export function createDexieAdapter(databaseName: string = DEFAULT_DATABASE_NAME): StorageAdapter {
  const db = new NuzlockeDexie(databaseName);
  return new DexieStorageAdapter(db);
}
