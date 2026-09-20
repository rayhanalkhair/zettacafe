import { CombinedGraphQLErrors } from '@apollo/client';

/** A translatable message: an i18n key plus its interpolation parameters. */
export interface UserMessage {
  readonly key: string;
  readonly params: Readonly<Record<string, string | number>>;
}

/** Codes the server can raise. Mirrors the catalogue in src/server/schema.graphql. */
export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_TAKEN'
  | 'INVALID_RESET_CODE'
  | 'EMPTY_CART'
  | 'RECIPE_UNAVAILABLE'
  | 'INSUFFICIENT_STOCK'
  | 'INSUFFICIENT_CREDIT'
  | 'PRICE_CHANGED'
  | 'RECIPE_IN_USE';

const KNOWN: ReadonlySet<string> = new Set<ErrorCode>([
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION',
  'INVALID_CREDENTIALS',
  'EMAIL_TAKEN',
  'INVALID_RESET_CODE',
  'EMPTY_CART',
  'RECIPE_UNAVAILABLE',
  'INSUFFICIENT_STOCK',
  'INSUFFICIENT_CREDIT',
  'PRICE_CHANGED',
  'RECIPE_IN_USE',
]);

interface ServerError {
  code: ErrorCode;
  extensions: Readonly<Record<string, unknown>>;
}

function firstServerError(error: unknown): ServerError | null {
  if (!CombinedGraphQLErrors.is(error)) return null;
  for (const item of error.errors) {
    const code = item.extensions?.['code'];
    if (typeof code === 'string' && KNOWN.has(code)) {
      return { code: code as ErrorCode, extensions: item.extensions ?? {} };
    }
  }
  return null;
}

/** The stable error code, or null when this is not a recognised server error. */
export function errorCodeOf(error: unknown): ErrorCode | null {
  return firstServerError(error)?.code ?? null;
}

export function hasErrorCode(error: unknown, code: ErrorCode): boolean {
  return errorCodeOf(error) === code;
}

interface Shortage {
  name?: unknown;
}

/**
 * Turns any thrown value into something a person can read, in their language.
 *
 * It maps the server's `extensions.code` to an i18n key and pulls interpolation
 * parameters from the structured extensions. It never parses a message string:
 * v1 recovered "Transaction is Failed" by string-matching and chaining
 * `replaceAll`, so any wording change on the server silently broke the UI.
 *
 * `formatIdr` lets the caller format money in the active language.
 */
export function toUserMessage(
  error: unknown,
  formatIdr: (value: number) => string = (value) => `Rp ${value}`,
): UserMessage {
  const server = firstServerError(error);
  if (!server) {
    const offline =
      error instanceof TypeError ||
      (error instanceof Error && /fetch|network/i.test(error.message));
    return { key: offline ? 'errors.NETWORK' : 'errors.UNKNOWN', params: {} };
  }

  const { code, extensions } = server;
  const text = (name: string): string => {
    const value = extensions[name];
    return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  };
  const money = (name: string): string => {
    const value = extensions[name];
    return typeof value === 'number' ? formatIdr(value) : '';
  };

  switch (code) {
    case 'INSUFFICIENT_CREDIT':
      return {
        key: 'errors.INSUFFICIENT_CREDIT',
        params: { shortfall: money('shortfallIdr'), required: money('requiredIdr') },
      };
    case 'INSUFFICIENT_STOCK': {
      const shortages = Array.isArray(extensions['shortages'])
        ? (extensions['shortages'] as Shortage[])
        : [];
      const names = shortages
        .map((s) => (typeof s.name === 'string' ? s.name : ''))
        .filter(Boolean);
      return { key: 'errors.INSUFFICIENT_STOCK', params: { items: names.join(', ') } };
    }
    case 'PRICE_CHANGED':
      return {
        key: 'errors.PRICE_CHANGED',
        params: { expected: money('expectedIdr'), actual: money('actualIdr') },
      };
    case 'VALIDATION':
      return { key: 'errors.VALIDATION', params: { field: text('field') } };
    case 'NOT_FOUND':
      return { key: 'errors.NOT_FOUND', params: { entity: text('entity') } };
    case 'EMAIL_TAKEN':
      return { key: 'errors.EMAIL_TAKEN', params: { email: text('email') } };
    default:
      return { key: `errors.${code}`, params: {} };
  }
}
