import type { MutationResolvers, QueryResolvers } from '../generated/resolvers';
import { currentUser, requireUser } from '../lib/auth';
import { errors } from '../lib/errors';
import { hashPassword, verifyPassword } from '../lib/password';
import { requireEmail, requireInt, requirePassword, requireText } from '../lib/validation';
import type { ServerContext } from '../context';
import type { SessionRow, UserRow } from '../db/schema.types';

export const TOP_UP_MIN_IDR = 1_000;
export const TOP_UP_MAX_IDR = 10_000_000;

async function startSession(ctx: ServerContext, user: UserRow): Promise<string> {
  const db = await ctx.db();
  const created = ctx.now();
  const session: SessionRow = {
    token: ctx.newToken(),
    userId: user.id,
    createdAt: created.toISOString(),
    expiresAt: new Date(created.getTime() + ctx.config.sessionTtlMs).toISOString(),
  };
  await db.put('sessions', session);
  return session.token;
}

export const authQuery = {
  me: (_parent, _args, ctx) => currentUser(ctx),
} satisfies Partial<QueryResolvers>;

export const authMutation = {
  async signIn(_parent, { input }, ctx) {
    // Every failure is the same error: which part was wrong must not be revealed.
    const db = await ctx.db();
    const email = input.email.trim().toLowerCase();
    const user = await db.getFromIndex('users', 'byEmail', email);
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw errors.invalidCredentials();
    }
    return { token: await startSession(ctx, user), user };
  },

  async signUp(_parent, { input }, ctx) {
    const firstName = requireText('firstName', input.firstName, { max: 60 });
    const lastName = requireText('lastName', input.lastName, { max: 60 });
    const email = requireEmail('email', input.email);
    const password = requirePassword('password', input.password);

    const db = await ctx.db();
    if (await db.getFromIndex('users', 'byEmail', email)) throw errors.emailTaken(email);

    // Hash BEFORE opening the write transaction: it awaits something that is not
    // an IndexedDB request, which would let the transaction close underneath us.
    const passwordHash = await hashPassword(password, ctx.config.pbkdf2Iterations);
    const user: UserRow = {
      id: ctx.newId('usr'),
      firstName,
      lastName,
      email,
      role: 'CUSTOMER',
      creditIdr: 0,
      passwordHash,
      createdAt: ctx.now().toISOString(),
    };
    try {
      await db.add('users', user);
    } catch {
      // Lost a race with another sign-up for the same email (unique index).
      throw errors.emailTaken(email);
    }
    return { token: await startSession(ctx, user), user };
  },

  async signOut(_parent, _args, ctx) {
    if (ctx.token) await (await ctx.db()).delete('sessions', ctx.token);
    return true;
  },

  async requestPasswordReset(_parent, { email: raw }, ctx) {
    const email = requireEmail('email', raw);
    const db = await ctx.db();
    const code = ctx.randomCode();
    const expiresAt = new Date(ctx.now().getTime() + ctx.config.resetCodeTtlMs).toISOString();

    // Only store a code for a real account, but answer identically either way so
    // this cannot be used to find out which emails are registered.
    if (await db.getFromIndex('users', 'byEmail', email)) {
      await db.put('resetCodes', { email, code, expiresAt });
    }
    return { demoCode: ctx.config.exposeResetCode ? code : null, expiresAt };
  },

  async resetPassword(_parent, { input }, ctx) {
    const email = requireEmail('email', input.email);
    const newPassword = requirePassword('newPassword', input.newPassword);
    const db = await ctx.db();

    const stored = await db.get('resetCodes', email);
    const user = await db.getFromIndex('users', 'byEmail', email);
    const valid =
      stored !== undefined &&
      user !== undefined &&
      stored.code === input.code.trim() &&
      Date.parse(stored.expiresAt) > ctx.now().getTime();
    if (!valid) throw errors.invalidResetCode();

    const passwordHash = await hashPassword(newPassword, ctx.config.pbkdf2Iterations);
    const tx = db.transaction(['users', 'resetCodes', 'sessions'], 'readwrite');
    await tx.objectStore('users').put({ ...user, passwordHash });
    await tx.objectStore('resetCodes').delete(email);
    // A password reset signs the account out everywhere.
    for (const session of await tx.objectStore('sessions').index('byUser').getAll(user.id)) {
      await tx.objectStore('sessions').delete(session.token);
    }
    await tx.done;
    return true;
  },

  async topUpCredit(_parent, { amountIdr }, ctx) {
    const user = await requireUser(ctx);
    const amount = requireInt('amountIdr', amountIdr, { min: TOP_UP_MIN_IDR, max: TOP_UP_MAX_IDR });

    const db = await ctx.db();
    const tx = db.transaction('users', 'readwrite');
    // Re-read inside the transaction so concurrent top-ups and checkouts cannot
    // overwrite each other with a stale balance.
    const fresh = await tx.store.get(user.id);
    if (!fresh) throw errors.unauthenticated();
    const updated = { ...fresh, creditIdr: fresh.creditIdr + amount };
    await tx.store.put(updated);
    await tx.done;
    return updated;
  },
} satisfies Partial<MutationResolvers>;
