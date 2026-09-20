import 'fake-indexeddb/auto';
import { createHarness, type Harness } from '../testing';
import { buildFoodSeed } from './food.seed';
import { INGREDIENT_SEED } from './ingredients.seed';
import {
  COFFEE_URLS,
  drinkDiscountPercent,
  drinkPriceIdr,
  loadDrinks,
  parseCoffeeDtos,
  slug,
  toDrinkRows,
} from './drinks.remote';
import fallback from './drinks.fallback.json';
import { SEED_VERSION } from '.';

const NOW = '2026-03-01T09:00:00.000Z';

describe('authored food seed', () => {
  const food = buildFoodSeed(NOW);
  const ingredientIds = new Set(INGREDIENT_SEED.map((i) => i.id));

  it('has twenty dishes', () => {
    expect(food).toHaveLength(20);
  });

  it('has unique ids', () => {
    expect(new Set(food.map((r) => r.id)).size).toBe(food.length);
    expect(new Set(INGREDIENT_SEED.map((i) => i.id)).size).toBe(INGREDIENT_SEED.length);
  });

  it('references only ingredients that exist', () => {
    for (const recipe of food) {
      for (const need of recipe.ingredients) {
        expect(ingredientIds.has(need.ingredientId), `${recipe.id} -> ${need.ingredientId}`).toBe(
          true,
        );
      }
    }
  });

  it('gives every recipe at least one ingredient with a positive quantity', () => {
    for (const recipe of food) {
      expect(recipe.ingredients.length, recipe.id).toBeGreaterThan(0);
      for (const need of recipe.ingredients) expect(need.quantity, recipe.id).toBeGreaterThan(0);
    }
  });

  it('has sane prices and discounts', () => {
    for (const recipe of food) {
      expect(recipe.priceIdr % 500, recipe.id).toBe(0);
      expect(recipe.priceIdr, recipe.id).toBeGreaterThanOrEqual(10_000);
      expect(recipe.discountPercent, recipe.id).toBeGreaterThanOrEqual(0);
      expect(recipe.discountPercent, recipe.id).toBeLessThanOrEqual(100);
    }
  });

  it('is translated: every dish has an English and an Indonesian description', () => {
    for (const recipe of food) {
      expect(recipe.description?.en, recipe.id).toBeTruthy();
      expect(recipe.description?.id, recipe.id).toBeTruthy();
      expect(recipe.description?.id, recipe.id).not.toBe(recipe.description?.en);
    }
  });

  it('exercises the demo states: six discounts, six featured, one sold out, one low stock', () => {
    expect(food.filter((r) => r.discountPercent > 0)).toHaveLength(6);
    expect(food.filter((r) => r.isFeatured)).toHaveLength(6);
    const stock = new Map(INGREDIENT_SEED.map((i) => [i.id, i.stockQty]));
    const servings = (id: string): number => {
      const recipe = food.find((r) => r.id === id)!;
      return Math.min(
        ...recipe.ingredients.map((n) => Math.floor((stock.get(n.ingredientId) ?? 0) / n.quantity)),
      );
    };
    expect(servings('rec_rawon')).toBe(0);
    expect(servings('rec_ikan_bakar')).toBe(3);
  });
});

describe('coffee API parsing', () => {
  const good = {
    title: 'Latte',
    description: 'Espresso with steamed milk and a little foam.',
    ingredients: ['Espresso', 'Steamed milk'],
    image: 'https://images.example.com/latte.jpg',
  };

  it('keeps a well-formed record', () => {
    expect(parseCoffeeDtos([good])).toEqual([good]);
  });

  it('trims whitespace', () => {
    const [dto] = parseCoffeeDtos([{ ...good, title: '  Latte ', ingredients: [' Espresso '] }]);
    expect(dto?.title).toBe('Latte');
    expect(dto?.ingredients).toEqual(['Espresso']);
  });

  // These are real records found in the live public API.
  it.each([
    ['a placeholder image', { ...good, title: 'test', image: 'string' }],
    ['ingredients as a sentence', { ...good, title: 'Robert', ingredients: 'milk and sugar' }],
    ['no image', { ...good, title: 'test', image: undefined }],
    ['a non-http image', { ...good, image: 'javascript:alert(1)' }],
    ['empty ingredients', { ...good, ingredients: [] }],
    ['a blank ingredient', { ...good, ingredients: ['Espresso', '  '] }],
    ['a non-string ingredient', { ...good, ingredients: ['Espresso', 7] }],
    ['a one-character title', { ...good, title: 'x' }],
    ['a tiny description', { ...good, description: 'hi' }],
  ])('drops a record with %s', (_label, record) => {
    expect(parseCoffeeDtos([record])).toEqual([]);
  });

  it('drops junk but keeps the good records around it', () => {
    const out = parseCoffeeDtos([
      { title: 'string' },
      good,
      null,
      42,
      'x',
      { ...good, title: 'Mocha' },
    ]);
    expect(out.map((d) => d.title)).toEqual(['Latte', 'Mocha']);
  });

  it('removes duplicate titles case-insensitively', () => {
    expect(parseCoffeeDtos([good, { ...good, title: 'LATTE' }])).toHaveLength(1);
  });

  it('returns nothing for a non-array response', () => {
    expect(parseCoffeeDtos({ error: 'nope' })).toEqual([]);
    expect(parseCoffeeDtos(null)).toEqual([]);
  });
});

