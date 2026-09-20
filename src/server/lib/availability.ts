import type { IngredientRow, OrderLineRow, RecipeRow } from '../db/schema.types';
import type { CartIssueModel } from '../models';
import type { StockShortage } from './errors';

export type IngredientMap = ReadonlyMap<string, IngredientRow>;
export type RecipeMap = ReadonlyMap<string, RecipeRow>;

/**
 * THE stock rule. Portions that can be made right now: the minimum over the
 * recipe's ingredients of floor(stock / quantity per serving).
 *
 * An archived or missing ingredient, or a recipe with no ingredients, makes zero.
 * v1 implemented this twice (once in a component, once in checkout) and the two
 * could disagree; everything now goes through here.
 */
export function servingsFor(recipe: RecipeRow, ingredients: IngredientMap): number {
  if (recipe.ingredients.length === 0) return 0;
  let servings = Number.POSITIVE_INFINITY;
  for (const need of recipe.ingredients) {
    const stock = ingredients.get(need.ingredientId);
    if (!stock || stock.deletedAt !== null || need.quantity <= 0) return 0;
    servings = Math.min(servings, Math.floor(stock.stockQty / need.quantity));
  }
  return servings;
}

/** Can this recipe be ordered at all, ignoring stock? */
export function isOrderable(recipe: RecipeRow | undefined): recipe is RecipeRow {
  return recipe !== undefined && recipe.deletedAt === null && recipe.status === 'PUBLISHED';
}

/**
 * Which cart lines would fail checkout, and how much of each could be ordered.
 *
 * Lines share ingredients, so stock is allocated line by line in cart order: a
 * line that fits takes its stock, and later lines see what is left. A line that
 * does not fit is reported and takes nothing, since checkout is blocked anyway.
 */
export function planCart(
  lines: readonly OrderLineRow[],
  recipes: RecipeMap,
  ingredients: IngredientMap,
): CartIssueModel[] {
  const remaining = new Map<string, number>();
  const left = (id: string): number => remaining.get(id) ?? ingredients.get(id)?.stockQty ?? 0;
  const issues: CartIssueModel[] = [];

  for (const line of lines) {
    const recipe = recipes.get(line.recipeId);
    if (!isOrderable(recipe)) {
      issues.push({ line, kind: 'UNPUBLISHED', maxOrderableQuantity: 0 });
      continue;
    }

    let max = recipe.ingredients.length === 0 ? 0 : Number.POSITIVE_INFINITY;
    for (const need of recipe.ingredients) {
      const stock = ingredients.get(need.ingredientId);
      if (!stock || stock.deletedAt !== null || need.quantity <= 0) {
        max = 0;
        break;
      }
      max = Math.min(max, Math.floor(left(need.ingredientId) / need.quantity));
    }

    if (max >= line.quantity) {
      for (const need of recipe.ingredients) {
        remaining.set(need.ingredientId, left(need.ingredientId) - need.quantity * line.quantity);
      }
    } else if (max === 0) {
      issues.push({ line, kind: 'OUT_OF_STOCK', maxOrderableQuantity: 0 });
    } else {
      issues.push({ line, kind: 'PARTIALLY_AVAILABLE', maxOrderableQuantity: max });
    }
  }
  return issues;
}

/**
 * What checkout would fail on: every ingredient whose total requirement across
 * ALL cart lines exceeds its stock. Lines with unavailable recipes are ignored
 * here; they are reported separately as RECIPE_UNAVAILABLE.
 */
export function stockShortages(
  lines: readonly OrderLineRow[],
  recipes: RecipeMap,
  ingredients: IngredientMap,
): StockShortage[] {
  const required = new Map<string, number>();
  for (const line of lines) {
    const recipe = recipes.get(line.recipeId);
    if (!isOrderable(recipe)) continue;
    for (const need of recipe.ingredients) {
      required.set(
        need.ingredientId,
        (required.get(need.ingredientId) ?? 0) + need.quantity * line.quantity,
      );
    }
  }

  const shortages: StockShortage[] = [];
  for (const [ingredientId, needed] of required) {
    const stock = ingredients.get(ingredientId);
    const available = stock && stock.deletedAt === null ? stock.stockQty : 0;
    if (needed > available) {
      shortages.push({
        ingredientId,
        name: stock?.name ?? ingredientId,
        required: needed,
        available,
        unit: stock?.unit ?? '',
      });
    }
  }
  return shortages;
}
