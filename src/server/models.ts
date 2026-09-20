import type { OrderLineRow } from './db/schema.types';

/** Server-side shapes for GraphQL types that are computed rather than stored. */

export type CartIssueKind = 'OUT_OF_STOCK' | 'PARTIALLY_AVAILABLE' | 'UNPUBLISHED';

export interface CartIssueModel {
  line: OrderLineRow;
  kind: CartIssueKind;
  maxOrderableQuantity: number;
}

export interface FinanceModel {
  revenueIdr: number;
  orderCount: number;
  averageOrderIdr: number;
}
