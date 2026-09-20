import type { IDBPDatabase } from 'idb';
import type { ZettaDb } from './db/schema.types';

export interface ServerConfig {
  /** PBKDF2 work factor. Tests lower this so hashing is instant. */
  pbkdf2Iterations: number;
  sessionTtlMs: number;
  resetCodeTtlMs: number;
  /**
   * Return the password reset code in the response. There is no mailer behind an
   * in-browser server, so demo mode hands it back; a real deployment sets false.
   */
  exposeResetCode: boolean;
}

export const DEFAULT_CONFIG: ServerConfig = {
  pbkdf2Iterations: 120_000,
  sessionTtlMs: 7 * 24 * 60 * 60 * 1000,
  resetCodeTtlMs: 15 * 60 * 1000,
  exposeResetCode: true,
};

/**
 * Everything a resolver may depend on. Clock, ids and randomness are injected so
 * every resolver is deterministic under a fake context, and the database is
 * behind a memoised promise so the first operation opens and seeds it.
 */
export interface ServerContext {
  db(): Promise<IDBPDatabase<ZettaDb>>;
  /** The bearer token from the request, if any. */
  token: string | null;
  now(): Date;
  /** A unique id with a readable prefix, e.g. `ord_k3j9x2`. */
  newId(prefix: string): string;
  /** A four-digit numeric code. */
  randomCode(): string;
  /** An unguessable session token. Distinct from newId: ids are not secrets, tokens are. */
  newToken(): string;
  config: ServerConfig;
  fetch: typeof globalThis.fetch;
}
