import fallback from '../seed/drinks.fallback.json';
import { createHarness, errorCode, type Harness } from '../testing';

const DRINK_COUNT = fallback.hot.length + fallback.iced.length;
const FOOD_COUNT = 20;

interface RecipeList {
  recipes: {
    totalCount: number;
    items: {
      id: string;
      name: string;
      priceIdr: number;
      discountedPriceIdr: number;
      discountPercent: number;
      status?: string;
    }[];
  };
}

const LIST = `
  query($f: RecipeFilter, $p: PageInput, $s: RecipeSort) {
    recipes(filter: $f, page: $p, sort: $s) {
      totalCount
      items { id name priceIdr discountedPriceIdr discountPercent status category }
    }
  }`;

describe('recipes: reading', () => {
  let h: Harness;
  beforeEach(() => {
    h = createHarness();
  });
  afterEach(() => h.dispose());

  it('shows a guest the whole published menu, food and drinks together', async () => {
    const r = await h.run<RecipeList>(LIST, { variables: { p: { limit: 50 } } });
    expect(r.errors).toBeUndefined();
    expect(r.data?.recipes.totalCount).toBe(FOOD_COUNT + DRINK_COUNT);
  });

  it('paginates: a page is a slice, and the total ignores the page', async () => {
    const first = await h.run<RecipeList>(LIST, { variables: { p: { offset: 0, limit: 10 } } });
    const second = await h.run<RecipeList>(LIST, { variables: { p: { offset: 10, limit: 10 } } });
    expect(first.data?.recipes.items).toHaveLength(10);
    expect(second.data?.recipes.items).toHaveLength(10);
    expect(first.data?.recipes.totalCount).toBe(second.data?.recipes.totalCount);
    const ids = new Set(
      [...(first.data?.recipes.items ?? []), ...(second.data?.recipes.items ?? [])].map(
        (i) => i.id,
      ),
    );
    expect(ids.size).toBe(20);
  });

  it('returns an empty page past the end but still reports the total', async () => {
    const r = await h.run<RecipeList>(LIST, { variables: { p: { offset: 500, limit: 10 } } });
    expect(r.data?.recipes.items).toEqual([]);
    expect(r.data?.recipes.totalCount).toBe(FOOD_COUNT + DRINK_COUNT);
  });

  it('rejects a page size over 50', async () => {
    const r = await h.run(LIST, { variables: { p: { limit: 51 } } });
    expect(errorCode(r)).toBe('VALIDATION');
  });

  it('searches names case-insensitively', async () => {
    const r = await h.run<RecipeList>(LIST, {
      variables: { f: { search: '  NASI ' }, p: { limit: 50 } },
    });
    const names = r.data?.recipes.items.map((i) => i.name) ?? [];
    expect(names).toContain('Nasi Goreng Kampung');
    expect(names).toContain('Nasi Uduk');
    expect(names.every((n) => n.toLowerCase().includes('nasi'))).toBe(true);
  });

  it('filters by category', async () => {
    const drinks = await h.run<RecipeList>(LIST, {
      variables: { f: { category: 'DRINK' }, p: { limit: 50 } },
    });
    const food = await h.run<RecipeList>(LIST, {
      variables: { f: { category: 'FOOD' }, p: { limit: 50 } },
    });
    expect(drinks.data?.recipes.totalCount).toBe(DRINK_COUNT);
    expect(food.data?.recipes.totalCount).toBe(FOOD_COUNT);
  });

  it('sorts by effective price, ascending and descending', async () => {
    const asc = await h.run<RecipeList>(LIST, {
      variables: { s: { field: 'PRICE', direction: 'ASC' }, p: { limit: 50 } },
    });
    const prices = asc.data?.recipes.items.map((i) => i.discountedPriceIdr) ?? [];
    expect(prices).toEqual([...prices].sort((a, b) => a - b));

    const desc = await h.run<RecipeList>(LIST, {
      variables: { s: { field: 'PRICE', direction: 'DESC' }, p: { limit: 50 } },
    });
    const down = desc.data?.recipes.items.map((i) => i.discountedPriceIdr) ?? [];
    expect(down).toEqual([...down].sort((a, b) => b - a));
  });

  it('sorts by name by default', async () => {
    const r = await h.run<RecipeList>(LIST, { variables: { p: { limit: 50 } } });
    const names = r.data?.recipes.items.map((i) => i.name) ?? [];
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('computes the discounted price', async () => {
    const r = await h.run<{
      recipe: { priceIdr: number; discountPercent: number; discountedPriceIdr: number };
    }>(`{ recipe(id: "rec_rendang") { priceIdr discountPercent discountedPriceIdr } }`);
    expect(r.data?.recipe).toEqual({
      priceIdr: 52_000,
      discountPercent: 20,
      discountedPriceIdr: 41_600,
    });
  });

  it('returns null for an unknown id', async () => {
    const r = await h.run<{ recipe: unknown }>(`{ recipe(id: "nope") { id } }`);
    expect(r.errors).toBeUndefined();
    expect(r.data?.recipe).toBeNull();
  });
});

describe('recipes: derived fields', () => {
  let h: Harness;
  beforeEach(() => {
    h = createHarness();
  });
  afterEach(() => h.dispose());

  const STOCK = `query($id: ID!) { recipe(id: $id) { availableServings isAvailable } }`;

  it('reports a sold-out dish', async () => {
    const r = await h.run<{ recipe: { availableServings: number; isAvailable: boolean } }>(STOCK, {
      variables: { id: 'rec_rawon' },
    });
    expect(r.data?.recipe).toEqual({ availableServings: 0, isAvailable: false });
  });

  it('reports a low-stock dish: snapper limits Ikan Bakar to three', async () => {
    const r = await h.run<{ recipe: { availableServings: number; isAvailable: boolean } }>(STOCK, {
      variables: { id: 'rec_ikan_bakar' },
    });
    expect(r.data?.recipe).toEqual({ availableServings: 3, isAvailable: true });
  });

  it('follows stock: restocking the missing ingredient makes the dish available', async () => {
    const admin = await h.signIn('admin');
    await h.run(`mutation { adjustIngredientStock(id: "ing_kluwek", deltaQty: 10) { stockQty } }`, {
      token: admin,
    });
    const r = await h.run<{ recipe: { availableServings: number } }>(STOCK, {
      variables: { id: 'rec_rawon' },
    });
    expect(r.data?.recipe.availableServings).toBe(3);
  });

  it('serves the description in the requested language, falling back to English', async () => {
    const r = await h.run<{ en: { description: string }; id: { description: string } }>(
      `{ en: recipe(id: "rec_nasi_goreng") { description(locale: EN) }
         id: recipe(id: "rec_nasi_goreng") { description(locale: ID) } }`,
    );
    expect(r.data?.en.description).toMatch(/Wok-fried rice/);
    expect(r.data?.id.description).toMatch(/Nasi digoreng/);

    // Drinks come from an English-only source, so Indonesian falls back to English.
    const drink = await h.run<{ recipes: { items: { en: string; id: string }[] } }>(
      `{ recipes(filter: { category: DRINK }, page: { limit: 1 }) { items { en: description(locale: EN) id: description(locale: ID) } } }`,
    );
    expect(drink.data?.recipes.items[0]?.id).toBe(drink.data?.recipes.items[0]?.en);
  });

  it('lists ingredient names publicly, without quantities or stock', async () => {
    const r = await h.run<{ recipe: { ingredientNames: string[] } }>(
      `{ recipe(id: "rec_klepon") { ingredientNames } }`,
    );
    expect(r.data?.recipe.ingredientNames).toEqual(
      expect.arrayContaining(['Rice flour', 'Pandan leaf', 'Palm sugar', 'Coconut milk']),
    );
  });
});

describe('recipes: home page lists', () => {
  let h: Harness;
  beforeEach(() => {
    h = createHarness();
  });
  afterEach(() => h.dispose());

  type Items = { id: string; discountPercent: number; isFeatured: boolean; isAvailable: boolean }[];

  it('featuredRecipes returns featured, in-stock dishes', async () => {
    const r = await h.run<{ featuredRecipes: Items }>(
      `{ featuredRecipes { id isFeatured isAvailable } }`,
    );
    const items = r.data?.featuredRecipes ?? [];
    expect(items).toHaveLength(6);
    expect(items.every((i) => i.isFeatured && i.isAvailable)).toBe(true);
  });

  // The v1 bug: menuHighlight and specialOffer were swapped and only worked by
  // accident. Assert WHAT comes back, not just that something does.
  it('discountedRecipes returns only discounted dishes, biggest discount first', async () => {
    const r = await h.run<{ discountedRecipes: Items }>(
      `{ discountedRecipes(limit: 20) { id discountPercent isAvailable } }`,
    );
    const items = r.data?.discountedRecipes ?? [];
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.discountPercent > 0)).toBe(true);
    const percents = items.map((i) => i.discountPercent);
    expect(percents).toEqual([...percents].sort((a, b) => b - a));
    expect(items[0]?.id).toBe('rec_pisang_goreng'); // 25% is the largest food discount
  });

  it('featuredRecipes and discountedRecipes are not the same list', async () => {
    const r = await h.run<{ featuredRecipes: Items; discountedRecipes: Items }>(
      `{ featuredRecipes { id } discountedRecipes { id } }`,
    );
    expect(r.data?.featuredRecipes.map((i) => i.id)).not.toEqual(
      r.data?.discountedRecipes.map((i) => i.id),
    );
  });

  it('omits a featured dish that is sold out', async () => {
    const admin = await h.signIn('admin');
    await h.run(`mutation { setRecipeFeatured(id: "rec_rawon", isFeatured: true) { id } }`, {
      token: admin,
    });
    const r = await h.run<{ featuredRecipes: { id: string }[] }>(`{ featuredRecipes { id } }`);
    expect(r.data?.featuredRecipes.map((i) => i.id)).not.toContain('rec_rawon');
  });

  it('respects the limit and rejects a bad one', async () => {
    const r = await h.run<{ discountedRecipes: unknown[] }>(
      `{ discountedRecipes(limit: 2) { id } }`,
    );
    expect(r.data?.discountedRecipes).toHaveLength(2);
    expect(errorCode(await h.run(`{ discountedRecipes(limit: 0) { id } }`))).toBe('VALIDATION');
  });
});

