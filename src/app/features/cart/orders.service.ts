import { inject, Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import {
  FinanceDocument,
  OrderHistoryDocument,
  type FinanceQuery,
  type OrderHistoryQuery,
} from './graphql.generated';

/** Three orders to a page, as in v1. */
export const ORDERS_PAGE_SIZE = 3;

export type OrderPage = OrderHistoryQuery['orderHistory'];
export type Order = OrderPage['items'][number];
export type Finance = FinanceQuery['finance'];

/**
 * Placed orders, newest first. Always from the network: a cached page would not show
 * an order placed a moment ago in another tab.
 */
@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly apollo = inject(Apollo);

  async load(offset: number): Promise<OrderPage> {
    const result = await this.apollo.client.query({
      query: OrderHistoryDocument,
      variables: { page: { offset, limit: ORDERS_PAGE_SIZE } },
      fetchPolicy: 'network-only',
      errorPolicy: 'none',
    });
    if (!result.data) throw new Error('The server returned no orders.');
    return result.data.orderHistory;
  }

  /** Admin only: the server refuses anyone else, so callers gate on the role first. */
  async finance(): Promise<Finance> {
    const result = await this.apollo.client.query({
      query: FinanceDocument,
      fetchPolicy: 'network-only',
      errorPolicy: 'none',
    });
    if (!result.data) throw new Error('The server returned no finance summary.');
    return result.data.finance;
  }
}
