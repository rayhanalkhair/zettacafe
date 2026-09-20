/**
 * What the menu components need to draw a dish. Deliberately its own shape and not
 * a generated GraphQL type: shared UI stays presentational, and the menu feature
 * maps its query result to this.
 */
export interface MenuItem {
  readonly id: string;
  readonly name: string;
  /** Already in the active language. */
  readonly description: string;
  readonly imageUrl: string | null;
  readonly priceIdr: number;
  /** Equal to `priceIdr` when there is no discount. */
  readonly discountedPriceIdr: number;
  readonly discountPercent: number;
  readonly availableServings: number;
  readonly isAvailable: boolean;
}

/** At or below this many servings a dish is flagged as running low. */
export const LOW_STOCK_THRESHOLD = 5;

/** The fields of a recipe a card or board row needs, as any query returns them. */
export interface MenuRecipeFields {
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
  readonly imageUrl?: string | null;
  readonly priceIdr: number;
  readonly discountedPriceIdr: number;
  readonly discountPercent: number;
  readonly availableServings: number;
  readonly isAvailable: boolean;
}

/** A server recipe to what the shared menu components draw. */
export function toMenuItem(recipe: MenuRecipeFields): MenuItem {
  return {
    id: recipe.id,
    name: recipe.name,
    description: recipe.description ?? '',
    imageUrl: recipe.imageUrl ?? null,
    priceIdr: recipe.priceIdr,
    discountedPriceIdr: recipe.discountedPriceIdr,
    discountPercent: recipe.discountPercent,
    availableServings: recipe.availableServings,
    isAvailable: recipe.isAvailable,
  };
}
