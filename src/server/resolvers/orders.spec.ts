import { createHarness, errorCode, type Harness } from '../testing';

interface Line {
  id: string;
  recipeName: string;
  quantity: number;
  note: string | null;
  unitPriceIdr: number;
  lineTotalIdr: number;
}
interface Cart {
  id: string;
  status: string;
  totalIdr: number;
  lines: Line[];
  issues: { kind: string; maxOrderableQuantity: number; line: { id: string } }[];
}

const CART_FIELDS = `
  id status totalIdr
  lines { id recipeName quantity note listPriceIdr discountPercent unitPriceIdr lineTotalIdr }
  issues { kind maxOrderableQuantity line { id } }`;

const ADD = `mutation($i: AddCartLineInput!) { addCartLine(input: $i) { ${CART_FIELDS} } }`;
const UPDATE = `mutation($i: UpdateCartLineInput!) { updateCartLine(input: $i) { ${CART_FIELDS} } }`;
const REMOVE = `mutation($id: ID!) { removeCartLine(lineId: $id) { ${CART_FIELDS} } }`;
const CANCEL = `mutation { cancelCart { ${CART_FIELDS} } }`;
const CART = `{ cart { ${CART_FIELDS} } }`;
const CHECKOUT = `mutation($e: Int) { checkout(expectedTotalIdr: $e) {
  id status totalIdr placedAt
  lines { id recipeName quantity unitPriceIdr lineTotalIdr recipe { id } } } }`;

