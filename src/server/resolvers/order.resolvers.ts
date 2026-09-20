import type { ServerContext } from '../context';
import type {
  FrozenLine,
  IngredientRow,
  OrderLineRow,
  OrderRow,
  RecipeRow,
  UserRow,
} from '../db/schema.types';
import type {
  MutationResolvers,
  OrderLineResolvers,
  OrderResolvers,
  QueryResolvers,
} from '../generated/resolvers';
import { isOrderable, planCart, stockShortages } from '../lib/availability';
import { requireUser } from '../lib/auth';
import { errors } from '../lib/errors';
import { allIngredients, loadRecipes } from '../lib/loaders';
import { paginate } from '../lib/paginate';
import { discountedPrice, lineTotal } from '../lib/pricing';
import { requireInt } from '../lib/validation';

const QUANTITY = { min: 1, max: 99 };
const NOTE_MAX = 200;

/** One cart per user, with a stable id, so a persisted cart and an empty one are the same entity. */
export const cartId = (userId: string): string => `cart_${userId}`;

function emptyCart(user: UserRow, now: Date): OrderRow {
  const createdAt = now.toISOString();
  return {
    id: cartId(user.id),
    userId: user.id,
    status: 'DRAFT',
    lines: [],
    totalIdr: null,
    createdAt,
    placedAt: null,
  };
}

function cleanNote(note: string | null | undefined): string | null {
  const text = note?.trim();
  if (!text) return null;
  if (text.length > NOTE_MAX)
    throw errors.validation('note', `must be at most ${NOTE_MAX} characters`);
  return text;
}

/** Undo everything: an error must never leave a half-applied transaction behind. */
function abortQuietly(tx: { abort(): void; done: Promise<void> }): void {
  tx.done.catch(() => undefined);
  try {
    tx.abort();
  } catch {
    // already finished
  }
}

/** What a line costs and is called: frozen if the order is placed, live from the recipe otherwise. */
function describeLine(line: OrderLineRow, recipe: RecipeRow | undefined): FrozenLine {
  if (line.frozen) return line.frozen;
  return {
    recipeName: recipe?.name ?? line.recipeId,
    recipeImageUrl: recipe?.imageUrl ?? null,
    listPriceIdr: recipe?.priceIdr ?? 0,
    discountPercent: recipe?.discountPercent ?? 0,
    unitPriceIdr: recipe ? discountedPrice(recipe.priceIdr, recipe.discountPercent) : 0,
  };
}

async function readCart(ctx: ServerContext, user: UserRow): Promise<OrderRow> {
  const row = await (await ctx.db()).get('orders', cartId(user.id));
  return row ?? emptyCart(user, ctx.now());
}

export const orderQuery = {
  async cart(_parent, _args, ctx) {
    const user = await requireUser(ctx).catch(() => null);
    return user ? readCart(ctx, user) : null;
  },

  async order(_parent, { id }, ctx) {
    const user = await requireUser(ctx);
    if (id === cartId(user.id)) return readCart(ctx, user);
    const row = await (await ctx.db()).get('orders', id);
    // Someone else's order, or a cart, is indistinguishable from one that does not exist.
    if (!row || row.status !== 'PLACED') return null;
    return user.role === 'ADMIN' || row.userId === user.id ? row : null;
  },

  async orderHistory(_parent, { page, filter }, ctx) {
    const user = await requireUser(ctx);
    const db = await ctx.db();
    const everyone = user.role === 'ADMIN' && filter?.mine !== true;
    const rows = (await db.getAll('orders'))
      .filter((o) => o.status === 'PLACED' && (everyone || o.userId === user.id))
      .sort((a, b) => (b.placedAt ?? b.createdAt).localeCompare(a.placedAt ?? a.createdAt));
    return paginate(rows, page);
  },
} satisfies Partial<QueryResolvers>;

