import type { Db } from '../db/db';
import type { IngredientRow } from '../db/schema.types';
import type {
  IngredientResolvers,
  MutationResolvers,
  QueryResolvers,
} from '../generated/resolvers';
import { requireAdmin } from '../lib/auth';
import { errors } from '../lib/errors';
import { paginate } from '../lib/paginate';
import { requireInt, requireText } from '../lib/validation';

const STOCK = { min: 0, max: 1_000_000 };

async function liveIngredient(db: Db, id: string): Promise<IngredientRow> {
  const row = await db.get('ingredients', id);
  if (!row || row.deletedAt !== null) throw errors.notFound('Ingredient', id);
  return row;
}

/** Names are unique among live ingredients, case-insensitively. */
async function assertNameFree(db: Db, name: string, exceptId: string | null): Promise<void> {
  const lower = name.toLowerCase();
  const clash = (await db.getAll('ingredients')).some(
    (r) => r.deletedAt === null && r.id !== exceptId && r.name.toLowerCase() === lower,
  );
  if (clash) throw errors.validation('name', 'already exists');
}

export const ingredientQuery = {
  async ingredients(_parent, { filter, page, sort }, ctx) {
    await requireAdmin(ctx);
    const db = await ctx.db();
    let rows = (await db.getAll('ingredients')).filter((r) => r.deletedAt === null);

    const query = filter?.search?.trim().toLowerCase();
    if (query) rows = rows.filter((r) => r.name.toLowerCase().includes(query));
    if (filter?.isAvailable !== undefined && filter.isAvailable !== null) {
      rows = rows.filter((r) => r.stockQty > 0 === filter.isAvailable);
    }

    const direction = sort?.direction === 'DESC' ? -1 : 1;
    const byStock = sort?.field === 'STOCK';
    rows.sort((a, b) => {
      const primary = byStock ? a.stockQty - b.stockQty : a.name.localeCompare(b.name);
      return (primary || a.name.localeCompare(b.name) || a.id.localeCompare(b.id)) * direction;
    });
    return paginate(rows, page);
  },
} satisfies Partial<QueryResolvers>;

export const ingredientMutation = {
  async createIngredient(_parent, { input }, ctx) {
    await requireAdmin(ctx);
    const db = await ctx.db();
    const name = requireText('name', input.name, { max: 80 });
    await assertNameFree(db, name, null);
    const row: IngredientRow = {
      id: ctx.newId('ing'),
      name,
      stockQty: requireInt('stockQty', input.stockQty, STOCK),
      unit: requireText('unit', input.unit, { max: 16 }),
      deletedAt: null,
    };
    await db.add('ingredients', row);
    return row;
  },

  async updateIngredient(_parent, { id, input }, ctx) {
    await requireAdmin(ctx);
    const db = await ctx.db();
    const next: IngredientRow = { ...(await liveIngredient(db, id)) };

    if (input.name !== undefined && input.name !== null) {
      next.name = requireText('name', input.name, { max: 80 });
      await assertNameFree(db, next.name, id);
    }
    if (input.stockQty !== undefined && input.stockQty !== null) {
      next.stockQty = requireInt('stockQty', input.stockQty, STOCK);
    }
    if (input.unit !== undefined && input.unit !== null) {
      next.unit = requireText('unit', input.unit, { max: 16 });
    }
    await db.put('ingredients', next);
    return next;
  },

  async adjustIngredientStock(_parent, { id, deltaQty }, ctx) {
    await requireAdmin(ctx);
    requireInt('deltaQty', deltaQty, { min: -STOCK.max, max: STOCK.max });
    const db = await ctx.db();
    // Read-modify-write inside one transaction so two restocks cannot overwrite
    // each other with a stale total.
    const tx = db.transaction('ingredients', 'readwrite');
    const current = await tx.store.get(id);
    if (!current || current.deletedAt !== null) throw errors.notFound('Ingredient', id);
    const stockQty = current.stockQty + deltaQty;
    if (stockQty < 0) throw errors.validation('deltaQty', 'would take stock below zero');
    if (stockQty > STOCK.max) throw errors.validation('deltaQty', 'would exceed the maximum stock');
    const next = { ...current, stockQty };
    await tx.store.put(next);
    await tx.done;
    return next;
  },

  async deleteIngredient(_parent, { id }, ctx) {
    await requireAdmin(ctx);
    const db = await ctx.db();
    const current = await liveIngredient(db, id);
    const using = (await db.getAll('recipes')).filter(
      (r) => r.deletedAt === null && r.ingredients.some((i) => i.ingredientId === id),
    );
    if (using.length > 0) throw errors.recipeInUse(using.map((r) => r.id));
    const next: IngredientRow = { ...current, deletedAt: ctx.now().toISOString() };
    await db.put('ingredients', next);
    return next;
  },
} satisfies Partial<MutationResolvers>;

export const ingredientType = {
  isAvailable: (ingredient) => ingredient.deletedAt === null && ingredient.stockQty > 0,
} satisfies IngredientResolvers;
