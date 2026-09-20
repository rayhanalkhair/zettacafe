import { createHarness, errorCode, type Harness } from '../testing';

interface Ingredient {
  id: string;
  name: string;
  stockQty: number;
  unit: string;
  isAvailable: boolean;
}
interface Page {
  ingredients: { totalCount: number; items: Ingredient[] };
}

const LIST = `query($f: IngredientFilter, $p: PageInput, $s: IngredientSort) {
  ingredients(filter: $f, page: $p, sort: $s) { totalCount items { id name stockQty unit isAvailable } } }`;
const CREATE = `mutation($i: CreateIngredientInput!) { createIngredient(input: $i) { id name stockQty unit isAvailable } }`;
const UPDATE = `mutation($id: ID!, $i: UpdateIngredientInput!) { updateIngredient(id: $id, input: $i) { id name stockQty unit } }`;
const ADJUST = `mutation($id: ID!, $d: Int!) { adjustIngredientStock(id: $id, deltaQty: $d) { stockQty isAvailable } }`;
const DELETE = `mutation($id: ID!) { deleteIngredient(id: $id) { id } }`;

describe('ingredients', () => {
  let h: Harness;
  let admin: string;
  beforeEach(async () => {
    h = createHarness();
    admin = await h.signIn('admin');
  });
  afterEach(() => h.dispose());

  describe('access', () => {
    it('is admin-only: guests are UNAUTHENTICATED and customers FORBIDDEN', async () => {
      const customer = await h.signIn('customer');
      const calls: [string, Record<string, unknown>][] = [
        [LIST, {}],
        [CREATE, { i: { name: 'X', stockQty: 1, unit: 'g' } }],
        [UPDATE, { id: 'ing_beras', i: { stockQty: 1 } }],
        [ADJUST, { id: 'ing_beras', d: 1 }],
        [DELETE, { id: 'ing_kunyit' }],
      ];
      for (const [doc, variables] of calls) {
        expect(errorCode(await h.run(doc, { variables }))).toBe('UNAUTHENTICATED');
        expect(errorCode(await h.run(doc, { token: customer, variables }))).toBe('FORBIDDEN');
      }
    });
  });

  describe('listing', () => {
    it('includes food and drink ingredients and pages them', async () => {
      const r = await h.run<Page>(LIST, { token: admin, variables: { p: { limit: 10 } } });
      expect(r.data?.ingredients.items).toHaveLength(10);
      expect(r.data?.ingredients.totalCount).toBeGreaterThan(47);
    });

    it('searches by name, case-insensitively', async () => {
      const r = await h.run<Page>(LIST, { token: admin, variables: { f: { search: 'CHILLI' } } });
      const names = r.data?.ingredients.items.map((i) => i.name) ?? [];
      expect(names).toEqual(expect.arrayContaining(['Red chilli', 'Bird’s-eye chilli']));
      expect(names.every((n) => n.toLowerCase().includes('chilli'))).toBe(true);
    });

    it('filters to what is out of stock', async () => {
      const r = await h.run<Page>(LIST, {
        token: admin,
        variables: { f: { isAvailable: false }, p: { limit: 50 } },
      });
      expect(r.data?.ingredients.items.map((i) => i.id)).toEqual(['ing_kluwek']);
      expect(r.data?.ingredients.items.every((i) => !i.isAvailable && i.stockQty === 0)).toBe(true);
    });

    it('filters to what is in stock', async () => {
      const r = await h.run<Page>(LIST, {
        token: admin,
        variables: { f: { isAvailable: true }, p: { limit: 50 } },
      });
      expect(r.data?.ingredients.items.every((i) => i.isAvailable && i.stockQty > 0)).toBe(true);
      expect(r.data?.ingredients.items.map((i) => i.id)).not.toContain('ing_kluwek');
    });

    it('sorts by name and by stock, both ways', async () => {
      const byName = await h.run<Page>(LIST, {
        token: admin,
        variables: { s: { field: 'NAME', direction: 'DESC' }, p: { limit: 50 } },
      });
      const names = byName.data?.ingredients.items.map((i) => i.name) ?? [];
      expect(names).toEqual([...names].sort((a, b) => b.localeCompare(a)));

      const byStock = await h.run<Page>(LIST, {
        token: admin,
        variables: { s: { field: 'STOCK', direction: 'ASC' }, p: { limit: 50 } },
      });
      const stock = byStock.data?.ingredients.items.map((i) => i.stockQty) ?? [];
      expect(stock).toEqual([...stock].sort((a, b) => a - b));
      expect(stock[0]).toBe(0);
    });
  });

  describe('createIngredient', () => {
    it('creates one', async () => {
      const r = await h.run<{ createIngredient: Ingredient }>(CREATE, {
        token: admin,
        variables: { i: { name: 'Lime', stockQty: 30, unit: 'pcs' } },
      });
      expect(r.data?.createIngredient).toMatchObject({
        name: 'Lime',
        stockQty: 30,
        unit: 'pcs',
        isAvailable: true,
      });
    });

    it('is not available at zero stock', async () => {
      const r = await h.run<{ createIngredient: Ingredient }>(CREATE, {
        token: admin,
        variables: { i: { name: 'Lime', stockQty: 0, unit: 'pcs' } },
      });
      expect(r.data?.createIngredient.isAvailable).toBe(false);
    });

    it('rejects a duplicate name, ignoring case', async () => {
      const r = await h.run(CREATE, {
        token: admin,
        variables: { i: { name: 'rice', stockQty: 1, unit: 'g' } },
      });
      expect(errorCode(r)).toBe('VALIDATION');
      expect(r.errors?.[0]?.extensions['field']).toBe('name');
    });

    it.each([
      ['a blank name', { name: ' ', stockQty: 1, unit: 'g' }, 'name'],
      ['negative stock', { name: 'Lime', stockQty: -1, unit: 'g' }, 'stockQty'],
      ['stock over the maximum', { name: 'Lime', stockQty: 1_000_001, unit: 'g' }, 'stockQty'],
      ['a blank unit', { name: 'Lime', stockQty: 1, unit: ' ' }, 'unit'],
    ])('rejects %s', async (_label, input, field) => {
      const r = await h.run(CREATE, { token: admin, variables: { i: input } });
      expect(errorCode(r)).toBe('VALIDATION');
      expect(r.errors?.[0]?.extensions['field']).toBe(field);
    });
  });

  describe('updateIngredient (partial)', () => {
    it('changes only what you send', async () => {
      const r = await h.run<{ updateIngredient: Ingredient }>(UPDATE, {
        token: admin,
        variables: { id: 'ing_beras', i: { stockQty: 500 } },
      });
      expect(r.data?.updateIngredient).toMatchObject({ name: 'Rice', unit: 'g', stockQty: 500 });
    });

    it('can rename, but not to a name another ingredient has', async () => {
      const ok = await h.run(UPDATE, {
        token: admin,
        variables: { id: 'ing_beras', i: { name: 'Jasmine rice' } },
      });
      expect(ok.errors).toBeUndefined();
      const clash = await h.run(UPDATE, {
        token: admin,
        variables: { id: 'ing_beras', i: { name: 'chicken' } },
      });
      expect(errorCode(clash)).toBe('VALIDATION');
    });

    it('may keep its own name (not a clash with itself)', async () => {
      const r = await h.run(UPDATE, {
        token: admin,
        variables: { id: 'ing_beras', i: { name: 'Rice', stockQty: 1 } },
      });
      expect(r.errors).toBeUndefined();
    });

    it('cannot update one that does not exist', async () => {
      expect(
        errorCode(
          await h.run(UPDATE, { token: admin, variables: { id: 'nope', i: { stockQty: 1 } } }),
        ),
      ).toBe('NOT_FOUND');
    });
  });

  describe('adjustIngredientStock', () => {
    it('adds and removes stock without resending the rest of the ingredient', async () => {
      const up = await h.run<{ adjustIngredientStock: { stockQty: number } }>(ADJUST, {
        token: admin,
        variables: { id: 'ing_kluwek', d: 12 },
      });
      expect(up.data?.adjustIngredientStock).toEqual({ stockQty: 12, isAvailable: true });
      const down = await h.run<{ adjustIngredientStock: { stockQty: number } }>(ADJUST, {
        token: admin,
        variables: { id: 'ing_kluwek', d: -12 },
      });
      expect(down.data?.adjustIngredientStock).toEqual({ stockQty: 0, isAvailable: false });
    });

    it('refuses to go below zero and leaves the stock as it was', async () => {
      const r = await h.run(ADJUST, { token: admin, variables: { id: 'ing_kluwek', d: -1 } });
      expect(errorCode(r)).toBe('VALIDATION');
      expect((await (await h.ctx().db()).get('ingredients', 'ing_kluwek'))?.stockQty).toBe(0);
    });

    it('refuses to exceed the maximum', async () => {
      const r = await h.run(ADJUST, { token: admin, variables: { id: 'ing_beras', d: 1_000_000 } });
      expect(errorCode(r)).toBe('VALIDATION');
    });

    // A read-modify-write in one transaction: two restocks must both count.
    it('does not lose an update when two restocks arrive at once', async () => {
      const before = (await (await h.ctx().db()).get('ingredients', 'ing_beras'))!.stockQty;
      await Promise.all([
        h.run(ADJUST, { token: admin, variables: { id: 'ing_beras', d: 5 } }),
        h.run(ADJUST, { token: admin, variables: { id: 'ing_beras', d: 7 } }),
      ]);
      expect((await (await h.ctx().db()).get('ingredients', 'ing_beras'))!.stockQty).toBe(
        before + 12,
      );
    });

    it('cannot adjust one that does not exist', async () => {
      expect(
        errorCode(await h.run(ADJUST, { token: admin, variables: { id: 'nope', d: 1 } })),
      ).toBe('NOT_FOUND');
    });
  });

  describe('deleteIngredient', () => {
    it('archives an ingredient nothing uses; it leaves the list', async () => {
      const create = await h.run<{ createIngredient: { id: string } }>(CREATE, {
        token: admin,
        variables: { i: { name: 'Quokka fodder', stockQty: 5, unit: 'pcs' } },
      });
      const id = create.data!.createIngredient.id;
      expect((await h.run(DELETE, { token: admin, variables: { id } })).errors).toBeUndefined();
      const list = await h.run<Page>(LIST, {
        token: admin,
        variables: { f: { search: 'quokka' } },
      });
      expect(list.data?.ingredients.items).toEqual([]);
    });

    it('is blocked while a live recipe uses it, naming the recipes', async () => {
      const r = await h.run(DELETE, { token: admin, variables: { id: 'ing_pandan' } });
      expect(errorCode(r)).toBe('RECIPE_IN_USE');
      const ids = r.errors?.[0]?.extensions['recipeIds'] as string[];
      expect(ids).toEqual(expect.arrayContaining(['rec_es_cendol', 'rec_klepon']));
    });

    it('is allowed once the recipes that used it are archived', async () => {
      // Kunyit is used only by Soto Ayam.
      expect(
        errorCode(await h.run(DELETE, { token: admin, variables: { id: 'ing_kunyit' } })),
      ).toBe('RECIPE_IN_USE');
      await h.run(`mutation { deleteRecipe(id: "rec_soto_ayam") { id } }`, { token: admin });
      expect(
        (await h.run(DELETE, { token: admin, variables: { id: 'ing_kunyit' } })).errors,
      ).toBeUndefined();
    });

    it('cannot be deleted twice', async () => {
      await h.run(`mutation { deleteRecipe(id: "rec_soto_ayam") { id } }`, { token: admin });
      await h.run(DELETE, { token: admin, variables: { id: 'ing_kunyit' } });
      expect(
        errorCode(await h.run(DELETE, { token: admin, variables: { id: 'ing_kunyit' } })),
      ).toBe('NOT_FOUND');
    });

    it('makes a recipe unavailable if its ingredient is archived out from under it', async () => {
      // Archive Soto Ayam's only user of kunyit, then a recipe that still references it would be 0.
      await h.run(`mutation { deleteRecipe(id: "rec_soto_ayam") { id } }`, { token: admin });
      await h.run(DELETE, { token: admin, variables: { id: 'ing_kunyit' } });
      const r = await h.run<Page>(LIST, { token: admin, variables: { f: { search: 'turmeric' } } });
      expect(r.data?.ingredients.items).toEqual([]);
    });
  });
});