describe('cart', () => {
  let h: Harness;
  let token: string;
  beforeEach(async () => {
    h = createHarness();
    token = await h.signIn('customer');
  });
  afterEach(() => h.dispose());

  const add = async (recipeId: string, quantity = 1, note?: string): Promise<Cart> => {
    const r = await h.run<{ addCartLine: Cart }>(ADD, {
      token,
      variables: { i: { recipeId, quantity, ...(note === undefined ? {} : { note }) } },
    });
    if (r.errors) throw new Error(JSON.stringify(r.errors));
    return r.data!.addCartLine;
  };

  it('is null for a guest', async () => {
    const r = await h.run<{ cart: unknown }>(CART);
    expect(r.errors).toBeUndefined();
    expect(r.data?.cart).toBeNull();
  });

  it('is an empty, real order for a signed-in user, with a stable id', async () => {
    const r = await h.run<{ cart: Cart }>(CART, { token });
    expect(r.data?.cart).toMatchObject({
      id: 'cart_usr_customer',
      status: 'DRAFT',
      totalIdr: 0,
      lines: [],
      issues: [],
    });
  });

  it('keeps the same id once a line is added, so a client caches one entity', async () => {
    expect((await add('rec_nasi_goreng')).id).toBe('cart_usr_customer');
  });

  it('adds a line and totals it with the discount', async () => {
    const cart = await add('rec_rendang', 2);
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]).toMatchObject({
      recipeName: 'Rendang Daging',
      quantity: 2,
      unitPriceIdr: 41_600,
      lineTotalIdr: 83_200,
    });
    expect(cart.totalIdr).toBe(83_200);
  });

  it('raises the quantity when the same recipe is added again', async () => {
    await add('rec_nasi_goreng', 1);
    const cart = await add('rec_nasi_goreng', 2);
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]?.quantity).toBe(3);
  });

  it('replaces the note when one is supplied and keeps it when not', async () => {
    await add('rec_nasi_goreng', 1, 'no chilli');
    expect((await add('rec_nasi_goreng', 1, 'extra egg')).lines[0]?.note).toBe('extra egg');
    expect((await add('rec_nasi_goreng', 1)).lines[0]?.note).toBe('extra egg');
  });

  it('trims a note and treats a blank one as none', async () => {
    expect((await add('rec_nasi_goreng', 1, '  spicy  ')).lines[0]?.note).toBe('spicy');
    expect((await add('rec_nasi_uduk', 1, '   ')).lines[1]?.note).toBeNull();
  });

  it('rejects a fractional quantity at the schema level, before any resolver runs', async () => {
    const r = await h.run(ADD, {
      token,
      variables: { i: { recipeId: 'rec_nasi_goreng', quantity: 1.5 } },
    });
    expect(r.errors?.[0]?.message).toMatch(/Int/);
  });

  it.each([0, -1, 100])('rejects a quantity of %s', async (quantity) => {
    const r = await h.run(ADD, {
      token,
      variables: { i: { recipeId: 'rec_nasi_goreng', quantity } },
    });
    expect(errorCode(r)).toBe('VALIDATION');
  });

  it('rejects growing one line past 99', async () => {
    await add('rec_nasi_goreng', 99);
    const r = await h.run(ADD, {
      token,
      variables: { i: { recipeId: 'rec_nasi_goreng', quantity: 1 } },
    });
    expect(errorCode(r)).toBe('VALIDATION');
  });

  it('rejects a note over 200 characters', async () => {
    const r = await h.run(ADD, {
      token,
      variables: { i: { recipeId: 'rec_nasi_goreng', note: 'x'.repeat(201) } },
    });
    expect(errorCode(r)).toBe('VALIDATION');
  });

  it('cannot add a recipe that does not exist', async () => {
    const r = await h.run(ADD, { token, variables: { i: { recipeId: 'nope' } } });
    expect(errorCode(r)).toBe('NOT_FOUND');
  });

  it('cannot add an unpublished recipe', async () => {
    const admin = await h.signIn('admin');
    await h.run(`mutation { setRecipeStatus(id: "rec_klepon", status: DRAFT) { id } }`, {
      token: admin,
    });
    const r = await h.run(ADD, { token, variables: { i: { recipeId: 'rec_klepon' } } });
    expect(errorCode(r)).toBe('RECIPE_UNAVAILABLE');
  });

  it('requires signing in for every cart operation', async () => {
    expect(errorCode(await h.run(ADD, { variables: { i: { recipeId: 'rec_nasi_goreng' } } }))).toBe(
      'UNAUTHENTICATED',
    );
    expect(errorCode(await h.run(UPDATE, { variables: { i: { lineId: 'x', quantity: 1 } } }))).toBe(
      'UNAUTHENTICATED',
    );
    expect(errorCode(await h.run(REMOVE, { variables: { id: 'x' } }))).toBe('UNAUTHENTICATED');
    expect(errorCode(await h.run(CANCEL))).toBe('UNAUTHENTICATED');
    expect(errorCode(await h.run(CHECKOUT))).toBe('UNAUTHENTICATED');
  });

  it('gives each user their own cart', async () => {
    await add('rec_nasi_goreng');
    const admin = await h.signIn('admin');
    const r = await h.run<{ cart: Cart }>(CART, { token: admin });
    expect(r.data?.cart.lines).toEqual([]);
    expect(r.data?.cart.id).toBe('cart_usr_admin');
  });

  it('survives across sessions: signing in again shows the same cart', async () => {
    await add('rec_nasi_goreng', 2);
    await h.run(`mutation { signOut }`, { token });
    const again = await h.signIn('customer');
    const r = await h.run<{ cart: Cart }>(CART, { token: again });
    expect(r.data?.cart.lines[0]?.quantity).toBe(2);
  });

  describe('editing lines', () => {
    // The v1 bug: onRemove() always operated on cart[0], whichever item was clicked.
    it('updates the line you name, not the first one', async () => {
      await add('rec_nasi_goreng', 1);
      await add('rec_gado_gado', 1);
      const cart = await add('rec_bakso', 1);
      const [first, second, third] = cart.lines;

      const r = await h.run<{ updateCartLine: Cart }>(UPDATE, {
        token,
        variables: { i: { lineId: second!.id, quantity: 5, note: 'less peanut' } },
      });
      const lines = r.data!.updateCartLine.lines;
      expect(lines.map((l) => l.id)).toEqual([first!.id, second!.id, third!.id]);
      expect(lines[0]).toMatchObject({ quantity: 1, note: null });
      expect(lines[1]).toMatchObject({ quantity: 5, note: 'less peanut' });
      expect(lines[2]).toMatchObject({ quantity: 1, note: null });
    });

    it('removes the line you name and keeps the others in order', async () => {
      await add('rec_nasi_goreng');
      await add('rec_gado_gado');
      const cart = await add('rec_bakso');
      const [first, second, third] = cart.lines;

      const r = await h.run<{ removeCartLine: Cart }>(REMOVE, {
        token,
        variables: { id: second!.id },
      });
      expect(r.data!.removeCartLine.lines.map((l) => l.id)).toEqual([first!.id, third!.id]);
    });

    it('removing the last line leaves an empty cart with the same id', async () => {
      const cart = await add('rec_nasi_goreng');
      const r = await h.run<{ removeCartLine: Cart }>(REMOVE, {
        token,
        variables: { id: cart.lines[0]!.id },
      });
      expect(r.data?.removeCartLine).toMatchObject({
        id: 'cart_usr_customer',
        lines: [],
        totalIdr: 0,
      });
      expect((await h.run<{ cart: Cart }>(CART, { token })).data?.cart.lines).toEqual([]);
    });

    it('clears a note when updated with null', async () => {
      const cart = await add('rec_nasi_goreng', 1, 'no chilli');
      const r = await h.run<{ updateCartLine: Cart }>(UPDATE, {
        token,
        variables: { i: { lineId: cart.lines[0]!.id, quantity: 1, note: null } },
      });
      expect(r.data?.updateCartLine.lines[0]?.note).toBeNull();
    });

    it('cannot touch a line that is not in your cart', async () => {
      expect(
        errorCode(
          await h.run(UPDATE, { token, variables: { i: { lineId: 'line_999', quantity: 1 } } }),
        ),
      ).toBe('NOT_FOUND');
      expect(errorCode(await h.run(REMOVE, { token, variables: { id: 'line_999' } }))).toBe(
        'NOT_FOUND',
      );
    });

    it("cannot edit another user's line", async () => {
      const cart = await add('rec_nasi_goreng');
      const admin = await h.signIn('admin');
      const r = await h.run(UPDATE, {
        token: admin,
        variables: { i: { lineId: cart.lines[0]!.id, quantity: 9 } },
      });
      expect(errorCode(r)).toBe('NOT_FOUND');
    });

    it('validates the new quantity', async () => {
      const cart = await add('rec_nasi_goreng');
      const r = await h.run(UPDATE, {
        token,
        variables: { i: { lineId: cart.lines[0]!.id, quantity: 0 } },
      });
      expect(errorCode(r)).toBe('VALIDATION');
    });

    it('cancels the whole cart', async () => {
      await add('rec_nasi_goreng');
      await add('rec_gado_gado');
      const r = await h.run<{ cancelCart: Cart }>(CANCEL, { token });
      expect(r.data?.cancelCart).toMatchObject({ id: 'cart_usr_customer', lines: [], totalIdr: 0 });
    });
  });

  describe('issues, reported before checkout', () => {
    it('is empty when everything can be made', async () => {
      const cart = await add('rec_nasi_goreng', 2);
      expect(cart.issues).toEqual([]);
    });

    it('reports a line that asks for more than can be made, with how many can', async () => {
      const cart = await add('rec_ikan_bakar', 4); // snapper stock allows 3
      expect(cart.issues).toHaveLength(1);
      expect(cart.issues[0]).toMatchObject({
        kind: 'PARTIALLY_AVAILABLE',
        maxOrderableQuantity: 3,
      });
      expect(cart.issues[0]?.line.id).toBe(cart.lines[0]?.id);
    });

    it('reports a sold-out dish', async () => {
      const cart = await add('rec_rawon', 1);
      expect(cart.issues[0]).toMatchObject({ kind: 'OUT_OF_STOCK', maxOrderableQuantity: 0 });
    });

    it('accounts for stock shared between lines', async () => {
      // Snapper: 750g. Ikan Bakar takes 250g, Pempek 100g. Three of the first use it all.
      await add('rec_ikan_bakar', 3);
      const cart = await add('rec_pempek', 1);
      expect(cart.issues).toHaveLength(1);
      expect(cart.issues[0]?.line.id).toBe(cart.lines[1]?.id);
      expect(cart.issues[0]?.kind).toBe('OUT_OF_STOCK');
    });

    it('reports a recipe an admin unpublished after it was added', async () => {
      await add('rec_klepon', 1);
      const admin = await h.signIn('admin');
      await h.run(`mutation { setRecipeStatus(id: "rec_klepon", status: DRAFT) { id } }`, {
        token: admin,
      });
      const r = await h.run<{ cart: Cart }>(CART, { token });
      expect(r.data?.cart.issues[0]).toMatchObject({
        kind: 'UNPUBLISHED',
        maxOrderableQuantity: 0,
      });
    });

    it('clears once the line is fixed', async () => {
      const cart = await add('rec_ikan_bakar', 4);
      const r = await h.run<{ updateCartLine: Cart }>(UPDATE, {
        token,
        variables: { i: { lineId: cart.lines[0]!.id, quantity: 3 } },
      });
      expect(r.data?.updateCartLine.issues).toEqual([]);
    });

    it('follows live prices while in the cart: an admin price change moves the total', async () => {
      await add('rec_nasi_goreng', 2);
      const admin = await h.signIn('admin');
      await h.run(
        `mutation { updateRecipe(id: "rec_nasi_goreng", input: { priceIdr: 30000 }) { id } }`,
        { token: admin },
      );
      const r = await h.run<{ cart: Cart }>(CART, { token });
      expect(r.data?.cart.totalIdr).toBe(60_000);
    });
  });
});

