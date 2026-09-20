import type { ServerContext } from '../context';
import type { IngredientRow, RecipeRow } from '../db/schema.types';

/** Batch reads used by resolvers that need several rows of one kind. */

export async function loadIngredients(
  ctx: ServerContext,
  ids: Iterable<string>,
): Promise<Map<string, IngredientRow>> {
  const db = await ctx.db();
  const unique = [...new Set(ids)];
  const rows = await Promise.all(unique.map((id) => db.get('ingredients', id)));
  return new Map(rows.filter((r): r is IngredientRow => r !== undefined).map((r) => [r.id, r]));
}

export async function loadRecipes(
  ctx: ServerContext,
  ids: Iterable<string>,
): Promise<Map<string, RecipeRow>> {
  const db = await ctx.db();
  const unique = [...new Set(ids)];
  const rows = await Promise.all(unique.map((id) => db.get('recipes', id)));
  return new Map(rows.filter((r): r is RecipeRow => r !== undefined).map((r) => [r.id, r]));
}

export async function allIngredients(ctx: ServerContext): Promise<Map<string, IngredientRow>> {
  const db = await ctx.db();
  return new Map((await db.getAll('ingredients')).map((r) => [r.id, r]));
}
