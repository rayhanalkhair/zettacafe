import 'fake-indexeddb/auto';
import { graphql, type ExecutionResult } from 'graphql';
import type { ServerContext } from './context';
import { createContext, type ContextOptions } from './create-context';
import { deleteDatabase } from './db/db';
import { schema } from './schema';
import { DEMO_ACCOUNTS } from './seed/users.seed';

/**
 * Test harness. Only specs import this file.
 *
 * Each test gets its own in-memory database (fake-indexeddb) and a fully
 * deterministic context: a controllable clock, sequential ids and tokens, a
 * fixed reset code, a cheap PBKDF2 work factor, and a network that always fails
 * so seeding uses the committed snapshot. Tests run through the real executable
 * schema, so resolvers, authorization and the schema itself are exercised
 * together, at unit-test speed, with nothing mocked.
 */

export interface Harness {
  dbName: string;
  /** Advance or set the clock. */
  clock: { now: Date; advance(ms: number): void };
  /** A context for the given bearer token (or a guest). */
  ctx(token?: string | null): ServerContext;
  /** Execute a document and return the raw result. */
  run<T = Record<string, unknown>>(
    source: string,
    options?: { token?: string | null; variables?: Record<string, unknown> },
  ): Promise<ExecutionResult<T>>;
  /** Sign in with a demo account and return its token. */
  signIn(who: 'admin' | 'customer'): Promise<string>;
  dispose(): Promise<void>;
}

let counter = 0;

export function createHarness(overrides: Partial<ContextOptions> = {}): Harness {
  const dbName = `zettacafe-test-${++counter}-${Math.random().toString(36).slice(2, 8)}`;
  const clock = {
    now: new Date('2026-03-01T09:00:00.000Z'),
    advance(ms: number) {
      clock.now = new Date(clock.now.getTime() + ms);
    },
  };
  const sequence = new Map<string, number>();
  let tokens = 0;

  const ctx = (token: string | null = null): ServerContext =>
    createContext({
      dbName,
      token,
      now: () => clock.now,
      newId: (prefix) => {
        const n = (sequence.get(prefix) ?? 0) + 1;
        sequence.set(prefix, n);
        return `${prefix}_${n}`;
      },
      newToken: () => `tok_${++tokens}`,
      randomCode: () => '1234',
      config: { pbkdf2Iterations: 1000 },
      fetch: () => Promise.reject(new Error('offline in tests')),
      ...overrides,
    });

  const run: Harness['run'] = (source, options = {}) =>
    graphql({
      schema,
      source,
      variableValues: options.variables,
      contextValue: ctx(options.token ?? null),
    }) as Promise<ExecutionResult<never>>;

  return {
    dbName,
    clock,
    ctx,
    run,
    async signIn(who) {
      const { email, password } = DEMO_ACCOUNTS[who];
      const result = await run<{ signIn: { token: string } }>(
        `mutation($i: SignInInput!) { signIn(input: $i) { token } }`,
        { variables: { i: { email, password } } },
      );
      const token = result.data?.signIn.token;
      if (!token) throw new Error(`could not sign in as ${who}: ${JSON.stringify(result.errors)}`);
      return token;
    },
    dispose: () => deleteDatabase(dbName),
  };
}

/** The `extensions.code` of the first error, for concise assertions. */
export function errorCode(result: ExecutionResult): unknown {
  return result.errors?.[0]?.extensions['code'];
}
