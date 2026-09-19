/**
 * Storage adapter interface. This is the storage boundary (CLAUDE.md hard rule 1); see that rule
 * for why nothing outside `src/storage/` may depend on how a table is persisted.
 *
 * `where` is generic over a per-table set of indexed keys (`TIndexed`) rather than `keyof T`, so
 * querying an unindexed field is a compile error instead of a silent full-table scan.
 */

import type { Draft, Timestamped, Run, Route, Encounter, Mon, Death, Fight } from "@/domain/types";
import type { ExportBundle } from "@/domain/schema";

export type RunIndexedKey = "id" | "status";
export type RouteIndexedKey = "id" | "runId";
export type EncounterIndexedKey = "id" | "runId" | "routeId" | "monId";
export type MonIndexedKey = "id" | "runId" | "status" | "encounterId";
export type DeathIndexedKey = "id" | "runId" | "monId";
export type FightIndexedKey = "id" | "runId" | "status";

/**
 * A typed collection of one table's rows.
 *
 * `put` is an upsert: it assigns a fresh id when `record.id` is absent, stamps `updatedAt` to
 * the current time on every write regardless of what the draft carries, and preserves an
 * existing row's original `createdAt` on update.
 */
export interface Repository<T extends Timestamped, TIndexed extends keyof T> {
  get(id: string): Promise<T | undefined>;
  getAll(): Promise<T[]>;
  /**
   * Equality match on an indexed field. Rejects when `value` is `null` or `undefined`, since
   * IndexedDB cannot index `null` and a Dexie-backed adapter and an in-memory one would otherwise
   * disagree about what `where(field, null)` returns. Result order is unspecified; a caller that
   * needs an order must sort it.
   */
  where<K extends TIndexed>(field: K, value: T[K]): Promise<T[]>;
  put(record: Draft<T>): Promise<T>;
  putMany(records: Draft<T>[]): Promise<T[]>;
  delete(id: string): Promise<void>;
  /**
   * Writes `rows` verbatim: `id`, `createdAt` and `updatedAt` are taken from the row as given and
   * never re-stamped. Exists only for restoring a JSON backup and the future SQLite migration.
   * Do not use this for an ordinary write; reaching for it because it looks more direct than
   * `put` defeats `put`'s guarantee that every write carries a fresh `updatedAt`.
   *
   * Takes a fully-formed `T[]`, not `Draft<T>[]`. Throws when a row lacks `id`, `createdAt` or
   * `updatedAt`, naming both the missing field and the row's id.
   */
  restoreMany(rows: T[]): Promise<T[]>;
}

export interface StorageAdapter {
  init(): Promise<void>;

  runs: Repository<Run, RunIndexedKey>;
  routes: Repository<Route, RouteIndexedKey>;
  encounters: Repository<Encounter, EncounterIndexedKey>;
  mons: Repository<Mon, MonIndexedKey>;
  deaths: Repository<Death, DeathIndexedKey>;
  fights: Repository<Fight, FightIndexedKey>;

  /**
   * Runs `fn` against a scoped adapter so nested writes join one transaction: everything written
   * through `tx` commits together on resolve, or rolls back entirely if `fn` throws, and the
   * error is rethrown after rollback.
   */
  transaction<T>(fn: (tx: StorageAdapter) => Promise<T>): Promise<T>;

  exportAll(): Promise<ExportBundle>;

  clear(): Promise<void>;

  /**
   * Deaths caused by a specific fight. `cause.fightId` is a nested path inside the `trainer`
   * variant of `Death['cause']`, not a `keyof Death`, so `where` cannot express it.
   */
  deathsByFight(fightId: string): Promise<Death[]>;
}