export const orderMutation = {
  async addCartLine(_parent, { input }, ctx) {
    const user = await requireUser(ctx);
    const quantity = requireInt('quantity', input.quantity ?? 1, QUANTITY);
    const note = cleanNote(input.note);
    const db = await ctx.db();

    const recipe = await db.get('recipes', input.recipeId);
    if (!recipe || recipe.deletedAt !== null) throw errors.notFound('Recipe', input.recipeId);
    // isOrderable is a type guard, so read the id first: in the negated branch the
    // compiler narrows `recipe` to `never`.
    const recipeId = recipe.id;
    if (!isOrderable(recipe)) throw errors.recipeUnavailable(recipeId);

    const tx = db.transaction('orders', 'readwrite');
    const cart = (await tx.store.get(cartId(user.id))) ?? emptyCart(user, ctx.now());
    const existing = cart.lines.find((l) => l.recipeId === recipe.id);

    let lines: OrderLineRow[];
    if (existing) {
      const total = existing.quantity + quantity;
      if (total > QUANTITY.max) {
        throw errors.validation('quantity', `a cart holds at most ${QUANTITY.max} of one dish`);
      }
      // Adding again raises the quantity; a supplied note replaces the old one.
      lines = cart.lines.map((l) =>
        l.id === existing.id
          ? {
              ...l,
              quantity: total,
              note: input.note !== null && input.note !== undefined ? note : l.note,
            }
          : l,
      );
    } else {
      lines = [
        ...cart.lines,
        { id: ctx.newId('line'), recipeId: recipe.id, quantity, note, frozen: null },
      ];
    }
    const next: OrderRow = { ...cart, lines };
    await tx.store.put(next);
    await tx.done;
    return next;
  },

  async updateCartLine(_parent, { input }, ctx) {
    const user = await requireUser(ctx);
    const quantity = requireInt('quantity', input.quantity, QUANTITY);
    const note = cleanNote(input.note);
    const db = await ctx.db();

    const tx = db.transaction('orders', 'readwrite');
    const cart = (await tx.store.get(cartId(user.id))) ?? emptyCart(user, ctx.now());
    if (!cart.lines.some((l) => l.id === input.lineId)) {
      throw errors.notFound('CartLine', input.lineId);
    }
    // The line is found by ITS id. v1 always operated on the first cart entry
    // regardless of which one the user clicked.
    const next: OrderRow = {
      ...cart,
      lines: cart.lines.map((l) => (l.id === input.lineId ? { ...l, quantity, note } : l)),
    };
    await tx.store.put(next);
    await tx.done;
    return next;
  },

  async removeCartLine(_parent, { lineId }, ctx) {
    const user = await requireUser(ctx);
    const db = await ctx.db();

    const tx = db.transaction('orders', 'readwrite');
    const cart = (await tx.store.get(cartId(user.id))) ?? emptyCart(user, ctx.now());
    if (!cart.lines.some((l) => l.id === lineId)) throw errors.notFound('CartLine', lineId);

    const lines = cart.lines.filter((l) => l.id !== lineId);
    if (lines.length === 0) {
      await tx.store.delete(cart.id);
      await tx.done;
      return emptyCart(user, ctx.now());
    }
    const next: OrderRow = { ...cart, lines };
    await tx.store.put(next);
    await tx.done;
    return next;
  },

  async cancelCart(_parent, _args, ctx) {
    const user = await requireUser(ctx);
    await (await ctx.db()).delete('orders', cartId(user.id));
    return emptyCart(user, ctx.now());
  },

  /**
   * Places the cart atomically. All four stores are opened in ONE readwrite
   * transaction; every check that can fail happens before the first write, and
   * any error aborts the transaction, so a failure changes nothing: credit is
   * never debited without the stock being taken, nor the reverse.
   */
  async checkout(_parent, { expectedTotalIdr }, ctx) {
    const caller = await requireUser(ctx);
    const db = await ctx.db();
    const tx = db.transaction(['recipes', 'ingredients', 'users', 'orders'], 'readwrite');

    try {
      const user = await tx.objectStore('users').get(caller.id);
      if (!user) throw errors.unauthenticated();
      const cart = await tx.objectStore('orders').get(cartId(user.id));
      if (!cart || cart.lines.length === 0) throw errors.emptyCart();

      const recipes = new Map<string, RecipeRow>();
      for (const line of cart.lines) {
        const recipe = await tx.objectStore('recipes').get(line.recipeId);
        if (recipe) recipes.set(recipe.id, recipe);
      }
      for (const line of cart.lines) {
        if (!isOrderable(recipes.get(line.recipeId))) throw errors.recipeUnavailable(line.recipeId);
      }

      const ingredients = new Map<string, IngredientRow>();
      for (const recipe of recipes.values()) {
        for (const need of recipe.ingredients) {
          const row = await tx.objectStore('ingredients').get(need.ingredientId);
          if (row) ingredients.set(row.id, row);
        }
      }

      const shortages = stockShortages(cart.lines, recipes, ingredients);
      if (shortages.length > 0) throw errors.insufficientStock(shortages);

      const lines: OrderLineRow[] = cart.lines.map((line) => {
        const recipe = recipes.get(line.recipeId)!;
        return { ...line, frozen: describeLine({ ...line, frozen: null }, recipe) };
      });
      const total = lines.reduce(
        (sum, l) => sum + lineTotal(l.frozen!.unitPriceIdr, l.quantity),
        0,
      );

      if (
        expectedTotalIdr !== null &&
        expectedTotalIdr !== undefined &&
        expectedTotalIdr !== total
      ) {
        throw errors.priceChanged(expectedTotalIdr, total);
      }
      if (user.creditIdr < total) throw errors.insufficientCredit(total, user.creditIdr);

      // ---- Writes only from here. ----
      const used = new Map<string, number>();
      for (const line of cart.lines) {
        for (const need of recipes.get(line.recipeId)!.ingredients) {
          used.set(
            need.ingredientId,
            (used.get(need.ingredientId) ?? 0) + need.quantity * line.quantity,
          );
        }
      }
      for (const [id, quantity] of used) {
        const row = ingredients.get(id)!;
        await tx.objectStore('ingredients').put({ ...row, stockQty: row.stockQty - quantity });
      }
      await tx.objectStore('users').put({ ...user, creditIdr: user.creditIdr - total });

      const now = ctx.now().toISOString();
      const placed: OrderRow = {
        id: ctx.newId('ord'),
        userId: user.id,
        status: 'PLACED',
        lines,
        totalIdr: total,
        createdAt: cart.createdAt,
        placedAt: now,
      };
      await tx.objectStore('orders').put(placed);
      await tx.objectStore('orders').delete(cart.id);
      await tx.done;
      return placed;
    } catch (error) {
      abortQuietly(tx);
      throw error;
    }
  },
} satisfies Partial<MutationResolvers>;

