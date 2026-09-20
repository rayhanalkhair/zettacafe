import { createHarness, errorCode, type Harness } from '../testing';
import { DEMO_ACCOUNTS } from '../seed/users.seed';

const SIGN_IN = `mutation($i: SignInInput!) { signIn(input: $i) { token user { id email role creditIdr } } }`;
const SIGN_UP = `mutation($i: SignUpInput!) { signUp(input: $i) { token user { id firstName lastName email role creditIdr } } }`;
const ME = `{ me { id email role creditIdr } }`;

describe('authentication', () => {
  let h: Harness;
  beforeEach(() => {
    h = createHarness();
  });
  afterEach(() => h.dispose());

  describe('signIn', () => {
    it('returns a token and the user', async () => {
      const r = await h.run<{ signIn: { token: string; user: { role: string } } }>(SIGN_IN, {
        variables: { i: DEMO_ACCOUNTS.customer },
      });
      expect(r.errors).toBeUndefined();
      expect(r.data?.signIn.token).toMatch(/^tok_/);
      expect(r.data?.signIn.user.role).toBe('CUSTOMER');
    });

    it('is case-insensitive on the email', async () => {
      const r = await h.run(SIGN_IN, {
        variables: {
          i: { email: '  CUSTOMER@ZettaCafe.ID ', password: DEMO_ACCOUNTS.customer.password },
        },
      });
      expect(r.errors).toBeUndefined();
    });

    it('rejects a wrong password', async () => {
      const r = await h.run(SIGN_IN, {
        variables: { i: { email: DEMO_ACCOUNTS.customer.email, password: 'not-the-password' } },
      });
      expect(errorCode(r)).toBe('INVALID_CREDENTIALS');
    });

    it('gives an unknown email exactly the same error as a wrong password', async () => {
      const wrong = await h.run(SIGN_IN, {
        variables: { i: { email: DEMO_ACCOUNTS.customer.email, password: 'not-the-password' } },
      });
      const unknown = await h.run(SIGN_IN, {
        variables: { i: { email: 'nobody@example.com', password: 'not-the-password' } },
      });
      expect(errorCode(unknown)).toBe('INVALID_CREDENTIALS');
      expect(unknown.errors?.[0]?.message).toBe(wrong.errors?.[0]?.message);
    });

    it('never stores or returns a password', async () => {
      const r = await h.run<{ signIn: unknown }>(SIGN_IN, {
        variables: { i: DEMO_ACCOUNTS.admin },
      });
      expect(JSON.stringify(r.data)).not.toContain(DEMO_ACCOUNTS.admin.password);
    });
  });

  describe('me and sessions', () => {
    it('is null for a guest', async () => {
      const r = await h.run<{ me: unknown }>(ME);
      expect(r.errors).toBeUndefined();
      expect(r.data?.me).toBeNull();
    });

    it('is null for an unknown token', async () => {
      const r = await h.run<{ me: unknown }>(ME, { token: 'tok_bogus' });
      expect(r.data?.me).toBeNull();
    });

    it('returns the user for a valid token', async () => {
      const token = await h.signIn('admin');
      const r = await h.run<{ me: { email: string; role: string } }>(ME, { token });
      expect(r.data?.me).toMatchObject({ email: DEMO_ACCOUNTS.admin.email, role: 'ADMIN' });
    });

    it('expires the session after its lifetime', async () => {
      const token = await h.signIn('customer');
      h.clock.advance(7 * 24 * 60 * 60 * 1000 + 1);
      const r = await h.run<{ me: unknown }>(ME, { token });
      expect(r.data?.me).toBeNull();
    });

    it('signs out: the token stops working', async () => {
      const token = await h.signIn('customer');
      const out = await h.run<{ signOut: boolean }>(`mutation { signOut }`, { token });
      expect(out.data?.signOut).toBe(true);
      expect((await h.run<{ me: unknown }>(ME, { token })).data?.me).toBeNull();
    });

    it('signing out as a guest is harmless', async () => {
      const r = await h.run<{ signOut: boolean }>(`mutation { signOut }`);
      expect(r.data?.signOut).toBe(true);
    });
  });

  describe('signUp', () => {
    const input = {
      firstName: 'Budi',
      lastName: 'Santoso',
      email: 'budi@example.com',
      password: 'sup3rsecret',
    };

    it('creates a customer with no credit and signs them in', async () => {
      const r = await h.run<{
        signUp: { token: string; user: { role: string; creditIdr: number } };
      }>(SIGN_UP, { variables: { i: input } });
      expect(r.errors).toBeUndefined();
      expect(r.data?.signUp.user).toMatchObject({ role: 'CUSTOMER', creditIdr: 0 });
      const me = await h.run<{ me: { email: string } }>(ME, { token: r.data?.signUp.token });
      expect(me.data?.me.email).toBe('budi@example.com');
    });

    it('cannot choose a role: the input has no such field', async () => {
      const r = await h.run(SIGN_UP, { variables: { i: { ...input, role: 'ADMIN' } } });
      expect(r.errors?.[0]?.message).toMatch(/role/);
    });

    it('lets the new user sign in afterwards with the same password', async () => {
      await h.run(SIGN_UP, { variables: { i: input } });
      const r = await h.run(SIGN_IN, {
        variables: { i: { email: input.email, password: input.password } },
      });
      expect(r.errors).toBeUndefined();
    });

    it('rejects an email that is already registered, ignoring case', async () => {
      const r = await h.run(SIGN_UP, {
        variables: { i: { ...input, email: DEMO_ACCOUNTS.customer.email.toUpperCase() } },
      });
      expect(errorCode(r)).toBe('EMAIL_TAKEN');
    });

    it.each([
      ['a short password', { password: '1234567' }, 'password'],
      ['a malformed email', { email: 'not-an-email' }, 'email'],
      ['a blank first name', { firstName: '   ' }, 'firstName'],
      ['a blank last name', { lastName: '' }, 'lastName'],
    ])('rejects %s and names the field', async (_label, patch, field) => {
      const r = await h.run(SIGN_UP, { variables: { i: { ...input, ...patch } } });
      expect(errorCode(r)).toBe('VALIDATION');
      expect(r.errors?.[0]?.extensions['field']).toBe(field);
    });
  });

  describe('password reset', () => {
    const REQUEST = `mutation($e: String!) { requestPasswordReset(email: $e) { demoCode expiresAt } }`;
    const RESET = `mutation($i: ResetPasswordInput!) { resetPassword(input: $i) }`;
    const email = DEMO_ACCOUNTS.customer.email;

    it('returns a four-digit demo code and an expiry', async () => {
      const r = await h.run<{ requestPasswordReset: { demoCode: string; expiresAt: string } }>(
        REQUEST,
        {
          variables: { e: email },
        },
      );
      expect(r.data?.requestPasswordReset.demoCode).toBe('1234');
      expect(r.data?.requestPasswordReset.expiresAt).toBe('2026-03-01T09:15:00.000Z');
    });

    it('answers an unknown email the same way, so accounts cannot be enumerated', async () => {
      const known = await h.run<{ requestPasswordReset: { demoCode: string } }>(REQUEST, {
        variables: { e: email },
      });
      const unknown = await h.run<{ requestPasswordReset: { demoCode: string } }>(REQUEST, {
        variables: { e: 'nobody@example.com' },
      });
      expect(unknown.errors).toBeUndefined();
      expect(Object.keys(unknown.data?.requestPasswordReset ?? {})).toEqual(
        Object.keys(known.data?.requestPasswordReset ?? {}),
      );
    });

    it('does not let an unknown email be reset with the code it was shown', async () => {
      await h.run(REQUEST, { variables: { e: 'nobody@example.com' } });
      const r = await h.run(RESET, {
        variables: {
          i: { email: 'nobody@example.com', code: '1234', newPassword: 'brand-new-pass' },
        },
      });
      expect(errorCode(r)).toBe('INVALID_RESET_CODE');
    });

    it('withholds the code when the mailer is real (exposeResetCode off)', async () => {
      const real = createHarness({ config: { pbkdf2Iterations: 1000, exposeResetCode: false } });
      const r = await real.run<{ requestPasswordReset: { demoCode: string | null } }>(REQUEST, {
        variables: { e: email },
      });
      expect(r.data?.requestPasswordReset.demoCode).toBeNull();
      await real.dispose();
    });

    it('resets the password: the new one works and the old one does not', async () => {
      await h.run(REQUEST, { variables: { e: email } });
      const reset = await h.run(RESET, {
        variables: { i: { email, code: '1234', newPassword: 'brand-new-pass' } },
      });
      expect(reset.errors).toBeUndefined();

      const fresh = await h.run(SIGN_IN, {
        variables: { i: { email, password: 'brand-new-pass' } },
      });
      expect(fresh.errors).toBeUndefined();
      const old = await h.run(SIGN_IN, {
        variables: { i: { email, password: DEMO_ACCOUNTS.customer.password } },
      });
      expect(errorCode(old)).toBe('INVALID_CREDENTIALS');
    });

    it('signs the account out everywhere', async () => {
      const token = await h.signIn('customer');
      await h.run(REQUEST, { variables: { e: email } });
      await h.run(RESET, {
        variables: { i: { email, code: '1234', newPassword: 'brand-new-pass' } },
      });
      expect((await h.run<{ me: unknown }>(ME, { token })).data?.me).toBeNull();
    });

    it('rejects a wrong code', async () => {
      await h.run(REQUEST, { variables: { e: email } });
      const r = await h.run(RESET, {
        variables: { i: { email, code: '9999', newPassword: 'brand-new-pass' } },
      });
      expect(errorCode(r)).toBe('INVALID_RESET_CODE');
    });

    it('rejects an expired code', async () => {
      await h.run(REQUEST, { variables: { e: email } });
      h.clock.advance(15 * 60 * 1000 + 1);
      const r = await h.run(RESET, {
        variables: { i: { email, code: '1234', newPassword: 'brand-new-pass' } },
      });
      expect(errorCode(r)).toBe('INVALID_RESET_CODE');
    });

    it('makes a code single-use', async () => {
      await h.run(REQUEST, { variables: { e: email } });
      const input = { email, code: '1234', newPassword: 'brand-new-pass' };
      expect((await h.run(RESET, { variables: { i: input } })).errors).toBeUndefined();
      expect(
        errorCode(
          await h.run(RESET, { variables: { i: { ...input, newPassword: 'another-pass-1' } } }),
        ),
      ).toBe('INVALID_RESET_CODE');
    });

    it('rejects a weak new password before touching the code', async () => {
      await h.run(REQUEST, { variables: { e: email } });
      const r = await h.run(RESET, {
        variables: { i: { email, code: '1234', newPassword: 'short' } },
      });
      expect(errorCode(r)).toBe('VALIDATION');
      const ok = await h.run(RESET, {
        variables: { i: { email, code: '1234', newPassword: 'long-enough-1' } },
      });
      expect(ok.errors).toBeUndefined();
    });
  });

  describe('topUpCredit', () => {
    const TOP_UP = `mutation($a: Int!) { topUpCredit(amountIdr: $a) { creditIdr } }`;

    it('requires signing in', async () => {
      expect(errorCode(await h.run(TOP_UP, { variables: { a: 50_000 } }))).toBe('UNAUTHENTICATED');
    });

    it('adds to the balance', async () => {
      const token = await h.signIn('customer');
      const r = await h.run<{ topUpCredit: { creditIdr: number } }>(TOP_UP, {
        token,
        variables: { a: 50_000 },
      });
      expect(r.data?.topUpCredit.creditIdr).toBe(300_000);
    });

    it('accumulates across top-ups', async () => {
      const token = await h.signIn('customer');
      await h.run(TOP_UP, { token, variables: { a: 10_000 } });
      const r = await h.run<{ topUpCredit: { creditIdr: number } }>(TOP_UP, {
        token,
        variables: { a: 20_000 },
      });
      expect(r.data?.topUpCredit.creditIdr).toBe(280_000);
    });

    it.each([0, -5_000, 999, 10_000_001, 1_500.5])('rejects %s', async (amount) => {
      const token = await h.signIn('customer');
      const r = await h.run(TOP_UP, { token, variables: { a: amount } });
      expect(r.errors).toBeDefined();
    });

    it('accepts the limits exactly', async () => {
      const token = await h.signIn('customer');
      expect((await h.run(TOP_UP, { token, variables: { a: 1_000 } })).errors).toBeUndefined();
      expect((await h.run(TOP_UP, { token, variables: { a: 10_000_000 } })).errors).toBeUndefined();
    });
  });
});
