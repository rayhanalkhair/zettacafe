import type { IDBPDatabase } from 'idb';
import type { ZettaDb } from './schema.types';

/**
 * Schema migrations, driven by IndexedDB's `upgrade` callback.
 *
 * Add a new `if (oldVersion < N)` block and bump DB_VERSION in db.ts. Never edit
 * an old block, and never "migrate" by wiping: a returning user may have a cart,
 * an order history and a credit balance in here.
 */
export function migrate(db: IDBPDatabase<ZettaDb>, oldVersion: number): void {
  if (oldVersion < 1) {
    const users = db.createObjectStore('users', { keyPath: 'id' });
    users.createIndex('byEmail', 'email', { unique: true });

    const sessions = db.createObjectStore('sessions', { keyPath: 'token' });
    sessions.createIndex('byUser', 'userId');

    db.createObjectStore('ingredients', { keyPath: 'id' });
    db.createObjectStore('recipes', { keyPath: 'id' });

    const orders = db.createObjectStore('orders', { keyPath: 'id' });
    orders.createIndex('byUser', 'userId');
    orders.createIndex('byCreatedAt', 'createdAt');

    db.createObjectStore('resetCodes', { keyPath: 'email' });
    db.createObjectStore('meta', { keyPath: 'key' });
  }
}
