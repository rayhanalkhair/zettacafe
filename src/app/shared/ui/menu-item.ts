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
