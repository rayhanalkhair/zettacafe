import { GraphQLError } from 'graphql';
import { paginate, resolvePage } from './paginate';

const items = Array.from({ length: 25 }, (_, i) => i + 1);

describe('paginate', () => {
  it('defaults to the first ten', () => {
    const r = paginate(items, undefined);
    expect(r.items).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(r.totalCount).toBe(25);
  });

  it('returns a partial last page', () => {
    expect(paginate(items, { offset: 20, limit: 10 }).items).toEqual([21, 22, 23, 24, 25]);
  });

  it('returns nothing past the end but still reports the total', () => {
    const r = paginate(items, { offset: 100, limit: 10 });
    expect(r.items).toEqual([]);
    expect(r.totalCount).toBe(25);
  });

  it('treats null arguments as defaults', () => {
    expect(resolvePage({ offset: null, limit: null })).toEqual({ offset: 0, limit: 10 });
  });

  it.each([
    [{ offset: -1 }, 'page.offset'],
    [{ offset: 1.5 }, 'page.offset'],
    [{ limit: 0 }, 'page.limit'],
    [{ limit: 51 }, 'page.limit'],
  ])('rejects %j', (page, field) => {
    let caught: unknown;
    try {
      resolvePage(page);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(GraphQLError);
    expect((caught as GraphQLError).extensions['code']).toBe('VALIDATION');
    expect((caught as GraphQLError).extensions['field']).toBe(field);
  });
});
