import { CombinedGraphQLErrors } from '@apollo/client';
import { errorCodeOf, hasErrorCode, toUserMessage } from './to-user-message';

/** A server error the way Apollo surfaces it: the code and data live in extensions. */
function serverError(code: string, extensions: Record<string, unknown> = {}): Error {
  return new CombinedGraphQLErrors({
    data: null,
    errors: [
      {
        message: 'human readable text that must never be parsed',
        extensions: { code, ...extensions },
      },
    ],
  });
}

const money = (value: number): string => `Rp ${value.toLocaleString('en-US')}`;

describe('toUserMessage', () => {
  it.each([
    'UNAUTHENTICATED',
    'FORBIDDEN',
    'INVALID_CREDENTIALS',
    'INVALID_RESET_CODE',
    'EMPTY_CART',
    'RECIPE_UNAVAILABLE',
    'RECIPE_IN_USE',
  ])('maps %s to its own key', (code) => {
    expect(toUserMessage(serverError(code))).toEqual({ key: `errors.${code}`, params: {} });
  });

  it('reports the shortfall and total for insufficient credit, formatted by the caller', () => {
    const message = toUserMessage(
      serverError('INSUFFICIENT_CREDIT', { shortfallIdr: 12_000, requiredIdr: 62_000 }),
      money,
    );
    expect(message).toEqual({
      key: 'errors.INSUFFICIENT_CREDIT',
      params: { shortfall: 'Rp 12,000', required: 'Rp 62,000' },
    });
  });

  it('lists the dishes that are short on stock', () => {
    const message = toUserMessage(
      serverError('INSUFFICIENT_STOCK', {
        shortages: [{ name: 'Rendang Daging' }, { name: 'Soto Betawi' }, { name: 3 }],
      }),
    );
    expect(message).toEqual({
      key: 'errors.INSUFFICIENT_STOCK',
      params: { items: 'Rendang Daging, Soto Betawi' },
    });
  });

  it('reports the old and new price when the price changed', () => {
    const message = toUserMessage(
      serverError('PRICE_CHANGED', { expectedIdr: 50_000, actualIdr: 55_000 }),
      money,
    );
    expect(message.params).toEqual({ expected: 'Rp 50,000', actual: 'Rp 55,000' });
  });

  it('passes through the field, entity and email a message names', () => {
    expect(toUserMessage(serverError('VALIDATION', { field: 'quantity' })).params).toEqual({
      field: 'quantity',
    });
    expect(toUserMessage(serverError('NOT_FOUND', { entity: 'Recipe' })).params).toEqual({
      entity: 'Recipe',
    });
    expect(toUserMessage(serverError('EMAIL_TAKEN', { email: 'a@b.id' })).params).toEqual({
      email: 'a@b.id',
    });
  });

  it('degrades to empty parameters when the server sent none', () => {
    expect(toUserMessage(serverError('INSUFFICIENT_CREDIT'), money).params).toEqual({
      shortfall: '',
      required: '',
    });
    expect(toUserMessage(serverError('INSUFFICIENT_STOCK')).params).toEqual({ items: '' });
  });

  it('never uses the server message text', () => {
    const message = toUserMessage(serverError('FORBIDDEN'));
    expect(JSON.stringify(message)).not.toContain('human readable');
  });

  it('treats an unknown code as an unknown error', () => {
    expect(toUserMessage(serverError('SOMETHING_NEW')).key).toBe('errors.UNKNOWN');
  });

  it('treats a network failure as a network error', () => {
    expect(toUserMessage(new TypeError('Failed to fetch')).key).toBe('errors.NETWORK');
    expect(toUserMessage(new Error('Network request failed')).key).toBe('errors.NETWORK');
  });

  it('treats anything else as unknown', () => {
    expect(toUserMessage(new Error('boom')).key).toBe('errors.UNKNOWN');
    expect(toUserMessage('nope').key).toBe('errors.UNKNOWN');
    expect(toUserMessage(null).key).toBe('errors.UNKNOWN');
  });
});

describe('errorCodeOf / hasErrorCode', () => {
  it('reads the code from a server error', () => {
    const error = serverError('PRICE_CHANGED');
    expect(errorCodeOf(error)).toBe('PRICE_CHANGED');
    expect(hasErrorCode(error, 'PRICE_CHANGED')).toBe(true);
    expect(hasErrorCode(error, 'FORBIDDEN')).toBe(false);
  });

  it('is null for anything that is not a recognised server error', () => {
    expect(errorCodeOf(new Error('x'))).toBeNull();
    expect(errorCodeOf(serverError('SOMETHING_NEW'))).toBeNull();
  });
});
