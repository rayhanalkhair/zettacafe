import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import type { UserRow, IngredientRow, RecipeRow, RecipeIngredientRow, OrderRow, OrderLineRow } from '../db/schema.types';
import type { CartIssueModel, FinanceModel } from '../models';
import type { ServerContext } from '../context';
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /**
   * ZettaCafe API contract.
   *
   * This schema is executed in the browser (see src/server) but is written as if it
   * were a real service, so the client can be pointed at an HTTP GraphQL endpoint
   * without changing a single document.
   *
   * Conventions
   * -----------
   * * Money is an integer number of rupiah (IDR has no minor unit in practice).
   *   Fields end in `Idr`. Never floats.
   * * Failures are GraphQL errors carrying a stable `extensions.code`; the client
   *   maps codes to translated messages. Codes and their extra data:
   *
   *     UNAUTHENTICATED      no valid session
   *     FORBIDDEN            signed in, but not allowed (e.g. a customer calling an admin operation)
   *     NOT_FOUND            { entity, id }
   *     VALIDATION           { field, reason }
   *     INVALID_CREDENTIALS  wrong email or password
   *     EMAIL_TAKEN          { email }
   *     INVALID_RESET_CODE   wrong or expired password reset code
   *     EMPTY_CART           checkout with nothing in the cart
   *     RECIPE_UNAVAILABLE   { recipeId } unpublished or archived recipe in the cart
   *     INSUFFICIENT_STOCK   { shortages: [{ ingredientId, name, required, available, unit }] }
   *     INSUFFICIENT_CREDIT  { requiredIdr, availableIdr, shortfallIdr }
   *     PRICE_CHANGED        { expectedIdr, actualIdr } the cart total moved since the client last saw it
   *     RECIPE_IN_USE        { recipeIds } deleting an ingredient a live recipe depends on
   *
   *   Business problems a client can act on BEFORE submitting (stock, availability)
   *   are exposed as typed data instead: see `Order.issues`.
   * * Lists are paginated with offset/limit. Cursors were considered and rejected:
   *   the UI is a numbered page control, the data set is small, and there is a
   *   single writer.
   * * On update inputs, an omitted field is left unchanged. For nullable content
   *   fields an explicit null clears the value.
   * * Nothing here ever returns a password or password hash. There is no such field.
   * * Recipe names are proper nouns ("Nasi Goreng Kampung") and are not localised;
   *   descriptions are.
   */
  DateTime: { input: string; output: string; }
};

export type AddCartLineInput = {
  note?: InputMaybe<Scalars['String']['input']>;
  /** 1 to 99. Adding a recipe already in the cart increases its quantity. */
  quantity?: InputMaybe<Scalars['Int']['input']>;
  recipeId: Scalars['ID']['input'];
};

export type AuthPayload = {
  __typename?: 'AuthPayload';
  /** Opaque session token. Send as `Authorization: Bearer <token>`. */
  token: Scalars['String']['output'];
  user: User;
};

/** A problem with a cart line that would make checkout fail. */
export type CartIssue = {
  __typename?: 'CartIssue';
  kind: CartIssueKind;
  line: OrderLine;
  /** The most of this line that could be ordered right now, given the rest of the cart. */
  maxOrderableQuantity: Scalars['Int']['output'];
};

export type CartIssueKind =
  /** Nothing can be made: an ingredient is exhausted. */
  | 'OUT_OF_STOCK'
  /** Some can be made, but fewer than the quantity in the cart. */
  | 'PARTIALLY_AVAILABLE'
  /** The recipe was unpublished or archived after it was added. */
  | 'UNPUBLISHED';

export type CreateIngredientInput = {
  name: Scalars['String']['input'];
  /** Zero or more. */
  stockQty: Scalars['Int']['input'];
  unit: Scalars['String']['input'];
};

