import { isObjectType, type GraphQLObjectType } from 'graphql';
import { contextFor, schema } from '../schema';
import { createHarness, errorCode, type Harness } from '../testing';

/**
 * Schema-wide security checks.
 *
 * The important one is the operation table below. Every Query and Mutation in the
 * schema must be listed with an explicit access level; a test fails if an
 * operation exists that is not in the table. Adding an operation therefore forces
 * a conscious decision about who may call it, instead of shipping an unguarded
 * endpoint by omission.
 */

type Access = 'public' | 'user' | 'admin';

const OPS: Record<string, { access: Access; doc: string; variables?: Record<string, unknown> }> = {
  // --- Query ---
  me: { access: 'public', doc: `{ me { id } }` },
  recipes: { access: 'public', doc: `{ recipes { totalCount } }` },
  recipe: { access: 'public', doc: `{ recipe(id: "rec_klepon") { id } }` },
  featuredRecipes: { access: 'public', doc: `{ featuredRecipes { id } }` },
  discountedRecipes: { access: 'public', doc: `{ discountedRecipes { id } }` },
  cart: { access: 'public', doc: `{ cart { id } }` }, // null for a guest, not an error
  ingredients: { access: 'admin', doc: `{ ingredients { totalCount } }` },
  order: { access: 'user', doc: `{ order(id: "ord_1") { id } }` },
  orderHistory: { access: 'user', doc: `{ orderHistory { totalCount } }` },
  finance: { access: 'admin', doc: `{ finance { revenueIdr } }` },

  // --- Mutation ---
  signIn: {
    access: 'public',
    doc: `mutation { signIn(input: { email: "a@b.co", password: "x" }) { token } }`,
  },
  signUp: {
    access: 'public',
    doc: `mutation { signUp(input: { firstName: "A", lastName: "B", email: "new@b.co", password: "12345678" }) { token } }`,
  },
  signOut: { access: 'public', doc: `mutation { signOut }` },
  requestPasswordReset: {
    access: 'public',
    doc: `mutation { requestPasswordReset(email: "a@b.co") { expiresAt } }`,
  },
  resetPassword: {
    access: 'public',
    doc: `mutation { resetPassword(input: { email: "a@b.co", code: "0000", newPassword: "12345678" }) }`,
  },
  topUpCredit: { access: 'user', doc: `mutation { topUpCredit(amountIdr: 5000) { id } }` },
  addCartLine: {
    access: 'user',
    doc: `mutation { addCartLine(input: { recipeId: "rec_klepon" }) { id } }`,
  },
  updateCartLine: {
    access: 'user',
    doc: `mutation { updateCartLine(input: { lineId: "l", quantity: 1 }) { id } }`,
  },
  removeCartLine: { access: 'user', doc: `mutation { removeCartLine(lineId: "l") { id } }` },
  cancelCart: { access: 'user', doc: `mutation { cancelCart { id } }` },
  checkout: { access: 'user', doc: `mutation { checkout { id } }` },
  createRecipe: {
    access: 'admin',
    doc: `mutation { createRecipe(input: { name: "X", category: FOOD, priceIdr: 5000, ingredients: [{ ingredientId: "ing_beras", quantity: 1 }] }) { id } }`,
  },
  updateRecipe: {
    access: 'admin',
    doc: `mutation { updateRecipe(id: "rec_klepon", input: { priceIdr: 5000 }) { id } }`,
  },
  setRecipeStatus: {
    access: 'admin',
    doc: `mutation { setRecipeStatus(id: "rec_klepon", status: DRAFT) { id } }`,
  },
  setRecipeFeatured: {
    access: 'admin',
    doc: `mutation { setRecipeFeatured(id: "rec_klepon", isFeatured: true) { id } }`,
  },
  deleteRecipe: { access: 'admin', doc: `mutation { deleteRecipe(id: "rec_klepon") { id } }` },
  createIngredient: {
    access: 'admin',
    doc: `mutation { createIngredient(input: { name: "X", stockQty: 1, unit: "g" }) { id } }`,
  },
  updateIngredient: {
    access: 'admin',
    doc: `mutation { updateIngredient(id: "ing_beras", input: { stockQty: 1 }) { id } }`,
  },
  adjustIngredientStock: {
    access: 'admin',
    doc: `mutation { adjustIngredientStock(id: "ing_beras", deltaQty: 1) { id } }`,
  },
  deleteIngredient: {
    access: 'admin',
    doc: `mutation { deleteIngredient(id: "ing_kunyit") { id } }`,
  },
};

function operationNames(): string[] {
  const names: string[] = [];
  for (const root of [schema.getQueryType(), schema.getMutationType()]) {
    if (root) names.push(...Object.keys(root.getFields()));
  }
  return names;
}

