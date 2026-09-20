import type { ServerContext } from '../context';
import type { UserRow } from '../db/schema.types';
import { errors } from './errors';

/**
 * Who is calling. Authorization is enforced HERE, in the resolvers, and not only
 * by route guards in the client: v1's admin protection was client-side alone, so
 * anyone could set `localStorage.role` and open the admin pages.
 */

/** The signed-in user, or null for a guest, an unknown token or an expired session. */
export async function currentUser(ctx: ServerContext): Promise<UserRow | null> {
  if (!ctx.token) return null;
  const db = await ctx.db();
  const session = await db.get('sessions', ctx.token);
  if (!session || Date.parse(session.expiresAt) <= ctx.now().getTime()) return null;
  return (await db.get('users', session.userId)) ?? null;
}

export async function requireUser(ctx: ServerContext): Promise<UserRow> {
  const user = await currentUser(ctx);
  if (!user) throw errors.unauthenticated();
  return user;
}

/** UNAUTHENTICATED for a guest, FORBIDDEN for a signed-in non-admin. */
export async function requireAdmin(ctx: ServerContext): Promise<UserRow> {
  const user = await requireUser(ctx);
  if (user.role !== 'ADMIN') throw errors.forbidden();
  return user;
}
