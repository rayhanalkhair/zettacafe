import type { ServerContext } from '../context';
import type { Db } from '../db/db';
import type { RecipeIngredientRow, RecipeRow } from '../db/schema.types';
import type {
  CreateRecipeInput,
  MutationResolvers,
  QueryResolvers,
  RecipeIngredientResolvers,
  RecipeIngredientInput,
  RecipeResolvers,
  UpdateRecipeInput,
} from '../generated/resolvers';
import { servingsFor } from '../lib/availability';
import { currentUser, requireAdmin } from '../lib/auth';
import { errors } from '../lib/errors';
import { allIngredients, loadIngredients } from '../lib/loaders';
import { paginate } from '../lib/paginate';
import { discountedPrice } from '../lib/pricing';
import { optionalUrl, requireInt, requireText } from '../lib/validation';

const PRICE = { min: 1_000, max: 10_000_000 };
const PER_SERVING = { min: 1, max: 100_000 };

function priceOf(recipe: RecipeRow): number {
  return discountedPrice(recipe.priceIdr, recipe.discountPercent);
}

function byName(a: RecipeRow, b: RecipeRow): number {
  return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
}

/** Featured and discounted lists show only what can be ordered right now. */
async function orderable(ctx: ServerContext): Promise<RecipeRow[]> {
  const db = await ctx.db();
  const ingredients = await allIngredients(ctx);
  return (await db.getAll('recipes')).filter(
    (r) => r.deletedAt === null && r.status === 'PUBLISHED' && servingsFor(r, ingredients) > 0,
  );
}

function clampLimit(limit: number | null | undefined, fallback: number): number {
  return requireInt('limit', limit ?? fallback, { min: 1, max: 50 });
}

/** Every referenced ingredient must exist and be live; no ingredient may repeat. */
async function checkIngredientLines(
  db: Db,
  lines: readonly RecipeIngredientInput[],
): Promise<RecipeIngredientRow[]> {
  if (lines.length === 0) throw errors.validation('ingredients', 'needs at least one ingredient');
  const seen = new Set<string>();
  const out: RecipeIngredientRow[] = [];
  for (const line of lines) {
    if (seen.has(line.ingredientId)) {
      throw errors.validation('ingredients', 'lists the same ingredient twice');
    }
    seen.add(line.ingredientId);
    const row = await db.get('ingredients', line.ingredientId);
    if (!row || row.deletedAt !== null) throw errors.notFound('Ingredient', line.ingredientId);
    out.push({
      ingredientId: line.ingredientId,
      quantity: requireInt('ingredients.quantity', line.quantity, PER_SERVING),
    });
  }
  return out;
}

function cleanDescription(
  input: { en: string; id?: string | null | undefined } | null | undefined,
): RecipeRow['description'] {
  if (!input) return null;
  const en = requireText('description.en', input.en, { max: 500 });
  const id = input.id?.trim();
  return id ? { en, id: requireText('description.id', id, { max: 500 }) } : { en };
}

async function liveRecipe(db: Db, id: string): Promise<RecipeRow> {
  const row = await db.get('recipes', id);
  if (!row || row.deletedAt !== null) throw errors.notFound('Recipe', id);
  return row;
}

export const recipeQuery = {
  async recipes(_parent, { filter, page, sort }, ctx) {
    const user = await currentUser(ctx);
    const admin = user?.role === 'ADMIN';
    // Asking for drafts as a non-admin is an error, not silently ignored: a quiet
    // filter is a debugging trap.
    if (!admin && filter?.status === 'DRAFT') throw errors.forbidden();

    const db = await ctx.db();
    let rows = (await db.getAll('recipes')).filter((r) => r.deletedAt === null);

    const status = admin ? (filter?.status ?? null) : 'PUBLISHED';
    if (status) rows = rows.filter((r) => r.status === status);
    if (filter?.category) rows = rows.filter((r) => r.category === filter.category);
    const query = filter?.search?.trim().toLowerCase();
    if (query) rows = rows.filter((r) => r.name.toLowerCase().includes(query));

    const field = sort?.field ?? 'NAME';
    const direction = sort?.direction === 'DESC' ? -1 : 1;
    rows.sort((a, b) => {
      const primary =
        field === 'PRICE'
          ? priceOf(a) - priceOf(b)
          : field === 'DISCOUNT'
            ? a.discountPercent - b.discountPercent
            : a.name.localeCompare(b.name);
      return (primary || byName(a, b)) * direction;
    });
    return paginate(rows, page);
  },

  async recipe(_parent, { id }, ctx) {
    const user = await currentUser(ctx);
    const row = await (await ctx.db()).get('recipes', id);
    if (!row || row.deletedAt !== null) return null;
    if (user?.role !== 'ADMIN' && row.status !== 'PUBLISHED') return null;
    return row;
  },

  async featuredRecipes(_parent, { limit }, ctx) {
    const rows = (await orderable(ctx)).filter((r) => r.isFeatured).sort(byName);
    return rows.slice(0, clampLimit(limit, 6));
  },

  async discountedRecipes(_parent, { limit }, ctx) {
    const rows = (await orderable(ctx))
      .filter((r) => r.discountPercent > 0)
      .sort((a, b) => b.discountPercent - a.discountPercent || byName(a, b));
    return rows.slice(0, clampLimit(limit, 8));
  },
} satisfies Partial<QueryResolvers>;

