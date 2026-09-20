/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
/** Language for user-facing content. Falls back to EN when a translation is missing. */
export type Locale =
  | 'EN'
  | 'ID';

export type PageInput = {
  /** 1 to 50. */
  limit?: number | null | undefined;
  offset?: number | null | undefined;
};

export type RecipeCategory =
  | 'DRINK'
  | 'FOOD';

export type RecipeFilter = {
  category?: RecipeCategory | null | undefined;
  /** Case-insensitive match on the name. */
  search?: string | null | undefined;
  /** Customers and guests may only pass PUBLISHED; DRAFT is FORBIDDEN for them. */
  status?: RecipeStatus | null | undefined;
};

export type RecipeSort = {
  direction?: SortDirection | null | undefined;
  field?: RecipeSortField | null | undefined;
};

export type RecipeSortField =
  | 'DISCOUNT'
  | 'NAME'
  | 'PRICE';

export type RecipeStatus =
  /** Hidden from the public menu. */
  | 'DRAFT'
  | 'PUBLISHED';

export type SortDirection =
  | 'ASC'
  | 'DESC';

export type MenuQueryVariables = Exact<{
  filter?: RecipeFilter | null | undefined;
  page?: PageInput | null | undefined;
  sort?: RecipeSort | null | undefined;
  locale: Locale;
}>;


export type MenuQuery = { recipes: { totalCount: number, items: Array<{ id: string, name: string, description: string | null, imageUrl: string | null, category: RecipeCategory, priceIdr: number, discountPercent: number, discountedPriceIdr: number, availableServings: number, isAvailable: boolean }> } };


export const MenuDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Menu"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"RecipeFilter"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"page"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"PageInput"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sort"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"RecipeSort"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"locale"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Locale"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"recipes"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"page"},"value":{"kind":"Variable","name":{"kind":"Name","value":"page"}}},{"kind":"Argument","name":{"kind":"Name","value":"sort"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sort"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"locale"},"value":{"kind":"Variable","name":{"kind":"Name","value":"locale"}}}]},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"priceIdr"}},{"kind":"Field","name":{"kind":"Name","value":"discountPercent"}},{"kind":"Field","name":{"kind":"Name","value":"discountedPriceIdr"}},{"kind":"Field","name":{"kind":"Name","value":"availableServings"}},{"kind":"Field","name":{"kind":"Name","value":"isAvailable"}}]}}]}}]}}]} as unknown as DocumentNode<MenuQuery, MenuQueryVariables>;