describe('checkout', () => {
  let h: Harness;
  let token: string;
  let admin: string;
  beforeEach(async () => {
    h = createHarness();
    token = await h.signIn('customer');
    admin = await h.signIn('admin');
  });
  afterEach(() => h.dispose());

  const add = (recipeId: string, quantity = 1, who = token) =>
    h.run(ADD, { token: who, variables: { i: { recipeId, quantity } } });
  const credit = async (who = token): Promise<number> =>
    (await h.run<{ me: { creditIdr: number } }>(`{ me { creditIdr } }`, { token: who })).data!.me
      .creditIdr;
  const stock = async (id: string): Promise<number> =>
    (await (await h.ctx().db()).get('ingredients', id))!.stockQty;

  it('places the order, debits credit and takes stock, all together', async () => {
    await add('rec_nasi_goreng', 2); // 28,000 each
    await add('rec_rendang', 1); //     41,600
    const riceBefore = await stock('ing_beras');

    const r = await h.run<{ checkout: { status: string; totalIdr: number; placedAt: string } }>(
      CHECKOUT,
      { token },
    );
    expect(r.errors).toBeUndefined();
    expect(r.data?.checkout).toMatchObject({
      status: 'PLACED',
      totalIdr: 97_600,
      placedAt: '2026-03-01T09:00:00.000Z',
    });
    expect(await credit()).toBe(250_000 - 97_600);
    // Nasi goreng uses 120g rice x2, rendang 100g.
    expect(await stock('ing_beras')).toBe(riceBefore - 340);
  });

  it('empties the cart afterwards', async () => {
    await add('rec_nasi_goreng');
    await h.run(CHECKOUT, { token });
    const r = await h.run<{ cart: Cart }>(CART, { token });
    expect(r.data?.cart).toMatchObject({ lines: [], totalIdr: 0 });
  });

  it('fails on an empty cart', async () => {
    expect(errorCode(await h.run(CHECKOUT, { token }))).toBe('EMPTY_CART');
  });

  it('fails when a dish is sold out, naming the missing ingredient', async () => {
    await add('rec_rawon');
    const r = await h.run(CHECKOUT, { token });
    expect(errorCode(r)).toBe('INSUFFICIENT_STOCK');
    const shortages = r.errors?.[0]?.extensions['shortages'] as {
      name: string;
      required: number;
      available: number;
    }[];
    expect(shortages).toEqual([
      expect.objectContaining({ name: 'Kluwek', required: 3, available: 0 }),
    ]);
  });

  it('sums need across lines: each line fits alone but together they do not', async () => {
    await add('rec_ikan_bakar', 3); // 750g: all of it
    await add('rec_pempek', 1); //     +100g more
    const r = await h.run(CHECKOUT, { token });
    expect(errorCode(r)).toBe('INSUFFICIENT_STOCK');
    const shortages = r.errors?.[0]?.extensions['shortages'] as {
      ingredientId: string;
      required: number;
      available: number;
    }[];
    expect(shortages[0]).toMatchObject({
      ingredientId: 'ing_ikan_kakap',
      required: 850,
      available: 750,
    });
  });

  it('fails when credit is short, reporting the shortfall', async () => {
    await add('rec_sop_buntut', 4); // 4 x 68,000 = 272,000 against 250,000
    const r = await h.run(CHECKOUT, { token });
    expect(errorCode(r)).toBe('INSUFFICIENT_CREDIT');
    expect(r.errors?.[0]?.extensions).toMatchObject({
      requiredIdr: 272_000,
      availableIdr: 250_000,
      shortfallIdr: 22_000,
    });
  });

  it('succeeds after topping up', async () => {
    await add('rec_sop_buntut', 4);
    expect(errorCode(await h.run(CHECKOUT, { token }))).toBe('INSUFFICIENT_CREDIT');
    await h.run(`mutation { topUpCredit(amountIdr: 50000) { creditIdr } }`, { token });
    expect((await h.run(CHECKOUT, { token })).errors).toBeUndefined();
    expect(await credit()).toBe(300_000 - 272_000);
  });

  it('fails when a recipe was unpublished, naming it', async () => {
    await add('rec_klepon');
    await h.run(`mutation { setRecipeStatus(id: "rec_klepon", status: DRAFT) { id } }`, {
      token: admin,
    });
    const r = await h.run(CHECKOUT, { token });
    expect(errorCode(r)).toBe('RECIPE_UNAVAILABLE');
    expect(r.errors?.[0]?.extensions['recipeId']).toBe('rec_klepon');
  });

  describe('atomicity: a failure changes nothing', () => {
    it('leaves credit, stock and the cart untouched when credit is short', async () => {
      await add('rec_sop_buntut', 4);
      const before = {
        credit: await credit(),
        oxtail: await stock('ing_buntut'),
        rice: await stock('ing_beras'),
      };

      expect(errorCode(await h.run(CHECKOUT, { token }))).toBe('INSUFFICIENT_CREDIT');

      expect(await credit()).toBe(before.credit);
      expect(await stock('ing_buntut')).toBe(before.oxtail);
      expect(await stock('ing_beras')).toBe(before.rice);
      const cart = await h.run<{ cart: Cart }>(CART, { token });
      expect(cart.data?.cart.lines).toHaveLength(1);
      expect(
        (await (await h.ctx().db()).getAll('orders')).filter((o) => o.status === 'PLACED'),
      ).toHaveLength(0);
    });

    it('leaves everything untouched when stock is short, even for lines that would have fit', async () => {
      await add('rec_nasi_goreng', 2); // would fit on its own
      await add('rec_rawon'); //          cannot be made
      const before = {
        credit: await credit(),
        rice: await stock('ing_beras'),
        egg: await stock('ing_telur'),
      };

      expect(errorCode(await h.run(CHECKOUT, { token }))).toBe('INSUFFICIENT_STOCK');

      expect(await credit()).toBe(before.credit);
      expect(await stock('ing_beras')).toBe(before.rice);
      expect(await stock('ing_telur')).toBe(before.egg);
    });

    it('leaves everything untouched on a price mismatch', async () => {
      await add('rec_nasi_goreng', 1);
      const before = await credit();
      const r = await h.run(CHECKOUT, { token, variables: { e: 1 } });
      expect(errorCode(r)).toBe('PRICE_CHANGED');
      expect(await credit()).toBe(before);
    });
  });

  describe('expectedTotalIdr', () => {
    it('proceeds when the total matches what the user saw', async () => {
      await add('rec_nasi_goreng', 1);
      expect((await h.run(CHECKOUT, { token, variables: { e: 28_000 } })).errors).toBeUndefined();
    });

    it('refuses to charge a different total, reporting both', async () => {
      await add('rec_nasi_goreng', 1);
      await h.run(
        `mutation { updateRecipe(id: "rec_nasi_goreng", input: { priceIdr: 31000 }) { id } }`,
        { token: admin },
      );
      const r = await h.run(CHECKOUT, { token, variables: { e: 28_000 } });
      expect(errorCode(r)).toBe('PRICE_CHANGED');
      expect(r.errors?.[0]?.extensions).toMatchObject({ expectedIdr: 28_000, actualIdr: 31_000 });
    });

    it('is optional: omitting it charges the live total', async () => {
      await add('rec_nasi_goreng', 1);
      await h.run(
        `mutation { updateRecipe(id: "rec_nasi_goreng", input: { priceIdr: 31000 }) { id } }`,
        { token: admin },
      );
      const r = await h.run<{ checkout: { totalIdr: number } }>(CHECKOUT, { token });
      expect(r.data?.checkout.totalIdr).toBe(31_000);
    });
  });

  it('places an order only once when checkout is called twice at the same moment', async () => {
    await add('rec_nasi_goreng', 1);
    const [a, b] = await Promise.all([h.run(CHECKOUT, { token }), h.run(CHECKOUT, { token })]);
    const outcomes = [a, b].map((r) => (r.errors ? errorCode(r) : 'ok')).sort();
    expect(outcomes).toEqual(['EMPTY_CART', 'ok']);
    expect(await credit()).toBe(250_000 - 28_000);
    const placed = (await (await h.ctx().db()).getAll('orders')).filter(
      (o) => o.status === 'PLACED',
    );
    expect(placed).toHaveLength(1);
  });

  it('cannot oversell: two customers racing for the last portions get one order between them', async () => {
    // 750g snapper = 3 portions of Ikan Bakar. Each customer wants 2.
    const budi = await h.run<{ signUp: { token: string } }>(
      `mutation($i: SignUpInput!) { signUp(input: $i) { token } }`,
      {
        variables: {
          i: {
            firstName: 'Budi',
            lastName: 'S',
            email: 'budi@example.com',
            password: 'sup3rsecret',
          },
        },
      },
    );
    const budiToken = budi.data!.signUp.token;
    await h.run(`mutation { topUpCredit(amountIdr: 500000) { creditIdr } }`, { token: budiToken });
    await add('rec_ikan_bakar', 2, token);
    await add('rec_ikan_bakar', 2, budiToken);

    const results = await Promise.all([
      h.run(CHECKOUT, { token }),
      h.run(CHECKOUT, { token: budiToken }),
    ]);
    const outcomes = results.map((r) => (r.errors ? errorCode(r) : 'ok')).sort();
    expect(outcomes).toEqual(['INSUFFICIENT_STOCK', 'ok']);
    expect(await stock('ing_ikan_kakap')).toBe(250);
  });

  describe('the placed order is frozen history', () => {
    const HISTORY = `{ orderHistory { totalCount items { id totalIdr lines {
      recipeName recipeImageUrl listPriceIdr discountPercent unitPriceIdr lineTotalIdr recipe { id name } } } } }`;
    interface History {
      orderHistory: {
        totalCount: number;
        items: {
          id: string;
          totalIdr: number;
          lines: { recipeName: string; unitPriceIdr: number; recipe: { name: string } | null }[];
        }[];
      };
    }

    it('keeps the price it was sold at when an admin changes the price', async () => {
      await add('rec_rendang', 1); // 41,600 at 20% off
      await h.run(CHECKOUT, { token });
      await h.run(
        `mutation { updateRecipe(id: "rec_rendang", input: { priceIdr: 90000, discountPercent: 0 }) { id } }`,
        { token: admin },
      );

      const r = await h.run<History>(HISTORY, { token });
      expect(r.data?.orderHistory.items[0]).toMatchObject({ totalIdr: 41_600 });
      expect(r.data?.orderHistory.items[0]?.lines[0]).toMatchObject({
        listPriceIdr: 52_000,
        discountPercent: 20,
        unitPriceIdr: 41_600,
      });
    });

    it('keeps the name it was sold under when an admin renames the dish', async () => {
      await add('rec_rendang', 1);
      await h.run(CHECKOUT, { token });
      await h.run(
        `mutation { updateRecipe(id: "rec_rendang", input: { name: "Rendang Premium" }) { id } }`,
        { token: admin },
      );
      const line = (await h.run<History>(HISTORY, { token })).data?.orderHistory.items[0]?.lines[0];
      expect(line?.recipeName).toBe('Rendang Daging');
      expect(line?.recipe?.name).toBe('Rendang Premium');
    });

    // The schema review caught this: one dangling recipe must not blank the history page.
    it('still renders in full after the recipe is archived; the recipe link is null', async () => {
      await add('rec_rendang', 1);
      await h.run(CHECKOUT, { token });
      await h.run(`mutation { deleteRecipe(id: "rec_rendang") { id } }`, { token: admin });

      const r = await h.run<History>(HISTORY, { token });
      expect(r.errors).toBeUndefined();
      const line = r.data?.orderHistory.items[0]?.lines[0];
      expect(line).toMatchObject({
        recipeName: 'Rendang Daging',
        unitPriceIdr: 41_600,
        recipe: null,
      });
    });
  });
});