export const recipeMutation = {
  async createRecipe(_parent, { input }: { input: CreateRecipeInput }, ctx) {
    await requireAdmin(ctx);
    const db = await ctx.db();
    const row: RecipeRow = {
      id: ctx.newId('rec'),
      name: requireText('name', input.name, { max: 120 }),
      description: cleanDescription(input.description),
      imageUrl: optionalUrl('imageUrl', input.imageUrl),
      category: input.category,
      source: 'USER',
      priceIdr: requireInt('priceIdr', input.priceIdr, PRICE),
      discountPercent: requireInt('discountPercent', input.discountPercent ?? 0, {
        min: 0,
        max: 100,
      }),
      status: input.status ?? 'DRAFT',
      isFeatured: false,
      ingredients: await checkIngredientLines(db, input.ingredients),
      createdAt: ctx.now().toISOString(),
      deletedAt: null,
    };
    await db.add('recipes', row);
    return row;
  },

  async updateRecipe(_parent, { id, input }: { id: string; input: UpdateRecipeInput }, ctx) {
    await requireAdmin(ctx);
    const db = await ctx.db();
    const current = await liveRecipe(db, id);
    const next: RecipeRow = { ...current };

    // On a partial update an omitted field is unchanged. `description` and
    // `imageUrl` are nullable content, so an explicit null clears them; for the
    // others null makes no sense and is rejected.
    const notNull = (field: string, value: unknown): void => {
      if (value === null) throw errors.validation(field, 'cannot be null');
    };
    if (input.name !== undefined) {
      notNull('name', input.name);
      next.name = requireText('name', input.name as string, { max: 120 });
    }
    if (input.description !== undefined) next.description = cleanDescription(input.description);
    if (input.imageUrl !== undefined) next.imageUrl = optionalUrl('imageUrl', input.imageUrl);
    if (input.category !== undefined) {
      notNull('category', input.category);
      next.category = input.category as RecipeRow['category'];
    }
    if (input.priceIdr !== undefined) {
      notNull('priceIdr', input.priceIdr);
      next.priceIdr = requireInt('priceIdr', input.priceIdr as number, PRICE);
    }
    if (input.discountPercent !== undefined) {
      notNull('discountPercent', input.discountPercent);
      next.discountPercent = requireInt('discountPercent', input.discountPercent as number, {
        min: 0,
        max: 100,
      });
    }
    if (input.ingredients !== undefined) {
      notNull('ingredients', input.ingredients);
      next.ingredients = await checkIngredientLines(
        db,
        input.ingredients as RecipeIngredientInput[],
      );
    }
    await db.put('recipes', next);
    return next;
  },

  async setRecipeStatus(_parent, { id, status }, ctx) {
    await requireAdmin(ctx);
    const db = await ctx.db();
    const next: RecipeRow = { ...(await liveRecipe(db, id)), status };
    await db.put('recipes', next);
    return next;
  },

  async setRecipeFeatured(_parent, { id, isFeatured }, ctx) {
    await requireAdmin(ctx);
    const db = await ctx.db();
    const next: RecipeRow = { ...(await liveRecipe(db, id)), isFeatured };
    await db.put('recipes', next);
    return next;
  },

  async deleteRecipe(_parent, { id }, ctx) {
    await requireAdmin(ctx);
    const db = await ctx.db();
    // Archive, never remove: past orders and carts still reference it.
    const next: RecipeRow = { ...(await liveRecipe(db, id)), deletedAt: ctx.now().toISOString() };
    await db.put('recipes', next);
    return next;
  },
} satisfies Partial<MutationResolvers>;

export const recipeType = {
  description: (recipe, { locale }) =>
    locale === 'ID'
      ? (recipe.description?.id ?? recipe.description?.en ?? null)
      : (recipe.description?.en ?? null),

  discountedPriceIdr: (recipe) => priceOf(recipe),

  async ingredientNames(recipe, _args, ctx) {
    const rows = await loadIngredients(
      ctx,
      recipe.ingredients.map((i) => i.ingredientId),
    );
    return recipe.ingredients.map((i) => rows.get(i.ingredientId)?.name ?? i.ingredientId);
  },

  // Quantities and live stock are admin-only. Null (not an error) for everyone
  // else, so a guest cannot read inventory and asking for it does not fail the
  // whole recipe.
  async ingredients(recipe, _args, ctx) {
    return (await currentUser(ctx))?.role === 'ADMIN' ? recipe.ingredients : null;
  },

  async availableServings(recipe, _args, ctx) {
    return servingsFor(
      recipe,
      await loadIngredients(
        ctx,
        recipe.ingredients.map((i) => i.ingredientId),
      ),
    );
  },

  async isAvailable(recipe, _args, ctx) {
    const rows = await loadIngredients(
      ctx,
      recipe.ingredients.map((i) => i.ingredientId),
    );
    return servingsFor(recipe, rows) > 0;
  },
} satisfies RecipeResolvers;

export const recipeIngredientType = {
  async ingredient(line, _args, ctx) {
    const row = await (await ctx.db()).get('ingredients', line.ingredientId);
    if (!row) throw errors.notFound('Ingredient', line.ingredientId);
    return row;
  },
} satisfies RecipeIngredientResolvers;
