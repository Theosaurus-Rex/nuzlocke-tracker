import type { Timestamped } from "@/domain/types";

/** Returns an Error when a row is missing a field `restoreMany` requires, naming the field and
 * the row. Returns undefined when the row is restorable. */
export function restorableRowError<T extends Timestamped>(row: T): Error | undefined {
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

/** `where()` rejects null and undefined: IndexedDB cannot index them, so the two adapters would
 * otherwise disagree about what a nullable field matches. */
export function unindexableValueError(field: PropertyKey, value: null | undefined): Error {
  return new Error(
    `where("${String(field)}", ${String(value)}) is not supported: IndexedDB cannot ` +
      "index null values, so a nullable field can't be queried through where(). Use a " +
      "named adapter method instead (see deathsByFight).",
  );
}
