/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type PageInput = {
  /** 1 to 50. */
  limit?: number | null | undefined;
  offset?: number | null | undefined;
};

export type OrderHistoryQueryVariables = Exact<{
  page?: PageInput | null | undefined;
}>;


export type OrderHistoryQuery = { orderHistory: { totalCount: number, items: Array<{ id: string, placedAt: string | null, totalIdr: number, lines: Array<{ id: string, recipeName: string, quantity: number, note: string | null, unitPriceIdr: number, lineTotalIdr: number }> }> } };

export type FinanceQueryVariables = Exact<{ [key: string]: never; }>;


export type FinanceQuery = { finance: { revenueIdr: number, orderCount: number, averageOrderIdr: number } };


export const OrderHistoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OrderHistory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"page"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"PageInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orderHistory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"page"},"value":{"kind":"Variable","name":{"kind":"Name","value":"page"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"placedAt"}},{"kind":"Field","name":{"kind":"Name","value":"totalIdr"}},{"kind":"Field","name":{"kind":"Name","value":"lines"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"recipeName"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"unitPriceIdr"}},{"kind":"Field","name":{"kind":"Name","value":"lineTotalIdr"}}]}}]}}]}}]}}]} as unknown as DocumentNode<OrderHistoryQuery, OrderHistoryQueryVariables>;
export const FinanceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Finance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"finance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revenueIdr"}},{"kind":"Field","name":{"kind":"Name","value":"orderCount"}},{"kind":"Field","name":{"kind":"Name","value":"averageOrderIdr"}}]}}]}}]} as unknown as DocumentNode<FinanceQuery, FinanceQueryVariables>;