describe('order history', () => {
  let h: Harness;
  let customer: string;
  let admin: string;
  beforeEach(async () => {
    h = createHarness();
    customer = await h.signIn('customer');
    admin = await h.signIn('admin');
  });
  afterEach(() => h.dispose());

  const place = async (who: string, recipeId: string) => {
    await h.run(ADD, { token: who, variables: { i: { recipeId, quantity: 1 } } });
    const r = await h.run<{ checkout: { id: string } }>(CHECKOUT, { token: who });
    h.clock.advance(60_000);
    return r.data!.checkout.id;
  };
  const HISTORY = `query($p: PageInput, $f: OrderFilter) { orderHistory(page: $p, filter: $f) {
    totalCount items { id user { email } totalIdr } } }`;
  interface History {
    orderHistory: { totalCount: number; items: { id: string; user: { email: string } }[] };
  }

  it('requires signing in', async () => {
    expect(errorCode(await h.run(HISTORY))).toBe('UNAUTHENTICATED');
  });

  it('shows a customer only their own orders, newest first', async () => {
    const first = await place(customer, 'rec_nasi_goreng');
    const second = await place(customer, 'rec_gado_gado');
    await place(admin, 'rec_bakso');
    const r = await h.run<History>(HISTORY, { token: customer });
    expect(r.data?.orderHistory.items.map((i) => i.id)).toEqual([second, first]);
    expect(r.data?.orderHistory.items.every((i) => i.user.email === 'customer@zettacafe.id')).toBe(
      true,
    );
  });

  it('shows an admin every order', async () => {
    await place(customer, 'rec_nasi_goreng');
    await place(admin, 'rec_bakso');
    const r = await h.run<History>(HISTORY, { token: admin });
    expect(r.data?.orderHistory.totalCount).toBe(2);
  });

  it('lets an admin narrow to their own with mine: true, and ignores it for customers', async () => {
    await place(customer, 'rec_nasi_goreng');
    await place(admin, 'rec_bakso');
    const mine = await h.run<History>(HISTORY, { token: admin, variables: { f: { mine: true } } });
    expect(mine.data?.orderHistory.items.map((i) => i.user.email)).toEqual(['admin@zettacafe.id']);
    const cust = await h.run<History>(HISTORY, {
      token: customer,
      variables: { f: { mine: false } },
    });
    expect(cust.data?.orderHistory.totalCount).toBe(1);
  });

  it('excludes carts', async () => {
    await h.run(ADD, {
      token: customer,
      variables: { i: { recipeId: 'rec_nasi_goreng', quantity: 1 } },
    });
    const r = await h.run<History>(HISTORY, { token: customer });
    expect(r.data?.orderHistory.totalCount).toBe(0);
  });

  it('paginates', async () => {
    for (const id of ['rec_nasi_goreng', 'rec_gado_gado', 'rec_bakso']) await place(customer, id);
    const page = await h.run<History>(HISTORY, {
      token: customer,
      variables: { p: { offset: 2, limit: 2 } },
    });
    expect(page.data?.orderHistory.items).toHaveLength(1);
    expect(page.data?.orderHistory.totalCount).toBe(3);
  });

  describe('order(id)', () => {
    const ORDER = `query($id: ID!) { order(id: $id) { id totalIdr status } }`;

    it('returns your own order', async () => {
      const id = await place(customer, 'rec_nasi_goreng');
      const r = await h.run<{ order: { id: string; status: string } }>(ORDER, {
        token: customer,
        variables: { id },
      });
      expect(r.data?.order).toMatchObject({ id, status: 'PLACED' });
    });

    it("returns null for someone else's order, indistinguishable from one that does not exist", async () => {
      const id = await place(admin, 'rec_bakso');
      const theirs = await h.run<{ order: unknown }>(ORDER, { token: customer, variables: { id } });
      const missing = await h.run<{ order: unknown }>(ORDER, {
        token: customer,
        variables: { id: 'ord_999' },
      });
      expect(theirs.data?.order).toBeNull();
      expect(missing.data?.order).toBeNull();
    });

    it('lets an admin read any placed order', async () => {
      const id = await place(customer, 'rec_nasi_goreng');
      const r = await h.run<{ order: { id: string } }>(ORDER, { token: admin, variables: { id } });
      expect(r.data?.order.id).toBe(id);
    });

    it("does not expose another user's cart", async () => {
      await h.run(ADD, {
        token: customer,
        variables: { i: { recipeId: 'rec_nasi_goreng', quantity: 1 } },
      });
      const r = await h.run<{ order: unknown }>(ORDER, {
        token: admin,
        variables: { id: 'cart_usr_customer' },
      });
      expect(r.data?.order).toBeNull();
    });

    it('resolves your own cart by its id', async () => {
      const r = await h.run<{ order: { id: string; status: string } }>(ORDER, {
        token: customer,
        variables: { id: 'cart_usr_customer' },
      });
      expect(r.data?.order).toMatchObject({ id: 'cart_usr_customer', status: 'DRAFT' });
    });

    it('requires signing in', async () => {
      expect(errorCode(await h.run(ORDER, { variables: { id: 'x' } }))).toBe('UNAUTHENTICATED');
    });
  });
});

