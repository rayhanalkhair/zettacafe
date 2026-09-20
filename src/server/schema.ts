import { makeExecutableSchema } from '@graphql-tools/schema';
import { createContext } from './create-context';
import type { ServerContext } from './context';
import { resolvers } from './resolvers';
import typeDefs from './schema.graphql';

/**
 * The executable schema. This module is the LAZY boundary: importing it pulls in
 * graphql, @graphql-tools, idb, every resolver and every seed. It must only ever
 * be reached through a dynamic import (see core/graphql), never a static one,
 * or all of it lands in the initial bundle. scripts/check-bundle.mjs enforces this.
 */
export const schema = makeExecutableSchema({ typeDefs, resolvers });

/**
 * Structural, on purpose: the server must not depend on Apollo's types. (The
 * `headers` property on Apollo's operation context is not even part of Apollo
 * core; apollo-angular/http adds it by type augmentation.)
 */
interface OperationLike {
  getContext(): object;
}

/**
 * Reads `Authorization` from whatever the transport supplied. The client may hand
 * over a plain object or an Angular `HttpHeaders`; the server cannot import
 * Angular, so both are accepted structurally: a record, or anything with `get()`.
 */
function readAuthorization(headers: unknown): string {
  if (typeof headers !== 'object' || headers === null) return '';
  const record = headers as Record<string, unknown>;
  if (typeof record['authorization'] === 'string') return record['authorization'];
  const get = (headers as { get?: unknown }).get;
  if (typeof get === 'function') {
    const value: unknown = get.call(headers, 'authorization');
    if (typeof value === 'string') return value;
  }
  return '';
}

/** Builds the resolver context for one Apollo operation from its Authorization header. */
export function contextFor(operation: OperationLike): ServerContext {
  const header = readAuthorization((operation.getContext() as { headers?: unknown }).headers);
  const token = /^Bearer\s+(\S+)$/i.exec(header)?.[1] ?? null;
  return createContext({ token });
}
