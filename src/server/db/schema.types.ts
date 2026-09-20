import type { DBSchema } from 'idb';

/**
 * Storage shapes. These are deliberately NOT the GraphQL types: resolvers return
 * rows and compute the derived fields (availableServings, discountedPriceIdr,
 * order totals, cart issues), so the API never mirrors the storage.
 *
 * Timestamps are ISO-8601 strings. Money is integer rupiah.
 */

export type Role = 'ADMIN' | 'CUSTOMER';
export type RecipeStatus = 'DRAFT' | 'PUBLISHED';
export type RecipeCategory = 'FOOD' | 'DRINK';
export type RecipeSource = 'SEED' | 'COFFEE_API' | 'USER';
export type OrderStatus = 'DRAFT' | 'PLACED';

export interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  /** Stored lowercase; unique. */
  email: string;
  role: Role;
  creditIdr: number;
  /** `pbkdf2$<iterations>$<salt b64>$<hash b64>`. Never leaves the server. */
  passwordHash: string;
  createdAt: string;
}

export interface SessionRow {
  /** The opaque bearer token. */
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface IngredientRow {
  id: string;
  name: string;
  stockQty: number;
  unit: string;
  /** Archived, not removed, so recipes and past orders that reference it keep working. */
  deletedAt: string | null;
}

export interface RecipeIngredientRow {
  ingredientId: string;
  /** Per serving, in the ingredient's unit. */
  quantity: number;
}

export interface LocalizedText {
  en: string;
  id?: string | undefined;
}

export interface RecipeRow {
  id: string;
  name: string;
  description: LocalizedText | null;
  imageUrl: string | null;
  category: RecipeCategory;
  source: RecipeSource;
  priceIdr: number;
  discountPercent: number;
  status: RecipeStatus;
  isFeatured: boolean;
  ingredients: RecipeIngredientRow[];
  createdAt: string;
  deletedAt: string | null;
}

/** What a line looked like the moment the order was placed. */
export interface FrozenLine {
  recipeName: string;
  recipeImageUrl: string | null;
  listPriceIdr: number;
  discountPercent: number;
  unitPriceIdr: number;
}

export interface OrderLineRow {
  id: string;
  recipeId: string;
  quantity: number;
  note: string | null;
  /** Null while in the cart (prices are live); set at checkout. */
  frozen: FrozenLine | null;
}

export interface OrderRow {
  /** `cart_<userId>` for a cart; a generated id once placed. */
  id: string;
  userId: string;
  status: OrderStatus;
  lines: OrderLineRow[];
  /** Null while in the cart (computed live); frozen once placed. */
  totalIdr: number | null;
  createdAt: string;
  placedAt: string | null;
}

export interface ResetCodeRow {
  /** The email, lowercase. One live code per email. */
  email: string;
  code: string;
  expiresAt: string;
}

export interface MetaRow {
  key: string;
  value: string | number;
}

/** The idb schema. Indexes are only where a query actually needs one. */
export interface ZettaDb extends DBSchema {
  users: { key: string; value: UserRow; indexes: { byEmail: string } };
  sessions: { key: string; value: SessionRow; indexes: { byUser: string } };
  ingredients: { key: string; value: IngredientRow };
  recipes: { key: string; value: RecipeRow };
  orders: {
    key: string;
    value: OrderRow;
    indexes: { byUser: string; byCreatedAt: string };
  };
  resetCodes: { key: string; value: ResetCodeRow };
  meta: { key: string; value: MetaRow };
}

export type StoreName = keyof ZettaDb;
