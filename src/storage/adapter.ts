/**
 * Storage adapter interface: the boundary nothing outside `src/storage/` may cross.
 * `where` is generic over each table's indexed keys, not `keyof T`, so querying an unindexed
 * field is a compile error instead of a silent full-table scan.
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
 * `put` is an upsert: it assigns a fresh id when `record.id` is absent, stamps `updatedAt` to
 * the current time on every write, and preserves an existing row's original `createdAt` on
 * update.
 */
export interface Repository<T extends Timestamped, TIndexed extends keyof T> {
  get(id: string): Promise<T | undefined>;
  getAll(): Promise<T[]>;
  /**
   * Equality match on an indexed field. Rejects null or undefined: IndexedDB cannot index null,
   * and the two adapters would otherwise disagree about what `where(field, null)` returns.
   * Result order is unspecified. Sort it if you need one.
   */
  where<K extends TIndexed>(field: K, value: T[K]): Promise<T[]>;
  put(record: Draft<T>): Promise<T>;
  putMany(records: Draft<T>[]): Promise<T[]>;
  delete(id: string): Promise<void>;
  /**
   * Writes rows verbatim: id, createdAt and updatedAt are taken as given, never re-stamped.
   * Only for restoring a JSON backup or a future migration. Don't use it for an ordinary write,
   * since that defeats put's guarantee of a fresh updatedAt.
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