describe('authorization matrix', () => {
  it('covers every operation in the schema, so none can be added unguarded by accident', () => {
    expect(Object.keys(OPS).sort()).toEqual(operationNames().sort());
  });

  describe('as a guest', () => {
    let h: Harness;
    beforeEach(() => {
      h = createHarness();
    });
    afterEach(() => h.dispose());

    it.each(Object.entries(OPS).filter(([, op]) => op.access !== 'public'))(
      '%s is refused with UNAUTHENTICATED and returns no data',
      async (_name, op) => {
        const r = await h.run<Record<string, unknown>>(op.doc);
        expect(errorCode(r)).toBe('UNAUTHENTICATED');
        expect(Object.values(r.data ?? {}).every((v) => v === null || v === undefined)).toBe(true);
      },
    );
  });

  describe('as a customer', () => {
    let h: Harness;
    let token: string;
    beforeEach(async () => {
      h = createHarness();
      token = await h.signIn('customer');
    });
    afterEach(() => h.dispose());

    it.each(Object.entries(OPS).filter(([, op]) => op.access === 'admin'))(
      '%s is refused with FORBIDDEN',
      async (_name, op) => {
        expect(errorCode(await h.run(op.doc, { token }))).toBe('FORBIDDEN');
      },
    );

    it('changes no data when an admin operation is refused', async () => {
      const db = await h.ctx().db();
      const snapshot = async () =>
        JSON.stringify({
          recipes: await db.getAll('recipes'),
          ingredients: await db.getAll('ingredients'),
        });
      const before = await snapshot();
      for (const op of Object.values(OPS).filter((o) => o.access === 'admin')) {
        await h.run(op.doc, { token });
      }
      expect(await snapshot()).toBe(before);
    });
  });

  describe('as an admin', () => {
    let h: Harness;
    let token: string;
    beforeEach(async () => {
      h = createHarness();
      token = await h.signIn('admin');
    });
    afterEach(() => h.dispose());

    it.each(Object.entries(OPS).filter(([, op]) => op.access === 'admin'))(
      '%s is not refused for authorization reasons',
      async (_name, op) => {
        const code = errorCode(await h.run(op.doc, { token }));
        expect(code).not.toBe('UNAUTHENTICATED');
        expect(code).not.toBe('FORBIDDEN');
      },
    );
  });

  it('lets a guest call every public operation without an authorization error', async () => {
    const h = createHarness();
    for (const [name, op] of Object.entries(OPS).filter(([, o]) => o.access === 'public')) {
      const code = errorCode(await h.run(op.doc));
      expect(code, name).not.toBe('UNAUTHENTICATED');
      expect(code, name).not.toBe('FORBIDDEN');
    }
    await h.dispose();
  });
});

describe('what the schema exposes', () => {
  // Data types only. The root Query and Mutation types hold operation names such as
  // requestPasswordReset, which are verbs, not fields that return a password.
  const roots = new Set([schema.getQueryType()?.name, schema.getMutationType()?.name]);
  const objectTypes = Object.values(schema.getTypeMap()).filter(
    (t): t is GraphQLObjectType =>
      isObjectType(t) && !t.name.startsWith('__') && !roots.has(t.name),
  );

  it('has no output field that could carry a password, hash or secret', () => {
    const suspicious: string[] = [];
    for (const type of objectTypes) {
      for (const name of Object.keys(type.getFields())) {
        if (/password|passwd|hash|secret|salt/i.test(name)) suspicious.push(`${type.name}.${name}`);
      }
    }
    // v1 asked the API to RETURN the password on three operations. Here it cannot.
    expect(suspicious).toEqual([]);
  });

  it('gives User exactly the fields a client should ever see', () => {
    const user = schema.getType('User') as GraphQLObjectType;
    expect(Object.keys(user.getFields()).sort()).toEqual(
      ['creditIdr', 'email', 'firstName', 'id', 'lastName', 'role'].sort(),
    );
  });

  it('cannot select a password through a real query', async () => {
    const h = createHarness();
    const r = await h.run(`{ me { id password } }`);
    expect(r.errors?.[0]?.message).toMatch(/Cannot query field "password"/);
    await h.dispose();
  });

  it('never returns a stored hash from any user-facing response', async () => {
    const h = createHarness();
    const token = await h.signIn('admin');
    const r = await h.run(
      `{ me { id email role creditIdr } orderHistory { items { user { id email role creditIdr } } } }`,
      { token },
    );
    expect(JSON.stringify(r)).not.toMatch(/pbkdf2/);
    await h.dispose();
  });
});

describe('bearer token parsing', () => {
  const op = (authorization?: string) => ({
    getContext: (): { headers?: Record<string, string> } =>
      authorization === undefined ? { headers: {} } : { headers: { authorization } },
  });

  it.each([
    ['Bearer abc123', 'abc123'],
    ['bearer abc123', 'abc123'],
    ['BEARER   abc123', 'abc123'],
  ])('reads %j', (header, token) => {
    expect(contextFor(op(header)).token).toBe(token);
  });

  it.each([[''], ['abc123'], ['Basic abc123'], ['Bearer'], ['Bearer a b']])(
    'treats %j as a guest',
    (header) => {
      expect(contextFor(op(header)).token).toBeNull();
    },
  );

  it('reads a header container with get(), such as Angular HttpHeaders or fetch Headers', () => {
    const headers = new Headers({ Authorization: 'Bearer from-headers' });
    expect(contextFor({ getContext: () => ({ headers }) }).token).toBe('from-headers');
  });

  it('ignores a header container that has no Authorization', () => {
    expect(contextFor({ getContext: () => ({ headers: new Headers() }) }).token).toBeNull();
  });

  it('ignores headers of an unexpected type', () => {
    expect(contextFor({ getContext: () => ({ headers: 'Bearer x' }) }).token).toBeNull();
    expect(contextFor({ getContext: () => ({ headers: 42 }) }).token).toBeNull();
  });

  it('treats a missing header as a guest', () => {
    expect(contextFor(op()).token).toBeNull();
    expect(contextFor({ getContext: () => ({}) }).token).toBeNull();
  });
});
