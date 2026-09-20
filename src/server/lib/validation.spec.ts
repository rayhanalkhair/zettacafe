import type { GraphQLError } from 'graphql';
import { optionalUrl, requireEmail, requireInt, requirePassword, requireText } from './validation';

function codeAndField(fn: () => unknown): { code: unknown; field: unknown } {
  try {
    fn();
  } catch (e) {
    const ext = (e as GraphQLError).extensions;
    return { code: ext['code'], field: ext['field'] };
  }
  throw new Error('expected the call to throw');
}

describe('requireText', () => {
  it('trims', () => {
    expect(requireText('name', '  Nasi Goreng  ')).toBe('Nasi Goreng');
  });

  it('rejects blank input as required', () => {
    expect(codeAndField(() => requireText('name', '   '))).toEqual({
      code: 'VALIDATION',
      field: 'name',
    });
  });

  it('rejects text over the limit', () => {
    expect(codeAndField(() => requireText('name', 'x'.repeat(201))).field).toBe('name');
  });
});

describe('requireEmail', () => {
  it('lowercases and trims', () => {
    expect(requireEmail('email', '  Rayhan@Example.COM ')).toBe('rayhan@example.com');
  });

  it.each(['', 'nope', 'a@b', '@b.co', 'a b@c.de'])('rejects %j', (bad) => {
    expect(codeAndField(() => requireEmail('email', bad))).toEqual({
      code: 'VALIDATION',
      field: 'email',
    });
  });
});

describe('requirePassword', () => {
  it('accepts eight characters', () => {
    expect(requirePassword('password', '12345678')).toBe('12345678');
  });

  it('rejects seven characters', () => {
    expect(codeAndField(() => requirePassword('password', '1234567')).field).toBe('password');
  });

  it('does not trim: spaces are valid password characters', () => {
    expect(requirePassword('password', '  a b c  ')).toBe('  a b c  ');
  });
});

describe('requireInt', () => {
  it('accepts values in range, inclusive', () => {
    expect(requireInt('qty', 1, { min: 1, max: 99 })).toBe(1);
    expect(requireInt('qty', 99, { min: 1, max: 99 })).toBe(99);
  });

  it.each([0, 100, 1.5, Number.NaN])('rejects %s', (bad) => {
    expect(codeAndField(() => requireInt('qty', bad, { min: 1, max: 99 })).field).toBe('qty');
  });
});

describe('optionalUrl', () => {
  it('treats empty and missing as no image', () => {
    expect(optionalUrl('imageUrl', undefined)).toBeNull();
    expect(optionalUrl('imageUrl', null)).toBeNull();
    expect(optionalUrl('imageUrl', '   ')).toBeNull();
  });

  it('accepts http and https', () => {
    expect(optionalUrl('imageUrl', 'https://example.com/a.png')).toBe('https://example.com/a.png');
  });

  it.each(['javascript:alert(1)', 'data:text/html,x', 'not a url', 'ftp://example.com/a'])(
    'rejects %j',
    (bad) => {
      expect(codeAndField(() => optionalUrl('imageUrl', bad)).code).toBe('VALIDATION');
    },
  );
});