export const orderType = {
  async user(order, _args, ctx) {
    const row = await (await ctx.db()).get('users', order.userId);
    if (!row) throw errors.notFound('User', order.userId);
    return row;
  },

  lines: (order) => order.lines,

  async totalIdr(order, _args, ctx) {
    if (order.totalIdr !== null) return order.totalIdr;
    const recipes = await loadRecipes(
      ctx,
      order.lines.map((l) => l.recipeId),
    );
    return order.lines.reduce(
      (sum, l) =>
        sum + lineTotal(describeLine(l, recipes.get(l.recipeId)).unitPriceIdr, l.quantity),
      0,
    );
  },

  /** Only a cart can have issues; a placed order already succeeded. */
  async issues(order, _args, ctx) {
    if (order.status !== 'DRAFT') return [];
    const recipes = await loadRecipes(
      ctx,
      order.lines.map((l) => l.recipeId),
    );
    return planCart(order.lines, recipes, await allIngredients(ctx));
  },
} satisfies OrderResolvers;

export const orderLineType = {
  // Null once the recipe is archived: history must keep rendering from the frozen fields.
  async recipe(line, _args, ctx) {
    const row = await (await ctx.db()).get('recipes', line.recipeId);
    return row && row.deletedAt === null ? row : null;
  },
  async recipeName(line, _args, ctx) {
    return describeLine(line, (await loadRecipes(ctx, [line.recipeId])).get(line.recipeId))
      .recipeName;
  },
  async recipeImageUrl(line, _args, ctx) {
    return describeLine(line, (await loadRecipes(ctx, [line.recipeId])).get(line.recipeId))
      .recipeImageUrl;
  },
  async listPriceIdr(line, _args, ctx) {
    return describeLine(line, (await loadRecipes(ctx, [line.recipeId])).get(line.recipeId))
      .listPriceIdr;
  },
  async discountPercent(line, _args, ctx) {
    return describeLine(line, (await loadRecipes(ctx, [line.recipeId])).get(line.recipeId))
      .discountPercent;
  },
  async unitPriceIdr(line, _args, ctx) {
    return describeLine(line, (await loadRecipes(ctx, [line.recipeId])).get(line.recipeId))
      .unitPriceIdr;
  },
  async lineTotalIdr(line, _args, ctx) {
    const unit = describeLine(
      line,
      (await loadRecipes(ctx, [line.recipeId])).get(line.recipeId),
    ).unitPriceIdr;
    return lineTotal(unit, line.quantity);
  },
} satisfies OrderLineResolvers;
