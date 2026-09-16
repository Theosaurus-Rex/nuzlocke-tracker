/**
 * Storage adapter interface. See
 * docs/superpowers/specs/2026-09-17-nuzlocke-scaffold-design.md section 7.
 *
 * This interface is the storage boundary (CLAUDE.md hard rule 1): nothing outside
 * `src/storage/` may depend on how a table is actually persisted. It exposes NO Dexie-only
 * capability — no `liveQuery`, no observables, no change subscriptions — because native SQLite
 * (M6) has no equivalent and reactivity belongs to the query layer (commit 9), not here.
 *
 * `where` is generic over a per-table set of indexed keys (`TIndexed`) rather than `keyof T`, so
 * querying an unindexed field is a compile error instead of a silent full-table scan. Anything
 * that is not a plain top-level equality match on an indexed field — compound conditions, or a
 * nested path like `Death['cause']['fightId']` — gets a named method on `StorageAdapter` instead
 * (see `deathsByFight`).
 */

import type { Draft, Timestamped, Run, Route, Encounter, Mon, Death, Fight } from "@/domain/types";
import type { ExportBundle } from "@/domain/schema";

// ---------------------------------------------------------------------------
// Per-table indexed key sets
// ---------------------------------------------------------------------------

export type RunIndexedKey = "id" | "status";
export type RouteIndexedKey = "id" | "runId";
export type EncounterIndexedKey = "id" | "runId" | "routeId" | "monId";
export type MonIndexedKey = "id" | "runId" | "status" | "encounterId";
export type DeathIndexedKey = "id" | "runId" | "monId";
export type FightIndexedKey = "id" | "runId" | "status";

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

/**
 * A typed collection of one table's rows.
 *
 * `put` semantics — this is the contract `adapter.contract.ts` tests exhaustively, because a
 * caller must never be able to get any of this wrong:
 *
 * - Assigns a fresh id via `crypto.randomUUID()` when `record.id` is absent. Preserves a
 *   supplied `id` (round-tripping an existing row, or an explicit id from a caller).
 * - Stamps `updatedAt` to the current time on EVERY write, insert or update, regardless of any
 *   `updatedAt` present on the draft. Hard rule 2 requires every record to carry its own
 *   `updatedAt`; stamping unconditionally is what makes forgetting it impossible.
 * - Sets `createdAt` only when the row is new (no existing row shares its id): uses the draft's
 *   `createdAt` if supplied (round-tripping an already-timestamped row), otherwise the current
 *   time. An update to an existing row always preserves that row's original `createdAt`,
 *   ignoring anything supplied on the draft.
 * - `put` is an upsert: putting the same `id` twice yields exactly one row holding the later
 *   values.
 */
export interface Repository<T extends Timestamped, TIndexed extends keyof T> {
  get(id: string): Promise<T | undefined>;
  getAll(): Promise<T[]>;
  /**
   * Equality match on an indexed field. Rejects with an Error when `value` is `null` or
   * `undefined`, rather than matching rows whose field holds that value: IndexedDB cannot index
   * `null`, so a Dexie-backed adapter and an in-memory one would otherwise silently disagree
   * about what `where(field, null)` returns. Query a nullable field through a named adapter
   * method instead (see `deathsByFight`).
   */
  where<K extends TIndexed>(field: K, value: T[K]): Promise<T[]>;
  put(record: Draft<T>): Promise<T>;
  putMany(records: Draft<T>[]): Promise<T[]>;
  delete(id: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// StorageAdapter
// ---------------------------------------------------------------------------

export interface StorageAdapter {
  init(): Promise<void>;

  runs: Repository<Run, RunIndexedKey>;
  routes: Repository<Route, RouteIndexedKey>;
  encounters: Repository<Encounter, EncounterIndexedKey>;
  mons: Repository<Mon, MonIndexedKey>;
  deaths: Repository<Death, DeathIndexedKey>;
  fights: Repository<Fight, FightIndexedKey>;

  /**
   * Runs `fn` against a scoped adapter so nested writes join one transaction. Every write made
   * through `tx` commits together when `fn` resolves, and every write made through `tx` is
   * rolled back — leaving the store exactly as it was before the call — when `fn` throws. The
   * thrown error is rethrown to the caller after rollback.
   *
   * This is what keeps a multi-row write (catching a mon writes an encounter and a mon
   * together, spec §5) from ever leaving a partial result: an encounter pointing at a mon that
   * does not exist.
   */
  transaction<T>(fn: (tx: StorageAdapter) => Promise<T>): Promise<T>;

  exportAll(): Promise<ExportBundle>;

  clear(): Promise<void>;

  /**
   * Deaths caused by a specific fight. `cause.fightId` lives inside the `trainer` variant of
   * `Death['cause']` — a nested path, not a `keyof Death` — so it cannot be expressed through
   * `where`. Returns only deaths whose `cause.type === 'trainer'` and whose `cause.fightId`
   * equals `fightId`; wild, status and other-cause deaths, and trainer deaths for a different
   * fight, are excluded.
   */
  deathsByFight(fightId: string): Promise<Death[]>;
}
