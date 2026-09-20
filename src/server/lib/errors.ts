import { GraphQLError } from 'graphql';

/** Stable codes the client maps to translated messages. Mirrors schema.graphql. */
export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_TAKEN'
  | 'INVALID_RESET_CODE'
  | 'EMPTY_CART'
  | 'RECIPE_UNAVAILABLE'
  | 'INSUFFICIENT_STOCK'
  | 'INSUFFICIENT_CREDIT'
  | 'PRICE_CHANGED'
  | 'RECIPE_IN_USE';

export interface StockShortage {
  ingredientId: string;
  name: string;
  required: number;
  available: number;
  unit: string;
}

function fail(code: ErrorCode, message: string, extensions: Record<string, unknown> = {}) {
  return new GraphQLError(message, { extensions: { code, ...extensions } });
}

/** Constructors for every domain failure. Messages are for developers; clients use `code`. */
export const errors = {
  unauthenticated: () => fail('UNAUTHENTICATED', 'You must be signed in.'),
  forbidden: () => fail('FORBIDDEN', 'You are not allowed to do that.'),
  notFound: (entity: string, id: string) =>
    fail('NOT_FOUND', `${entity} not found.`, { entity, id }),
  validation: (field: string, reason: string) =>
    fail('VALIDATION', `${field}: ${reason}`, { field, reason }),
  invalidCredentials: () => fail('INVALID_CREDENTIALS', 'Wrong email or password.'),
  emailTaken: (email: string) =>
    fail('EMAIL_TAKEN', 'That email is already registered.', { email }),
  invalidResetCode: () => fail('INVALID_RESET_CODE', 'That code is wrong or has expired.'),
  emptyCart: () => fail('EMPTY_CART', 'The cart is empty.'),
  recipeUnavailable: (recipeId: string) =>
    fail('RECIPE_UNAVAILABLE', 'A recipe in the cart is no longer available.', { recipeId }),
  insufficientStock: (shortages: StockShortage[]) =>
    fail('INSUFFICIENT_STOCK', 'Not enough stock for this order.', { shortages }),
  insufficientCredit: (requiredIdr: number, availableIdr: number) =>
    fail('INSUFFICIENT_CREDIT', 'Not enough credit for this order.', {
      requiredIdr,
      availableIdr,
      shortfallIdr: requiredIdr - availableIdr,
    }),
  priceChanged: (expectedIdr: number, actualIdr: number) =>
    fail('PRICE_CHANGED', 'The total changed since you last saw it.', { expectedIdr, actualIdr }),
  recipeInUse: (recipeIds: string[]) =>
    fail('RECIPE_IN_USE', 'A recipe still uses this ingredient.', { recipeIds }),
};
