import { TestBed } from '@angular/core/testing';
import { gql } from '@apollo/client';
import { Apollo } from 'apollo-angular';
import { DEMO_ACCOUNTS, provideTestApollo } from '../../../testing/apollo';
import { CheckoutDocument } from '@core/graphql/generated/operations';
import { hasErrorCode } from '@core/errors/to-user-message';
import { StorageKeys } from '@core/storage/local-storage.service';
import { AuthService } from './auth.service';
import { SessionStore } from './session.store';

const { admin, customer } = DEMO_ACCOUNTS;
/** The seeded customer's starting credit (src/server/seed/users.seed.ts). */
const CUSTOMER_CREDIT = 250_000;

describe('AuthService (against the real in-browser server)', () => {
  let auth: AuthService;
  let session: SessionStore;
  let expired: () => void;

  beforeEach(() => {
    localStorage.clear();
    expired = vi.fn<() => void>();
    TestBed.configureTestingModule({
      providers: [provideTestApollo({ onSessionExpired: expired })],
    });
    auth = TestBed.inject(AuthService);
    session = TestBed.inject(SessionStore);
  });

  afterEach(() => localStorage.clear());

  it('signs a customer in and stores the session', async () => {
    await auth.signIn({ email: customer.email, password: customer.password });
    expect(session.isAuthenticated()).toBe(true);
    expect(session.isCustomer()).toBe(true);
    expect(session.user()?.email).toBe(customer.email);
    expect(session.token()).toBeTruthy();
  });

  it('signs an admin in with the admin role', async () => {
    await auth.signIn({ email: admin.email, password: admin.password });
    expect(session.isAdmin()).toBe(true);
    expect(session.isCustomer()).toBe(false);
  });

  // v1 stored the string "undefined" after a failed login and stayed "signed in".
  it('leaves nothing behind after a failed sign in', async () => {
    const attempt = auth.signIn({ email: customer.email, password: 'wrong-password' });
    await expect(attempt).rejects.toSatisfy((e: unknown) => hasErrorCode(e, 'INVALID_CREDENTIALS'));
    TestBed.tick();
    expect(session.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(StorageKeys.session)).toBeNull();
  });

  it('registers a new customer and signs them in', async () => {
    await auth.signUp({
      firstName: 'Putri',
      lastName: 'Lestari',
      email: 'putri@example.com',
      password: 'a-long-password',
    });
    expect(session.isCustomer()).toBe(true);
    expect(session.user()?.creditIdr).toBe(0);
  });

  it('rejects registering an email that is taken', async () => {
    const attempt = auth.signUp({
      firstName: 'A',
      lastName: 'B',
      email: customer.email,
      password: 'a-long-password',
    });
    await expect(attempt).rejects.toSatisfy((e: unknown) => hasErrorCode(e, 'EMAIL_TAKEN'));
    expect(session.isAuthenticated()).toBe(false);
  });

  it('signs out locally and ends the session on the server', async () => {
    await auth.signIn({ email: customer.email, password: customer.password });
    const stale = session.session()!;

    await auth.signOut();
    expect(session.isAuthenticated()).toBe(false);

    // The old token is dead server-side, not merely forgotten.
    session.signIn(stale);
    await auth.refresh();
    expect(session.isAuthenticated()).toBe(false);
  });

  it('does not touch the network when refreshing a guest', async () => {
    const query = vi.spyOn(TestBed.inject(Apollo).client, 'query');
    await auth.refresh();
    expect(query).not.toHaveBeenCalled();
  });

  it('refreshes credit that changed while the tab was closed', async () => {
    await auth.signIn({ email: customer.email, password: customer.password });
    session.patchUser({ creditIdr: 1 });
    await auth.refresh();
    expect(session.creditIdr()).toBe(CUSTOMER_CREDIT);
  });

  it('signs out when the server no longer recognises the token', async () => {
    session.signIn({
      token: 'not-a-real-token',
      user: {
        id: 'x',
        firstName: 'X',
        lastName: 'Y',
        email: 'x@y.id',
        role: 'CUSTOMER',
        creditIdr: 0,
      },
    });
    await auth.refresh();
    expect(session.isAuthenticated()).toBe(false);
  });

  it('adds credit and updates the session', async () => {
    await auth.signIn({ email: customer.email, password: customer.password });
    await auth.topUp(50_000);
    expect(session.creditIdr()).toBe(CUSTOMER_CREDIT + 50_000);
  });

  it('attaches the bearer token to operations', async () => {
    await auth.signIn({ email: admin.email, password: admin.password });
    // `me` returns null for a guest, so a non-null result proves the header arrived.
    const result = await TestBed.inject(Apollo).client.query({
      query: gql`
        query {
          me {
            email
          }
        }
      `,
      fetchPolicy: 'network-only',
    });
    expect((result.data as { me: { email: string } }).me.email).toBe(admin.email);
  });

  it('issues a reset code and resets the password', async () => {
    const issued = await auth.requestPasswordReset(customer.email);
    expect(issued).toBeTruthy();
    await expect(
      auth.resetPassword({
        email: customer.email,
        code: '0000-nope',
        newPassword: 'another-long-one',
      }),
    ).rejects.toSatisfy((e: unknown) => hasErrorCode(e, 'INVALID_RESET_CODE'));
  });

  it('ends a rejected session and reports it, but only for a signed-in user', async () => {
    const apollo = TestBed.inject(Apollo).client;
    const query = () =>
      apollo.mutate({ mutation: CheckoutDocument, variables: { expectedTotalIdr: 0 } });

    // A guest attempting a signed-in action is just an error, not an "expired" session.
    await expect(query()).rejects.toBeDefined();
    expect(expired).not.toHaveBeenCalled();

    session.signIn({
      token: 'revoked-token',
      user: {
        id: 'x',
        firstName: 'X',
        lastName: 'Y',
        email: 'x@y.id',
        role: 'CUSTOMER',
        creditIdr: 0,
      },
    });
    await expect(query()).rejects.toBeDefined();
    expect(expired).toHaveBeenCalledTimes(1);
    expect(session.isAuthenticated()).toBe(false);
  });
});