describe('committed drinks snapshot', () => {
  it('is entirely valid: parsing drops nothing', () => {
    expect(parseCoffeeDtos(fallback.hot)).toHaveLength(fallback.hot.length);
    expect(parseCoffeeDtos(fallback.iced)).toHaveLength(fallback.iced.length);
  });

  it('is large enough to be a real menu', () => {
    expect(fallback.hot.length + fallback.iced.length).toBeGreaterThanOrEqual(20);
  });
});

describe('drink pricing and mapping', () => {
  it('derives a stable price in the band, in steps of 500', () => {
    for (const title of ['Latte', 'Espresso', 'Iced Coffee', 'Caffe Americano']) {
      const price = drinkPriceIdr(title);
      expect(price).toBe(drinkPriceIdr(title.toUpperCase()));
      expect(price).toBeGreaterThanOrEqual(22_000);
      expect(price).toBeLessThanOrEqual(48_000);
      expect(price % 500).toBe(0);
    }
  });

  it('discounts roughly one drink in five, stably', () => {
    const all = [...fallback.hot, ...fallback.iced].map((d) => d.title);
    const discounted = all.filter((t) => drinkDiscountPercent(t) > 0);
    expect(discounted.length).toBeGreaterThan(0);
    expect(discounted.length).toBeLessThan(all.length / 2);
    expect(drinkDiscountPercent(all[0]!)).toBe(drinkDiscountPercent(all[0]!));
  });

  it('shares ingredients across drinks, deduplicated case-insensitively', () => {
    const dto = (title: string, ingredients: string[]) => ({
      title,
      description: 'A perfectly reasonable description.',
      ingredients,
      image: 'https://images.example.com/x.jpg',
    });
    const { recipes, ingredients } = toDrinkRows(
      {
        hot: [dto('Latte', ['Espresso', 'Steamed milk']), dto('Cortado', ['espresso', 'Milk'])],
        iced: [],
      },
      NOW,
    );
    expect(recipes).toHaveLength(2);
    expect(ingredients.map((i) => i.name).sort()).toEqual(['Espresso', 'Milk', 'Steamed milk']);
  });

  it('counts a repeated ingredient once within a drink', () => {
    const dto = {
      title: 'Doppio',
      description: 'Two shots of espresso, no more.',
      ingredients: ['Espresso', 'espresso'],
      image: 'https://images.example.com/x.jpg',
    };
    const { recipes } = toDrinkRows({ hot: [dto], iced: [] }, NOW);
    expect(recipes[0]?.ingredients).toHaveLength(1);
  });

  it('marks the temperature when a title appears on both lists', () => {
    const dto = {
      title: 'Cappuccino',
      description: 'Espresso with a thick layer of foam.',
      ingredients: ['Espresso', 'Foam'],
      image: 'https://images.example.com/x.jpg',
    };
    const { recipes } = toDrinkRows({ hot: [dto], iced: [dto] }, NOW);
    expect(recipes.map((r) => r.name)).toEqual(['Cappuccino', 'Cappuccino (iced)']);
    expect(new Set(recipes.map((r) => r.id)).size).toBe(2);
  });

  it('builds published, non-featured, stock-tracked drink recipes', () => {
    const { recipes, ingredients } = toDrinkRows(
      { hot: parseCoffeeDtos(fallback.hot), iced: parseCoffeeDtos(fallback.iced) },
      NOW,
    );
    for (const r of recipes) {
      expect(r).toMatchObject({
        category: 'DRINK',
        source: 'COFFEE_API',
        status: 'PUBLISHED',
        isFeatured: false,
      });
      expect(r.ingredients.length).toBeGreaterThan(0);
    }
    expect(ingredients.every((i) => i.stockQty > 0 && i.unit === 'portion')).toBe(true);
  });

  it('slugs safely', () => {
    expect(slug('Café Au Lait!')).toBe('cafe_au_lait');
    expect(slug('***')).toBe('x');
  });
});