describe('finance', () => {
  let h: Harness;
  let customer: string;
  let admin: string;
  beforeEach(async () => {
    h = createHarness();
    customer = await h.signIn('customer');
    admin = await h.signIn('admin');
  });
  afterEach(() => h.dispose());

  const FINANCE = `{ finance { revenueIdr orderCount averageOrderIdr } }`;
  const place = async (who: string, recipeId: string, quantity = 1) => {
    await h.run(ADD, { token: who, variables: { i: { recipeId, quantity } } });
    await h.run(CHECKOUT, { token: who });
  };

  it('is zero before any order', async () => {
    const r = await h.run<{ finance: unknown }>(FINANCE, { token: admin });
    expect(r.data?.finance).toEqual({ revenueIdr: 0, orderCount: 0, averageOrderIdr: 0 });
  });

  it('totals placed orders and averages them', async () => {
    await place(customer, 'rec_nasi_goreng'); // 28,000
    await place(customer, 'rec_gado_gado', 2); // 52,000
    const r = await h.run<{
      finance: { revenueIdr: number; orderCount: number; averageOrderIdr: number };
    }>(FINANCE, {
      token: admin,
    });
    expect(r.data?.finance).toEqual({ revenueIdr: 80_000, orderCount: 2, averageOrderIdr: 40_000 });
  });

  it('does not count carts or failed checkouts', async () => {
    await h.run(ADD, {
      token: customer,
      variables: { i: { recipeId: 'rec_nasi_goreng', quantity: 1 } },
    });
    await h.run(ADD, { token: customer, variables: { i: { recipeId: 'rec_rawon', quantity: 1 } } });
    await h.run(CHECKOUT, { token: customer }); // fails: rawon is sold out
    const r = await h.run<{ finance: { revenueIdr: number } }>(FINANCE, { token: admin });
    expect(r.data?.finance.revenueIdr).toBe(0);
  });

  it('is admin-only', async () => {
    expect(errorCode(await h.run(FINANCE, { token: customer }))).toBe('FORBIDDEN');
    expect(errorCode(await h.run(FINANCE))).toBe('UNAUTHENTICATED');
  });
});
