/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type CreateIngredientInput = {
  name: string;
  /** Zero or more. */
  stockQty: number;
  unit: string;
};

export type IngredientFilter = {
  isAvailable?: boolean | null | undefined;
  search?: string | null | undefined;
};

export type IngredientSort = {
  direction?: SortDirection | null | undefined;
  field?: IngredientSortField | null | undefined;
};

export type IngredientSortField =
  | 'NAME'
  | 'STOCK';

export type PageInput = {
  /** 1 to 50. */
  limit?: number | null | undefined;
  offset?: number | null | undefined;
};

export type SortDirection =
  | 'ASC'
  | 'DESC';

export type UpdateIngredientInput = {
  name?: string | null | undefined;
  stockQty?: number | null | undefined;
  unit?: string | null | undefined;
};

export type IngredientFieldsFragment = { id: string, name: string, stockQty: number, unit: string, isAvailable: boolean };

export type IngredientsQueryVariables = Exact<{
  filter?: IngredientFilter | null | undefined;
  page?: PageInput | null | undefined;
  sort?: IngredientSort | null | undefined;
}>;


export type IngredientsQuery = { ingredients: { totalCount: number, items: Array<{ id: string, name: string, stockQty: number, unit: string, isAvailable: boolean }> } };

export type CreateIngredientMutationVariables = Exact<{
  input: CreateIngredientInput;
}>;


export type CreateIngredientMutation = { createIngredient: { id: string, name: string, stockQty: number, unit: string, isAvailable: boolean } };

export type UpdateIngredientMutationVariables = Exact<{
  id: string | number;
  input: UpdateIngredientInput;
}>;


export type UpdateIngredientMutation = { updateIngredient: { id: string, name: string, stockQty: number, unit: string, isAvailable: boolean } };

export type DeleteIngredientMutationVariables = Exact<{
  id: string | number;
}>;


export type DeleteIngredientMutation = { deleteIngredient: { id: string } };

export const IngredientFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"IngredientFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Ingredient"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"stockQty"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"isAvailable"}}]}}]} as unknown as DocumentNode<IngredientFieldsFragment, unknown>;
export const IngredientsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Ingredients"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"IngredientFilter"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"page"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"PageInput"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sort"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"IngredientSort"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ingredients"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"page"},"value":{"kind":"Variable","name":{"kind":"Name","value":"page"}}},{"kind":"Argument","name":{"kind":"Name","value":"sort"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sort"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"IngredientFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"IngredientFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Ingredient"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"stockQty"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"isAvailable"}}]}}]} as unknown as DocumentNode<IngredientsQuery, IngredientsQueryVariables>;
export const CreateIngredientDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateIngredient"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateIngredientInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createIngredient"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"IngredientFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"IngredientFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Ingredient"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"stockQty"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"isAvailable"}}]}}]} as unknown as DocumentNode<CreateIngredientMutation, CreateIngredientMutationVariables>;
export const UpdateIngredientDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateIngredient"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateIngredientInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateIngredient"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"IngredientFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"IngredientFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Ingredient"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"stockQty"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"isAvailable"}}]}}]} as unknown as DocumentNode<UpdateIngredientMutation, UpdateIngredientMutationVariables>;
export const DeleteIngredientDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteIngredient"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteIngredient"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<DeleteIngredientMutation, DeleteIngredientMutationVariables>;