describe('recipes: visibility and inventory privacy', () => {
  let h: Harness;
  beforeEach(() => {
    h = createHarness();
  });
  afterEach(() => h.dispose());

  const INGREDIENTS = `{ recipe(id: "rec_klepon") { ingredients { quantity ingredient { name stockQty } } } }`;

  it('hides inventory from guests: the field is null, not an error', async () => {
    const r = await h.run<{ recipe: { ingredients: unknown } }>(INGREDIENTS);
    expect(r.errors).toBeUndefined();
    expect(r.data?.recipe.ingredients).toBeNull();
  });

  it('hides inventory from customers too', async () => {
    const r = await h.run<{ recipe: { ingredients: unknown } }>(INGREDIENTS, {
      token: await h.signIn('customer'),
    });
    expect(r.data?.recipe.ingredients).toBeNull();
  });

  it('gives admins quantities and live stock', async () => {
    const r = await h.run<{
      recipe: { ingredients: { quantity: number; ingredient: { stockQty: number } }[] };
    }>(INGREDIENTS, { token: await h.signIn('admin') });
    const lines = r.data?.recipe.ingredients ?? [];
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((l) => l.quantity > 0 && l.ingredient.stockQty >= 0)).toBe(true);
  });

  it('does not let a guest read the ingredient list through the recipe list either', async () => {
    const r = await h.run<{ recipes: { items: { ingredients: unknown }[] } }>(
      `{ recipes { items { ingredients { ingredient { stockQty } } } } }`,
    );
    expect(r.data?.recipes.items.every((i) => i.ingredients === null)).toBe(true);
  });

  it('keeps drafts off the public menu but shows them to admins', async () => {
    const admin = await h.signIn('admin');
    await h.run(`mutation { setRecipeStatus(id: "rec_klepon", status: DRAFT) { status } }`, {
      token: admin,
    });

    const guest = await h.run<RecipeList>(LIST, { variables: { p: { limit: 50 } } });
    expect(guest.data?.recipes.totalCount).toBe(FOOD_COUNT + DRINK_COUNT - 1);
    expect(
      (await h.run<{ recipe: unknown }>(`{ recipe(id: "rec_klepon") { id } }`)).data?.recipe,
    ).toBeNull();

    const seen = await h.run<RecipeList>(LIST, { token: admin, variables: { p: { limit: 50 } } });
    expect(seen.data?.recipes.totalCount).toBe(FOOD_COUNT + DRINK_COUNT);
    expect(
      (
        await h.run<{ recipe: { id: string } }>(`{ recipe(id: "rec_klepon") { id } }`, {
          token: admin,
        })
      ).data?.recipe.id,
    ).toBe('rec_klepon');
  });

  it('lets an admin list only drafts', async () => {
    const admin = await h.signIn('admin');
    await h.run(`mutation { setRecipeStatus(id: "rec_klepon", status: DRAFT) { status } }`, {
      token: admin,
    });
    const r = await h.run<RecipeList>(LIST, {
      token: admin,
      variables: { f: { status: 'DRAFT' } },
    });
    expect(r.data?.recipes.items.map((i) => i.id)).toEqual(['rec_klepon']);
  });

  it('refuses a draft filter from a guest or customer instead of silently ignoring it', async () => {
    expect(errorCode(await h.run(LIST, { variables: { f: { status: 'DRAFT' } } }))).toBe(
      'FORBIDDEN',
    );
    expect(
      errorCode(
        await h.run(LIST, {
          token: await h.signIn('customer'),
          variables: { f: { status: 'DRAFT' } },
        }),
      ),
    ).toBe('FORBIDDEN');
  });

  it('allows the PUBLISHED filter for everyone', async () => {
    const r = await h.run<RecipeList>(LIST, { variables: { f: { status: 'PUBLISHED' } } });
    expect(r.errors).toBeUndefined();
  });
});