export type CreateRecipeInput = {
  category: RecipeCategory;
  description?: InputMaybe<LocalizedTextInput>;
  /** 0 to 100. */
  discountPercent?: InputMaybe<Scalars['Int']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  /** At least one. */
  ingredients: Array<RecipeIngredientInput>;
  name: Scalars['String']['input'];
  priceIdr: Scalars['Int']['input'];
  status?: InputMaybe<RecipeStatus>;
};

/** Revenue summary. Admin only. */
export type Finance = {
  __typename?: 'Finance';
  averageOrderIdr: Scalars['Int']['output'];
  orderCount: Scalars['Int']['output'];
  revenueIdr: Scalars['Int']['output'];
};

/** Stock levels are internal. Only admins can read them. */
export type Ingredient = {
  __typename?: 'Ingredient';
  id: Scalars['ID']['output'];
  /** True while there is any stock. */
  isAvailable: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  stockQty: Scalars['Int']['output'];
  /** Unit of `stockQty`, e.g. "g", "ml", "pcs". */
  unit: Scalars['String']['output'];
};

export type IngredientConnection = {
  __typename?: 'IngredientConnection';
  items: Array<Ingredient>;
  totalCount: Scalars['Int']['output'];
};

export type IngredientFilter = {
  isAvailable?: InputMaybe<Scalars['Boolean']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type IngredientSort = {
  direction?: InputMaybe<SortDirection>;
  field?: InputMaybe<IngredientSortField>;
};

export type IngredientSortField =
  | 'NAME'
  | 'STOCK';

/** Language for user-facing content. Falls back to EN when a translation is missing. */
export type Locale =
  | 'EN'
  | 'ID';

export type LocalizedTextInput = {
  en: Scalars['String']['input'];
  id?: InputMaybe<Scalars['String']['input']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  addCartLine: Order;
  /**
   * Adds or removes stock without resending the rest of the ingredient. The result
   * cannot go below zero.
   */
  adjustIngredientStock: Ingredient;
  /** Empties the cart and returns it. */
  cancelCart: Order;
  /**
   * Places the cart atomically: checks stock and credit first, then decrements
   * stock and debits credit in one transaction. A failure changes nothing.
   * Pass `expectedTotalIdr` (the total the user saw) to fail with PRICE_CHANGED
   * instead of charging a different amount.
   */
  checkout: Order;
  createIngredient: Ingredient;
  /** Admin only. */
  createRecipe: Recipe;
  /** Archives the ingredient. Fails with RECIPE_IN_USE while a live recipe depends on it. */
  deleteIngredient: Ingredient;
  /** Archives the recipe and returns it. Past orders keep working. */
  deleteRecipe: Recipe;
  /** Returns the cart, which is empty when that was the last line. */
  removeCartLine: Order;
  /** Always succeeds, whether or not the email exists. */
  requestPasswordReset: PasswordResetChallenge;
  resetPassword: Scalars['Boolean']['output'];
  setRecipeFeatured: Recipe;
  setRecipeStatus: Recipe;
  signIn: AuthPayload;
  signOut: Scalars['Boolean']['output'];
  /** Always creates a CUSTOMER and signs them in. */
  signUp: AuthPayload;
  /** Adds spendable credit. 1,000 to 10,000,000 rupiah. */
  topUpCredit: User;
  updateCartLine: Order;
  updateIngredient: Ingredient;
  updateRecipe: Recipe;
};


export type MutationAddCartLineArgs = {
  input: AddCartLineInput;
};


export type MutationAdjustIngredientStockArgs = {
  deltaQty: Scalars['Int']['input'];
  id: Scalars['ID']['input'];
};


export type MutationCheckoutArgs = {
  expectedTotalIdr?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationCreateIngredientArgs = {
  input: CreateIngredientInput;
};


export type MutationCreateRecipeArgs = {
  input: CreateRecipeInput;
};


export type MutationDeleteIngredientArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteRecipeArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveCartLineArgs = {
  lineId: Scalars['ID']['input'];
};


export type MutationRequestPasswordResetArgs = {
  email: Scalars['String']['input'];
};


export type MutationResetPasswordArgs = {
  input: ResetPasswordInput;
};


export type MutationSetRecipeFeaturedArgs = {
  id: Scalars['ID']['input'];
  isFeatured: Scalars['Boolean']['input'];
};


export type MutationSetRecipeStatusArgs = {
  id: Scalars['ID']['input'];
  status: RecipeStatus;
};


export type MutationSignInArgs = {
  input: SignInInput;
};


export type MutationSignUpArgs = {
  input: SignUpInput;
};


export type MutationTopUpCreditArgs = {
  amountIdr: Scalars['Int']['input'];
};


export type MutationUpdateCartLineArgs = {
  input: UpdateCartLineInput;
};


export type MutationUpdateIngredientArgs = {
  id: Scalars['ID']['input'];
  input: UpdateIngredientInput;
};


export type MutationUpdateRecipeArgs = {
  id: Scalars['ID']['input'];
  input: UpdateRecipeInput;
};

/**
 * A cart or a placed order. A signed-in user always has a cart: when nothing has
 * been added it is an empty Order with the same id it will keep once persisted
 * (`cart_<userId>`), so clients cache it as one entity.
 */
export type Order = {
  __typename?: 'Order';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** Empty when the cart can be checked out as-is. Always empty on a placed order. */
  issues: Array<CartIssue>;
  lines: Array<OrderLine>;
  placedAt: Maybe<Scalars['DateTime']['output']>;
  status: OrderStatus;
  totalIdr: Scalars['Int']['output'];
  user: User;
};

export type OrderConnection = {
  __typename?: 'OrderConnection';
  items: Array<Order>;
  totalCount: Scalars['Int']['output'];
};

export type OrderFilter = {
  /** Admin only: restrict to the admin's own orders. Ignored for customers, who only ever see their own. */
  mine?: InputMaybe<Scalars['Boolean']['input']>;
};

/**
 * A line in a cart or an order. Everything history needs is frozen when the order
 * is placed, so `recipe` may be null once a recipe is archived and the line still
 * renders in full.
 */
export type OrderLine = {
  __typename?: 'OrderLine';
  discountPercent: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  lineTotalIdr: Scalars['Int']['output'];
  /** Before discount. Live while in the cart, frozen once placed. */
  listPriceIdr: Scalars['Int']['output'];
  note: Maybe<Scalars['String']['output']>;
  quantity: Scalars['Int']['output'];
  recipe: Maybe<Recipe>;
  recipeImageUrl: Maybe<Scalars['String']['output']>;
  recipeName: Scalars['String']['output'];
  /** What is charged per serving, after discount. */
  unitPriceIdr: Scalars['Int']['output'];
};

export type OrderStatus =
  /** The cart. Exactly one per signed-in user, empty or not. */
  | 'DRAFT'
  /** Checked out and paid from credit. */
  | 'PLACED';

export type PageInput = {
  /** 1 to 50. */
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

/**
 * Always returned, whether or not the email is registered, so the response cannot
 * be used to discover which emails have accounts.
 */
export type PasswordResetChallenge = {
  __typename?: 'PasswordResetChallenge';
  /**
   * The verification code. There is no email service behind the in-browser server,
   * so it is returned here in demo mode and is null once a real mailer exists.
   */
  demoCode: Maybe<Scalars['String']['output']>;
  expiresAt: Scalars['DateTime']['output'];
};

export type Query = {
  __typename?: 'Query';
  /** The signed-in user's cart, empty or not. Null only for a guest. */
  cart: Maybe<Order>;
  /** Published, in-stock recipes with a discount, biggest discount first. */
  discountedRecipes: Array<Recipe>;
  /** Published, in-stock recipes curated for the home page. */
  featuredRecipes: Array<Recipe>;
  /** Admin only. */
  finance: Finance;
  /** Admin only. */
  ingredients: IngredientConnection;
  /** The signed-in user, or null for a guest. */
  me: Maybe<User>;
  /** One of the caller's own orders, or any order for an admin. */
  order: Maybe<Order>;
  /** Own orders for a customer, every order for an admin. Newest first. */
  orderHistory: OrderConnection;
  recipe: Maybe<Recipe>;
  /**
   * Recipes. Guests and customers only ever see PUBLISHED recipes; admins see
   * everything.
   */
  recipes: RecipeConnection;
};


export type QueryDiscountedRecipesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryFeaturedRecipesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryIngredientsArgs = {
  filter?: InputMaybe<IngredientFilter>;
  page?: InputMaybe<PageInput>;
  sort?: InputMaybe<IngredientSort>;
};


export type QueryOrderArgs = {
  id: Scalars['ID']['input'];
};


export type QueryOrderHistoryArgs = {
  filter?: InputMaybe<OrderFilter>;
  page?: InputMaybe<PageInput>;
};


export type QueryRecipeArgs = {
  id: Scalars['ID']['input'];
};


export type QueryRecipesArgs = {
  filter?: InputMaybe<RecipeFilter>;
  page?: InputMaybe<PageInput>;
  sort?: InputMaybe<RecipeSort>;
};

export type Recipe = {
  __typename?: 'Recipe';
  /**
   * Portions that can be made right now: the minimum over ingredients of
   * floor(stock / quantity). The single definition of the stock rule; the client
   * never recomputes it.
   */
  availableServings: Scalars['Int']['output'];
  category: RecipeCategory;
  description: Maybe<Scalars['String']['output']>;
  /** Whole percent, 0 to 100. */
  discountPercent: Scalars['Int']['output'];
  /** `priceIdr` after the discount, rounded to the nearest rupiah. */
  discountedPriceIdr: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  imageUrl: Maybe<Scalars['String']['output']>;
  /** Public. What goes into the dish, without quantities or stock. */
  ingredientNames: Array<Scalars['String']['output']>;
  /**
   * Admin only: quantities and live stock. Null for everyone else, so a guest can
   * never read inventory, and asking for it does not fail the whole recipe.
   */
  ingredients: Maybe<Array<RecipeIngredient>>;
  isAvailable: Scalars['Boolean']['output'];
  /** Curated for the home page. */
  isFeatured: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  priceIdr: Scalars['Int']['output'];
  source: RecipeSource;
  status: RecipeStatus;
};


export type RecipeDescriptionArgs = {
  locale?: InputMaybe<Locale>;
};

export type RecipeCategory =
  | 'DRINK'
  | 'FOOD';

export type RecipeConnection = {
  __typename?: 'RecipeConnection';
  items: Array<Recipe>;
  /** Total matching the filter, ignoring the page. */
  totalCount: Scalars['Int']['output'];
};

export type RecipeFilter = {
  category?: InputMaybe<RecipeCategory>;
  /** Case-insensitive match on the name. */
  search?: InputMaybe<Scalars['String']['input']>;
  /** Customers and guests may only pass PUBLISHED; DRAFT is FORBIDDEN for them. */
  status?: InputMaybe<RecipeStatus>;
};

export type RecipeIngredient = {
  __typename?: 'RecipeIngredient';
  ingredient: Ingredient;
  /** How much of the ingredient one serving uses, in the ingredient's unit. */
  quantity: Scalars['Int']['output'];
};

export type RecipeIngredientInput = {
  ingredientId: Scalars['ID']['input'];
  /** Greater than zero. */
  quantity: Scalars['Int']['input'];
};

export type RecipeSort = {
  direction?: InputMaybe<SortDirection>;
  field?: InputMaybe<RecipeSortField>;
};

export type RecipeSortField =
  | 'DISCOUNT'
  | 'NAME'
  | 'PRICE';

/** Where a recipe came from. */
export type RecipeSource =
  /** Fetched from the public coffee API. */
  | 'COFFEE_API'
  /** Authored seed data. */
  | 'SEED'
  /** Created by an admin in the app. */
  | 'USER';

export type RecipeStatus =
  /** Hidden from the public menu. */
  | 'DRAFT'
  | 'PUBLISHED';

export type ResetPasswordInput = {
  /** The four-digit code from `requestPasswordReset`. */
  code: Scalars['String']['input'];
  email: Scalars['String']['input'];
  /** At least 8 characters. */
  newPassword: Scalars['String']['input'];
};

export type Role =
  | 'ADMIN'
  | 'CUSTOMER';

export type SignInInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type SignUpInput = {
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  /** At least 8 characters. */
  password: Scalars['String']['input'];
};

export type SortDirection =
  | 'ASC'
  | 'DESC';

export type UpdateCartLineInput = {
  lineId: Scalars['ID']['input'];
  /** Replaces the existing note. Null clears it. */
  note?: InputMaybe<Scalars['String']['input']>;
  /** 1 to 99. */
  quantity: Scalars['Int']['input'];
};

export type UpdateIngredientInput = {
  name?: InputMaybe<Scalars['String']['input']>;
  stockQty?: InputMaybe<Scalars['Int']['input']>;
  unit?: InputMaybe<Scalars['String']['input']>;
};

/**
 * Partial update. Status and featured flag have their own mutations so an edit form
 * can never publish or unpublish by accident.
 */
export type UpdateRecipeInput = {
  category?: InputMaybe<RecipeCategory>;
  description?: InputMaybe<LocalizedTextInput>;
  discountPercent?: InputMaybe<Scalars['Int']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  /** When present, replaces the whole ingredient list. */
  ingredients?: InputMaybe<Array<RecipeIngredientInput>>;
  name?: InputMaybe<Scalars['String']['input']>;
  priceIdr?: InputMaybe<Scalars['Int']['input']>;
};

export type User = {
  __typename?: 'User';
  /** Spendable balance in rupiah. */
  creditIdr: Scalars['Int']['output'];
  email: Scalars['String']['output'];
  firstName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  lastName: Scalars['String']['output'];
  role: Role;
};

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;





/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  AddCartLineInput: AddCartLineInput;
  AuthPayload: ResolverTypeWrapper<Omit<AuthPayload, 'user'> & { user: ResolversTypes['User'] }>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CartIssue: ResolverTypeWrapper<CartIssueModel>;
  CartIssueKind: CartIssueKind;
  CreateIngredientInput: CreateIngredientInput;
  CreateRecipeInput: CreateRecipeInput;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Finance: ResolverTypeWrapper<FinanceModel>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Ingredient: ResolverTypeWrapper<IngredientRow>;
  IngredientConnection: ResolverTypeWrapper<Omit<IngredientConnection, 'items'> & { items: Array<ResolversTypes['Ingredient']> }>;
  IngredientFilter: IngredientFilter;
  IngredientSort: IngredientSort;
  IngredientSortField: IngredientSortField;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Locale: Locale;
  LocalizedTextInput: LocalizedTextInput;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Order: ResolverTypeWrapper<OrderRow>;
  OrderConnection: ResolverTypeWrapper<Omit<OrderConnection, 'items'> & { items: Array<ResolversTypes['Order']> }>;
  OrderFilter: OrderFilter;
  OrderLine: ResolverTypeWrapper<OrderLineRow>;
  OrderStatus: OrderStatus;
  PageInput: PageInput;
  PasswordResetChallenge: ResolverTypeWrapper<PasswordResetChallenge>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Recipe: ResolverTypeWrapper<RecipeRow>;
  RecipeCategory: RecipeCategory;
  RecipeConnection: ResolverTypeWrapper<Omit<RecipeConnection, 'items'> & { items: Array<ResolversTypes['Recipe']> }>;
  RecipeFilter: RecipeFilter;
  RecipeIngredient: ResolverTypeWrapper<RecipeIngredientRow>;
  RecipeIngredientInput: RecipeIngredientInput;
  RecipeSort: RecipeSort;
  RecipeSortField: RecipeSortField;
  RecipeSource: RecipeSource;
  RecipeStatus: RecipeStatus;
  ResetPasswordInput: ResetPasswordInput;
  Role: Role;
  SignInInput: SignInInput;
  SignUpInput: SignUpInput;
  SortDirection: SortDirection;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  UpdateCartLineInput: UpdateCartLineInput;
  UpdateIngredientInput: UpdateIngredientInput;
  UpdateRecipeInput: UpdateRecipeInput;
  User: ResolverTypeWrapper<UserRow>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  AddCartLineInput: AddCartLineInput;
  AuthPayload: Omit<AuthPayload, 'user'> & { user: ResolversParentTypes['User'] };
  Boolean: Scalars['Boolean']['output'];
  CartIssue: CartIssueModel;
  CreateIngredientInput: CreateIngredientInput;
  CreateRecipeInput: CreateRecipeInput;
  DateTime: Scalars['DateTime']['output'];
  Finance: FinanceModel;
  ID: Scalars['ID']['output'];
  Ingredient: IngredientRow;
  IngredientConnection: Omit<IngredientConnection, 'items'> & { items: Array<ResolversParentTypes['Ingredient']> };
  IngredientFilter: IngredientFilter;
  IngredientSort: IngredientSort;
  Int: Scalars['Int']['output'];
  LocalizedTextInput: LocalizedTextInput;
  Mutation: Record<PropertyKey, never>;
  Order: OrderRow;
  OrderConnection: Omit<OrderConnection, 'items'> & { items: Array<ResolversParentTypes['Order']> };
  OrderFilter: OrderFilter;
  OrderLine: OrderLineRow;
  PageInput: PageInput;
  PasswordResetChallenge: PasswordResetChallenge;
  Query: Record<PropertyKey, never>;
  Recipe: RecipeRow;
  RecipeConnection: Omit<RecipeConnection, 'items'> & { items: Array<ResolversParentTypes['Recipe']> };
  RecipeFilter: RecipeFilter;
  RecipeIngredient: RecipeIngredientRow;
  RecipeIngredientInput: RecipeIngredientInput;
  RecipeSort: RecipeSort;
  ResetPasswordInput: ResetPasswordInput;
  SignInInput: SignInInput;
  SignUpInput: SignUpInput;
  String: Scalars['String']['output'];
  UpdateCartLineInput: UpdateCartLineInput;
  UpdateIngredientInput: UpdateIngredientInput;
  UpdateRecipeInput: UpdateRecipeInput;
  User: UserRow;
}>;

export type AuthPayloadResolvers<ContextType = ServerContext, ParentType extends ResolversParentTypes['AuthPayload'] = ResolversParentTypes['AuthPayload']> = ResolversObject<{
  token?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
}>;

export type CartIssueResolvers<ContextType = ServerContext, ParentType extends ResolversParentTypes['CartIssue'] = ResolversParentTypes['CartIssue']> = ResolversObject<{
  kind?: Resolver<ResolversTypes['CartIssueKind'], ParentType, ContextType>;
  line?: Resolver<ResolversTypes['OrderLine'], ParentType, ContextType>;
  maxOrderableQuantity?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type FinanceResolvers<ContextType = ServerContext, ParentType extends ResolversParentTypes['Finance'] = ResolversParentTypes['Finance']> = ResolversObject<{
  averageOrderIdr?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  orderCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  revenueIdr?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type IngredientResolvers<ContextType = ServerContext, ParentType extends ResolversParentTypes['Ingredient'] = ResolversParentTypes['Ingredient']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isAvailable?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  stockQty?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  unit?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type IngredientConnectionResolvers<ContextType = ServerContext, ParentType extends ResolversParentTypes['IngredientConnection'] = ResolversParentTypes['IngredientConnection']> = ResolversObject<{
  items?: Resolver<Array<ResolversTypes['Ingredient']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = ServerContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  addCartLine?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<MutationAddCartLineArgs, 'input'>>;
  adjustIngredientStock?: Resolver<ResolversTypes['Ingredient'], ParentType, ContextType, RequireFields<MutationAdjustIngredientStockArgs, 'deltaQty' | 'id'>>;
  cancelCart?: Resolver<ResolversTypes['Order'], ParentType, ContextType>;
  checkout?: Resolver<ResolversTypes['Order'], ParentType, ContextType, Partial<MutationCheckoutArgs>>;
  createIngredient?: Resolver<ResolversTypes['Ingredient'], ParentType, ContextType, RequireFields<MutationCreateIngredientArgs, 'input'>>;
  createRecipe?: Resolver<ResolversTypes['Recipe'], ParentType, ContextType, RequireFields<MutationCreateRecipeArgs, 'input'>>;
  deleteIngredient?: Resolver<ResolversTypes['Ingredient'], ParentType, ContextType, RequireFields<MutationDeleteIngredientArgs, 'id'>>;
  deleteRecipe?: Resolver<ResolversTypes['Recipe'], ParentType, ContextType, RequireFields<MutationDeleteRecipeArgs, 'id'>>;
  removeCartLine?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<MutationRemoveCartLineArgs, 'lineId'>>;
  requestPasswordReset?: Resolver<ResolversTypes['PasswordResetChallenge'], ParentType, ContextType, RequireFields<MutationRequestPasswordResetArgs, 'email'>>;
  resetPassword?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationResetPasswordArgs, 'input'>>;
  setRecipeFeatured?: Resolver<ResolversTypes['Recipe'], ParentType, ContextType, RequireFields<MutationSetRecipeFeaturedArgs, 'id' | 'isFeatured'>>;
  setRecipeStatus?: Resolver<ResolversTypes['Recipe'], ParentType, ContextType, RequireFields<MutationSetRecipeStatusArgs, 'id' | 'status'>>;
  signIn?: Resolver<ResolversTypes['AuthPayload'], ParentType, ContextType, RequireFields<MutationSignInArgs, 'input'>>;
  signOut?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  signUp?: Resolver<ResolversTypes['AuthPayload'], ParentType, ContextType, RequireFields<MutationSignUpArgs, 'input'>>;
  topUpCredit?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationTopUpCreditArgs, 'amountIdr'>>;
  updateCartLine?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<MutationUpdateCartLineArgs, 'input'>>;
  updateIngredient?: Resolver<ResolversTypes['Ingredient'], ParentType, ContextType, RequireFields<MutationUpdateIngredientArgs, 'id' | 'input'>>;
  updateRecipe?: Resolver<ResolversTypes['Recipe'], ParentType, ContextType, RequireFields<MutationUpdateRecipeArgs, 'id' | 'input'>>;
}>;

export type OrderResolvers<ContextType = ServerContext, ParentType extends ResolversParentTypes['Order'] = ResolversParentTypes['Order']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  issues?: Resolver<Array<ResolversTypes['CartIssue']>, ParentType, ContextType>;
  lines?: Resolver<Array<ResolversTypes['OrderLine']>, ParentType, ContextType>;
  placedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['OrderStatus'], ParentType, ContextType>;
  totalIdr?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
}>;

export type OrderConnectionResolvers<ContextType = ServerContext, ParentType extends ResolversParentTypes['OrderConnection'] = ResolversParentTypes['OrderConnection']> = ResolversObject<{
  items?: Resolver<Array<ResolversTypes['Order']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type OrderLineResolvers<ContextType = ServerContext, ParentType extends ResolversParentTypes['OrderLine'] = ResolversParentTypes['OrderLine']> = ResolversObject<{
  discountPercent?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lineTotalIdr?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  listPriceIdr?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  note?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  quantity?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  recipe?: Resolver<Maybe<ResolversTypes['Recipe']>, ParentType, ContextType>;
  recipeImageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  recipeName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  unitPriceIdr?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type PasswordResetChallengeResolvers<ContextType = ServerContext, ParentType extends ResolversParentTypes['PasswordResetChallenge'] = ResolversParentTypes['PasswordResetChallenge']> = ResolversObject<{
  demoCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  expiresAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ServerContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  cart?: Resolver<Maybe<ResolversTypes['Order']>, ParentType, ContextType>;
  discountedRecipes?: Resolver<Array<ResolversTypes['Recipe']>, ParentType, ContextType, RequireFields<QueryDiscountedRecipesArgs, 'limit'>>;
  featuredRecipes?: Resolver<Array<ResolversTypes['Recipe']>, ParentType, ContextType, RequireFields<QueryFeaturedRecipesArgs, 'limit'>>;
  finance?: Resolver<ResolversTypes['Finance'], ParentType, ContextType>;
  ingredients?: Resolver<ResolversTypes['IngredientConnection'], ParentType, ContextType, Partial<QueryIngredientsArgs>>;
  me?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  order?: Resolver<Maybe<ResolversTypes['Order']>, ParentType, ContextType, RequireFields<QueryOrderArgs, 'id'>>;
  orderHistory?: Resolver<ResolversTypes['OrderConnection'], ParentType, ContextType, Partial<QueryOrderHistoryArgs>>;
  recipe?: Resolver<Maybe<ResolversTypes['Recipe']>, ParentType, ContextType, RequireFields<QueryRecipeArgs, 'id'>>;
  recipes?: Resolver<ResolversTypes['RecipeConnection'], ParentType, ContextType, Partial<QueryRecipesArgs>>;
}>;

export type RecipeResolvers<ContextType = ServerContext, ParentType extends ResolversParentTypes['Recipe'] = ResolversParentTypes['Recipe']> = ResolversObject<{
  availableServings?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  category?: Resolver<ResolversTypes['RecipeCategory'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType, RequireFields<RecipeDescriptionArgs, 'locale'>>;
  discountPercent?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  discountedPriceIdr?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ingredientNames?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  ingredients?: Resolver<Maybe<Array<ResolversTypes['RecipeIngredient']>>, ParentType, ContextType>;
  isAvailable?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isFeatured?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  priceIdr?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  source?: Resolver<ResolversTypes['RecipeSource'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['RecipeStatus'], ParentType, ContextType>;
}>;

export type RecipeConnectionResolvers<ContextType = ServerContext, ParentType extends ResolversParentTypes['RecipeConnection'] = ResolversParentTypes['RecipeConnection']> = ResolversObject<{
  items?: Resolver<Array<ResolversTypes['Recipe']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type RecipeIngredientResolvers<ContextType = ServerContext, ParentType extends ResolversParentTypes['RecipeIngredient'] = ResolversParentTypes['RecipeIngredient']> = ResolversObject<{
  ingredient?: Resolver<ResolversTypes['Ingredient'], ParentType, ContextType>;
  quantity?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type UserResolvers<ContextType = ServerContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = ResolversObject<{
  creditIdr?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  firstName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lastName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['Role'], ParentType, ContextType>;
}>;

export type Resolvers<ContextType = ServerContext> = ResolversObject<{
  AuthPayload?: AuthPayloadResolvers<ContextType>;
  CartIssue?: CartIssueResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  Finance?: FinanceResolvers<ContextType>;
  Ingredient?: IngredientResolvers<ContextType>;
  IngredientConnection?: IngredientConnectionResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Order?: OrderResolvers<ContextType>;
  OrderConnection?: OrderConnectionResolvers<ContextType>;
  OrderLine?: OrderLineResolvers<ContextType>;
  PasswordResetChallenge?: PasswordResetChallengeResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Recipe?: RecipeResolvers<ContextType>;
  RecipeConnection?: RecipeConnectionResolvers<ContextType>;
  RecipeIngredient?: RecipeIngredientResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
}>;

