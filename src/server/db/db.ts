import { deleteDB, openDB, type IDBPDatabase } from 'idb';
import { migrate } from './migrations';
import type { ZettaDb } from './schema.types';

export type Db = IDBPDatabase<ZettaDb>;

export const DB_NAME = 'zettacafe';
export const DB_VERSION = 1;

const open = new Map<string, Promise<Db>>();

/**
 * Opens the database once per name and shares the handle. `prepare` runs exactly
 * once after opening (used to seed), and every caller awaits it, so the first
 * operation of a session opens and seeds and later ones reuse the result.
 */
export function openDatabase(
  name: string = DB_NAME,
  prepare?: (db: Db) => Promise<void>,
): Promise<Db> {
  let pending = open.get(name);
  if (!pending) {
    pending = (async () => {
      const db = await openDB<ZettaDb>(name, DB_VERSION, {
        upgrade: (database, oldVersion) => {
          migrate(database, oldVersion);
        },
      });
      await prepare?.(db);
      return db;
    })();
    // A failed open must not poison the cache: the next call retries.
    pending.catch(() => open.delete(name));
    open.set(name, pending);
  }
  return pending;
}

/** Closes and deletes the database. Used by reset and by tests. */
export async function deleteDatabase(name: string = DB_NAME): Promise<void> {
  const pending = open.get(name);
  open.delete(name);
  if (pending) {
    const db = await pending.catch(() => null);
    db?.close();
  }
  await deleteDB(name);
}
