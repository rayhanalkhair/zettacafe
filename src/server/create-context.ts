import { DEFAULT_CONFIG, type ServerConfig, type ServerContext } from './context';
import { DB_NAME, openDatabase } from './db/db';
import { ensureSeeded } from './seed';

export interface ContextOptions {
  dbName?: string;
  token?: string | null;
  now?: () => Date;
  newId?: (prefix: string) => string;
  randomCode?: () => string;
  newToken?: () => string;
  config?: Partial<ServerConfig>;
  fetch?: typeof globalThis.fetch;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const defaultNewId = (prefix: string): string =>
  `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`;

const defaultRandomCode = (): string =>
  String(crypto.getRandomValues(new Uint32Array(1))[0]! % 10_000).padStart(4, '0');

/** 192 bits from the platform CSPRNG, URL-safe. */
const defaultNewToken = (): string =>
  `zt_${bytesToBase64Url(crypto.getRandomValues(new Uint8Array(24)))}`;

/**
 * Builds the context for one operation. Everything volatile (clock, ids, tokens,
 * network, database name) is overridable so tests are fully deterministic; the
 * defaults are the real thing.
 *
 * The database handle is shared per name, so creating a context per operation is
 * cheap: the first one opens and seeds, later ones reuse the same connection.
 */
export function createContext(options: ContextOptions = {}): ServerContext {
  const config: ServerConfig = { ...DEFAULT_CONFIG, ...options.config };
  const now = options.now ?? (() => new Date());
  const fetchFn = options.fetch ?? ((...args) => globalThis.fetch(...args));
  const dbName = options.dbName ?? DB_NAME;

  return {
    db: () => openDatabase(dbName, (db) => ensureSeeded(db, { now, config, fetch: fetchFn })),
    token: options.token ?? null,
    now,
    newId: options.newId ?? defaultNewId,
    randomCode: options.randomCode ?? defaultRandomCode,
    newToken: options.newToken ?? defaultNewToken,
    config,
    fetch: fetchFn,
  };
}