describe('recipes: admin writes', () => {
  let h: Harness;
  let admin: string;
  beforeEach(async () => {
    h = createHarness();
    admin = await h.signIn('admin');
  });
  afterEach(() => h.dispose());

  const CREATE = `mutation($i: CreateRecipeInput!) { createRecipe(input: $i) {
    id name source status isFeatured priceIdr discountPercent imageUrl description(locale: ID) ingredients { quantity } } }`;
  const valid = {
    name: 'Bubur Ayam',
    description: {
      en: 'Rice porridge with shredded chicken.',
      id: 'Bubur nasi dengan suwiran ayam.',
    },
    imageUrl: 'https://images.example.com/bubur.jpg',
    category: 'FOOD',
    priceIdr: 21_000,
    ingredients: [
      { ingredientId: 'ing_beras', quantity: 80 },
      { ingredientId: 'ing_ayam', quantity: 60 },
    ],
  };

  it('creates a recipe as an unpublished draft by default', async () => {
    const r = await h.run<{ createRecipe: Record<string, unknown> }>(CREATE, {
      token: admin,
      variables: { i: valid },
    });
    expect(r.errors).toBeUndefined();
    expect(r.data?.createRecipe).toMatchObject({
      name: 'Bubur Ayam',
      source: 'USER',
      status: 'DRAFT',
      isFeatured: false,
      discountPercent: 0,
      description: 'Bubur nasi dengan suwiran ayam.',
    });
  });

  it('keeps a new draft off the public menu until it is published', async () => {
    const created = await h.run<{ createRecipe: { id: string } }>(CREATE, {
      token: admin,
      variables: { i: valid },
    });
    const id = created.data!.createRecipe.id;
    expect(
      (await h.run<{ recipe: unknown }>(`{ recipe(id: "${id}") { id } }`)).data?.recipe,
    ).toBeNull();

    await h.run(`mutation { setRecipeStatus(id: "${id}", status: PUBLISHED) { id } }`, {
      token: admin,
    });
    expect(
      (await h.run<{ recipe: { id: string } }>(`{ recipe(id: "${id}") { id } }`)).data?.recipe.id,
    ).toBe(id);
  });

  it.each([
    ['no ingredients', { ingredients: [] }, 'ingredients'],
    [
      'a repeated ingredient',
      {
        ingredients: [
          { ingredientId: 'ing_beras', quantity: 1 },
          { ingredientId: 'ing_beras', quantity: 2 },
        ],
      },
      'ingredients',
    ],
    [
      'a zero quantity',
      { ingredients: [{ ingredientId: 'ing_beras', quantity: 0 }] },
      'ingredients.quantity',
    ],
    ['a price below the minimum', { priceIdr: 500 }, 'priceIdr'],
    ['a discount over 100', { discountPercent: 101 }, 'discountPercent'],
    ['a blank name', { name: '   ' }, 'name'],
    ['an image that is not http(s)', { imageUrl: 'javascript:alert(1)' }, 'imageUrl'],
  ])('rejects %s and names the field', async (_label, patch, field) => {
    const r = await h.run(CREATE, { token: admin, variables: { i: { ...valid, ...patch } } });
    expect(errorCode(r)).toBe('VALIDATION');
    expect(r.errors?.[0]?.extensions['field']).toBe(field);
  });

  it('rejects an ingredient that does not exist', async () => {
    const r = await h.run(CREATE, {
      token: admin,
      variables: {
        i: { ...valid, ingredients: [{ ingredientId: 'ing_unobtainium', quantity: 1 }] },
      },
    });
    expect(errorCode(r)).toBe('NOT_FOUND');
  });

  it('is admin-only: a customer is FORBIDDEN and a guest UNAUTHENTICATED', async () => {
    expect(
      errorCode(
        await h.run(CREATE, { token: await h.signIn('customer'), variables: { i: valid } }),
      ),
    ).toBe('FORBIDDEN');
    expect(errorCode(await h.run(CREATE, { variables: { i: valid } }))).toBe('UNAUTHENTICATED');
  });

  describe('updateRecipe (partial)', () => {
    const UPDATE = `mutation($id: ID!, $i: UpdateRecipeInput!) { updateRecipe(id: $id, input: $i) {
      name priceIdr discountPercent status imageUrl description ingredients { quantity } } }`;

    // The v1 hazard the schema review caught: a full-replace update whose omitted
    // fields reset to defaults would silently unpublish a live recipe.
    it('leaves everything you did not send unchanged, including status and discount', async () => {
      const r = await h.run<{ updateRecipe: Record<string, unknown> }>(UPDATE, {
        token: admin,
        variables: { id: 'rec_rendang', i: { priceIdr: 55_000 } },
      });
      expect(r.data?.updateRecipe).toMatchObject({
        priceIdr: 55_000,
        discountPercent: 20,
        status: 'PUBLISHED',
        name: 'Rendang Daging',
      });
    });

    it('clears a nullable field when it is sent as an explicit null', async () => {
      const r = await h.run<{ updateRecipe: { description: string | null } }>(UPDATE, {
        token: admin,
        variables: { id: 'rec_rendang', i: { description: null } },
      });
      expect(r.data?.updateRecipe.description).toBeNull();
    });

    it('rejects null for a field that cannot be empty', async () => {
      const r = await h.run(UPDATE, {
        token: admin,
        variables: { id: 'rec_rendang', i: { name: null } },
      });
      expect(errorCode(r)).toBe('VALIDATION');
      expect(r.errors?.[0]?.extensions['field']).toBe('name');
    });

    it('replaces the whole ingredient list when one is sent', async () => {
      const r = await h.run<{ updateRecipe: { ingredients: unknown[] } }>(UPDATE, {
        token: admin,
        variables: {
          id: 'rec_klepon',
          i: { ingredients: [{ ingredientId: 'ing_beras', quantity: 50 }] },
        },
      });
      expect(r.data?.updateRecipe.ingredients).toHaveLength(1);
    });

    it('validates changed fields', async () => {
      const r = await h.run(UPDATE, {
        token: admin,
        variables: { id: 'rec_rendang', i: { discountPercent: 150 } },
      });
      expect(errorCode(r)).toBe('VALIDATION');
    });

    it('cannot update a recipe that does not exist', async () => {
      expect(
        errorCode(
          await h.run(UPDATE, { token: admin, variables: { id: 'nope', i: { priceIdr: 5_000 } } }),
        ),
      ).toBe('NOT_FOUND');
    });
  });

  it('archives on delete: it leaves the menu and cannot be deleted twice', async () => {
    const r = await h.run<{ deleteRecipe: { id: string } }>(
      `mutation { deleteRecipe(id: "rec_klepon") { id } }`,
      { token: admin },
    );
    expect(r.data?.deleteRecipe.id).toBe('rec_klepon');
    const list = await h.run<RecipeList>(LIST, { token: admin, variables: { p: { limit: 50 } } });
    expect(list.data?.recipes.items.map((i) => i.id)).not.toContain('rec_klepon');
    expect(
      errorCode(
        await h.run(`mutation { deleteRecipe(id: "rec_klepon") { id } }`, { token: admin }),
      ),
    ).toBe('NOT_FOUND');
  });
});
