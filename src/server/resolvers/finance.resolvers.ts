import type { QueryResolvers } from '../generated/resolvers';
import { requireAdmin } from '../lib/auth';

export const financeQuery = {
  /** Revenue is the sum of PLACED orders. Carts never count. */
  async finance(_parent, _args, ctx) {
    await requireAdmin(ctx);
    const db = await ctx.db();
    const placed = (await db.getAll('orders')).filter((o) => o.status === 'PLACED');
    const revenueIdr = placed.reduce((sum, o) => sum + (o.totalIdr ?? 0), 0);
    const orderCount = placed.length;
    return {
      revenueIdr,
      orderCount,
      averageOrderIdr: orderCount === 0 ? 0 : Math.round(revenueIdr / orderCount),
    };
  },
} satisfies Partial<QueryResolvers>;