describe('loading drinks', () => {
  const good = (title: string) => ({
    title,
    description: 'A live description that is long enough.',
    ingredients: ['Espresso'],
    image: 'https://images.example.com/x.jpg',
  });
  const respond = (body: unknown, ok = true) =>
    Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) } as Response);

  it('uses live data when both endpoints answer', async () => {
    const fetchFn = ((url: string) =>
      respond(url === COFFEE_URLS.hot ? [good('Live Hot')] : [good('Live Iced')])) as typeof fetch;
    const drinks = await loadDrinks(fetchFn);
    expect(drinks.hot[0]?.title).toBe('Live Hot');
    expect(drinks.iced[0]?.title).toBe('Live Iced');
  });

  it('falls back to the snapshot when the network fails', async () => {
    const drinks = await loadDrinks(() => Promise.reject(new Error('offline')));
    expect(drinks.hot.length).toBe(fallback.hot.length);
    expect(drinks.iced.length).toBe(fallback.iced.length);
  });

  it('keeps one endpoint live when the other fails', async () => {
    const fetchFn = ((url: string) =>
      url === COFFEE_URLS.hot
        ? respond([good('Live Hot')])
        : Promise.reject(new Error('down'))) as typeof fetch;
    const drinks = await loadDrinks(fetchFn);
    expect(drinks.hot[0]?.title).toBe('Live Hot');
    expect(drinks.iced.length).toBe(fallback.iced.length);
  });

  it('falls back when a response is an error status', async () => {
    const drinks = await loadDrinks(() => respond([], false));
    expect(drinks.hot.length).toBe(fallback.hot.length);
  });

  it('falls back when the live data is all junk', async () => {
    const drinks = await loadDrinks(() => respond([{ title: 'test' }, { title: 'string' }]));
    expect(drinks.hot.length).toBe(fallback.hot.length);
  });
});

describe('seeding the database', () => {
  let h: Harness;
  beforeEach(() => {
    h = createHarness();
  });
  afterEach(() => h.dispose());

  it('seeds on first use: food, drinks, ingredients and both demo users', async () => {
    const db = await h.ctx().db();
    expect((await db.getAll('users')).map((u) => u.role).sort()).toEqual(['ADMIN', 'CUSTOMER']);
    const recipes = await db.getAll('recipes');
    expect(recipes.filter((r) => r.category === 'FOOD')).toHaveLength(20);
    expect(recipes.filter((r) => r.category === 'DRINK').length).toBe(
      fallback.hot.length + fallback.iced.length,
    );
    expect((await db.getAll('ingredients')).length).toBeGreaterThan(INGREDIENT_SEED.length);
    expect((await db.get('meta', 'seedVersion'))?.value).toBe(SEED_VERSION);
  });

  it('never stores a plaintext password', async () => {
    const db = await h.ctx().db();
    for (const user of await db.getAll('users')) {
      expect(user.passwordHash.startsWith('pbkdf2$')).toBe(true);
      expect(user.passwordHash).not.toContain('zettacafe123');
    }
  });

  it('is idempotent: seeding again adds nothing', async () => {
    const db = await h.ctx().db();
    const { ensureSeeded } = await import('.');
    const before = {
      recipes: (await db.getAll('recipes')).length,
      ingredients: (await db.getAll('ingredients')).length,
      users: (await db.getAll('users')).length,
    };
    await db.put('meta', { key: 'seedVersion', value: 0 });
    await ensureSeeded(db, h.ctx());
    expect({
      recipes: (await db.getAll('recipes')).length,
      ingredients: (await db.getAll('ingredients')).length,
      users: (await db.getAll('users')).length,
    }).toEqual(before);
  });

  it('never overwrites existing data when re-seeding: credit, stock and edits survive', async () => {
    const db = await h.ctx().db();
    const { ensureSeeded } = await import('.');
    const customer = (await db.get('users', 'usr_customer'))!;
    await db.put('users', { ...customer, creditIdr: 1 });
    const rice = (await db.get('ingredients', 'ing_beras'))!;
    await db.put('ingredients', { ...rice, stockQty: 7 });
    const nasi = (await db.get('recipes', 'rec_nasi_goreng'))!;
    await db.put('recipes', { ...nasi, priceIdr: 99_000 });

    await db.put('meta', { key: 'seedVersion', value: 0 });
    await ensureSeeded(db, h.ctx());

    expect((await db.get('users', 'usr_customer'))?.creditIdr).toBe(1);
    expect((await db.get('ingredients', 'ing_beras'))?.stockQty).toBe(7);
    expect((await db.get('recipes', 'rec_nasi_goreng'))?.priceIdr).toBe(99_000);
  });
});
