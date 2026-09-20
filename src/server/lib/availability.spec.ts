import type { IngredientRow, OrderLineRow, RecipeRow } from '../db/schema.types';
import { isOrderable, planCart, servingsFor, stockShortages } from './availability';

const ing = (id: string, stockQty: number, over: Partial<IngredientRow> = {}): IngredientRow => ({
  id,
  name: id,
  stockQty,
  unit: 'g',
  deletedAt: null,
  ...over,
});

const recipe = (
  id: string,
  needs: Record<string, number>,
  over: Partial<RecipeRow> = {},
): RecipeRow => ({
  id,
  name: id,
  description: null,
  imageUrl: null,
  category: 'FOOD',
  source: 'SEED',
  priceIdr: 10_000,
  discountPercent: 0,
  status: 'PUBLISHED',
  isFeatured: false,
  ingredients: Object.entries(needs).map(([ingredientId, quantity]) => ({
    ingredientId,
    quantity,
  })),
  createdAt: '2026-01-01T00:00:00.000Z',
  deletedAt: null,
  ...over,
});

const line = (id: string, recipeId: string, quantity: number): OrderLineRow => ({
  id,
  recipeId,
  quantity,
  note: null,
  frozen: null,
});

const map = <T extends { id: string }>(...rows: T[]): Map<string, T> =>
  new Map(rows.map((r) => [r.id, r]));

const ARCHIVED = '2026-01-01T00:00:00.000Z';

describe('servingsFor', () => {
  it('is the minimum over ingredients of floor(stock / quantity)', () => {
    const r = recipe('r', { rice: 150, egg: 1 });
    // rice: floor(1000 / 150) = 6, egg: floor(4 / 1) = 4
    expect(servingsFor(r, map(ing('rice', 1000), ing('egg', 4)))).toBe(4);
  });

  it('floors, never rounds up', () => {
    expect(servingsFor(recipe('r', { rice: 150 }), map(ing('rice', 299)))).toBe(1);
  });

  it('is zero when any ingredient is exhausted', () => {
    const r = recipe('r', { rice: 150, egg: 1 });
    expect(servingsFor(r, map(ing('rice', 1000), ing('egg', 0)))).toBe(0);
  });

  it('is zero when an ingredient is archived', () => {
    const r = recipe('r', { rice: 150 });
    expect(servingsFor(r, map(ing('rice', 1000, { deletedAt: ARCHIVED })))).toBe(0);
  });

  it('is zero when an ingredient is missing', () => {
    expect(servingsFor(recipe('r', { rice: 150 }), map())).toBe(0);
  });

  it('is zero for a recipe with no ingredients', () => {
    expect(servingsFor(recipe('r', {}), map())).toBe(0);
  });
});

describe('isOrderable', () => {
  it('needs a published, live recipe', () => {
    expect(isOrderable(recipe('r', { a: 1 }))).toBe(true);
    expect(isOrderable(recipe('r', { a: 1 }, { status: 'DRAFT' }))).toBe(false);
    expect(isOrderable(recipe('r', { a: 1 }, { deletedAt: ARCHIVED }))).toBe(false);
    expect(isOrderable(undefined)).toBe(false);
  });
});

describe('planCart', () => {
  const ingredients = map(ing('rice', 300), ing('egg', 10));

  it('reports nothing when the whole cart fits', () => {
    const recipes = map(recipe('nasi', { rice: 150, egg: 1 }));
    expect(planCart([line('l1', 'nasi', 2)], recipes, ingredients)).toEqual([]);
  });

  it('reports a line that is partly available with how many can be made', () => {
    const recipes = map(recipe('nasi', { rice: 150 }));
    const [issue] = planCart([line('l1', 'nasi', 5)], recipes, ingredients);
    expect(issue).toMatchObject({ kind: 'PARTIALLY_AVAILABLE', maxOrderableQuantity: 2 });
  });

  it('reports a line that cannot be made at all', () => {
    const recipes = map(recipe('nasi', { rice: 150 }));
    const [issue] = planCart([line('l1', 'nasi', 1)], recipes, map(ing('rice', 100)));
    expect(issue).toMatchObject({ kind: 'OUT_OF_STOCK', maxOrderableQuantity: 0 });
  });

  it('reports an unpublished recipe', () => {
    const recipes = map(recipe('nasi', { rice: 150 }, { status: 'DRAFT' }));
    const [issue] = planCart([line('l1', 'nasi', 1)], recipes, ingredients);
    expect(issue).toMatchObject({ kind: 'UNPUBLISHED', maxOrderableQuantity: 0 });
  });

  it('reports a recipe that no longer exists', () => {
    const [issue] = planCart([line('l1', 'gone', 1)], map(), ingredients);
    expect(issue?.kind).toBe('UNPUBLISHED');
  });

  it('shares stock across lines: an earlier line takes what a later one needs', () => {
    // 300g rice is 2 portions of nasi (150g) or 3 of lontong (100g), but not both at full size.
    const recipes = map(recipe('nasi', { rice: 150 }), recipe('lontong', { rice: 100 }));
    const issues = planCart([line('a', 'nasi', 2), line('b', 'lontong', 1)], recipes, ingredients);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ kind: 'OUT_OF_STOCK', maxOrderableQuantity: 0 });
    expect(issues[0]?.line.id).toBe('b');
  });

  it('does not let a failing line consume stock', () => {
    const recipes = map(recipe('big', { rice: 250 }), recipe('small', { rice: 100 }));
    const issues = planCart([line('a', 'big', 2), line('b', 'small', 3)], recipes, ingredients);
    // "big" x2 needs 500g of 300g, so it is partially available (1) and takes nothing.
    // That leaves the full 300g for "small" x3.
    expect(issues.map((i) => i.line.id)).toEqual(['a']);
  });
});

describe('stockShortages', () => {
  it('is empty when total need fits', () => {
    const recipes = map(recipe('nasi', { rice: 100 }));
    expect(stockShortages([line('a', 'nasi', 3)], recipes, map(ing('rice', 300)))).toEqual([]);
  });

  it('totals need across every line for a shared ingredient', () => {
    const recipes = map(recipe('nasi', { rice: 150 }), recipe('lontong', { rice: 100 }));
    const shortages = stockShortages(
      [line('a', 'nasi', 1), line('b', 'lontong', 2)],
      recipes,
      map(ing('rice', 300, { name: 'Rice' })),
    );
    expect(shortages).toEqual([
      { ingredientId: 'rice', name: 'Rice', required: 350, available: 300, unit: 'g' },
    ]);
  });

  it('ignores lines whose recipe is unavailable', () => {
    const recipes = map(recipe('nasi', { rice: 999 }, { status: 'DRAFT' }));
    expect(stockShortages([line('a', 'nasi', 1)], recipes, map(ing('rice', 1)))).toEqual([]);
  });
});
