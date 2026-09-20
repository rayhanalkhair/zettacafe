import type { ServerContext } from '../context';
import type { Db } from '../db/db';
import { loadDrinks, toDrinkRows } from './drinks.remote';
import { buildFoodSeed } from './food.seed';
import { INGREDIENT_SEED } from './ingredients.seed';
import { buildUsers } from './users.seed';

/**
 * Bump when the seed data changes. Seeding is idempotent and never destructive:
 * it only ADDS rows that are missing, so bumping the version cannot reset a
 * returning user's stock, credit, cart or edited recipes.
 */
export const SEED_VERSION = 1;

export type SeedContext = Pick<ServerContext, 'now' | 'config' | 'fetch'>;

interface Addable<T> {
  get(key: string): Promise<T | undefined>;
  add(value: T): Promise<unknown>;
}

async function addMissing<T>(
  store: Addable<T>,
  rows: readonly T[],
  keyOf: (row: T) => string,
): Promise<void> {
  for (const row of rows) {
    if ((await store.get(keyOf(row))) === undefined) await store.add(row);
  }
}

export async function ensureSeeded(db: Db, ctx: SeedContext): Promise<void> {
  const current = (await db.get('meta', 'seedVersion'))?.value;
  if (typeof current === 'number' && current >= SEED_VERSION) return;

  const createdAt = ctx.now().toISOString();

  // Everything slow (hashing, the network) happens BEFORE the transaction opens:
  // an IndexedDB transaction closes itself if it waits on anything that is not an
  // IndexedDB request.
  const users = await buildUsers(ctx.config.pbkdf2Iterations, createdAt);
  const drinks = toDrinkRows(await loadDrinks(ctx.fetch), createdAt);

  const tx = db.transaction(['ingredients', 'recipes', 'users', 'meta'], 'readwrite');
  await addMissing(
    tx.objectStore('ingredients'),
    [...INGREDIENT_SEED, ...drinks.ingredients],
    (r) => r.id,
  );
  await addMissing(
    tx.objectStore('recipes'),
    [...buildFoodSeed(createdAt), ...drinks.recipes],
    (r) => r.id,
  );
  await addMissing(tx.objectStore('users'), users, (r) => r.id);
  await tx.objectStore('meta').put({ key: 'seedVersion', value: SEED_VERSION });
  await tx.done;
}
