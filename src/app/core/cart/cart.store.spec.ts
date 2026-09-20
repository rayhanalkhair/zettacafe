import { TestBed } from '@angular/core/testing';
import { gql } from '@apollo/client';
import { Apollo } from 'apollo-angular';
import { DEMO_ACCOUNTS, provideTestApollo } from '../../../testing/apollo';
import { AuthService } from '@core/auth/auth.service';
import { SessionStore } from '@core/auth/session.store';
import { hasErrorCode } from '@core/errors/to-user-message';
import { CartStore } from './cart.store';

const { admin, customer } = DEMO_ACCOUNTS;

interface RecipeRow {
  id: string;
  name: string;
  priceIdr: number;
}

describe('CartStore (against the real in-browser server)', () => {
  let auth: AuthService;
  let cart: CartStore;
  let session: SessionStore;
  let dishes: RecipeRow[];

  /** Lets the effect that follows the signed-in user run, and its load finish. */
  const settle = async (): Promise<void> => {
    TestBed.tick();
    await vi.waitFor(() => expect(cart.isLoading()).toBe(false));
  };

  const signInAs = async (who: { email: string; password: string }): Promise<void> => {
    await auth.signIn(who);
    await settle();
  };

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideTestApollo()] });
    auth = TestBed.inject(AuthService);
    cart = TestBed.inject(CartStore);
    session = TestBed.inject(SessionStore);

    const result = await TestBed.inject(Apollo).client.query({
      query: gql`
        query {
          recipes(filter: { status: PUBLISHED }, page: { limit: 20 }) {
            items {
              id
              name
              priceIdr
              availableServings
            }
          }
        }
      `,
    });
    dishes = (
      result.data as { recipes: { items: (RecipeRow & { availableServings: number })[] } }
    ).recipes.items.filter((d) => d.availableServings >= 5);
    expect(dishes.length).toBeGreaterThanOrEqual(3);
  });

  afterEach(() => localStorage.clear());

  it('is empty and not loading for a guest', () => {
    TestBed.tick();
    expect(cart.isEmpty()).toBe(true);
    expect(cart.isLoading()).toBe(false);
    expect(cart.canCheckout()).toBe(false);
  });

  it('loads the signed-in customer’s cart, empty at first', async () => {
    await signInAs(customer);
    expect(cart.isEmpty()).toBe(true);
    expect(cart.lineCount()).toBe(0);
    expect(cart.totalIdr()).toBe(0);
  });

  it('adds lines and totals them', async () => {
    await signInAs(customer);
    await cart.addLine(dishes[0]!.id, 2);
    await cart.addLine(dishes[1]!.id, 1, 'no chilli');

    expect(cart.lineCount()).toBe(2);
    expect(cart.itemCount()).toBe(3);
    // Prices may carry a discount, so compare against the server's own line totals.
    const [first, second] = cart.lines();
    expect(first!.lineTotalIdr).toBe(first!.unitPriceIdr * 2);
    expect(cart.totalIdr()).toBe(first!.lineTotalIdr + second!.lineTotalIdr);
    expect(second?.note).toBe('no chilli');
  });

  // The v1 bug: removing any line always removed the first one.
  it('removes the line it was given, not the first', async () => {
    await signInAs(customer);
    await cart.addLine(dishes[0]!.id, 1);
    await cart.addLine(dishes[1]!.id, 1);
    await cart.addLine(dishes[2]!.id, 1);
    const [first, second, third] = cart.lines();

    await cart.removeLine(second!.id);

    expect(cart.lines().map((l) => l.id)).toEqual([first!.id, third!.id]);
    expect(cart.totalIdr()).toBe(first!.lineTotalIdr + third!.lineTotalIdr);
  });

  it('edits one line and leaves the others alone', async () => {
    await signInAs(customer);
    await cart.addLine(dishes[0]!.id, 1);
    await cart.addLine(dishes[1]!.id, 1);
    const [first, second] = cart.lines();

    await cart.updateLine(second!.id, 3, 'extra sambal');

    expect(cart.lines().find((l) => l.id === first!.id)?.quantity).toBe(1);
    const edited = cart.lines().find((l) => l.id === second!.id);
    expect([edited?.quantity, edited?.note]).toEqual([3, 'extra sambal']);
  });

  it('empties the cart when cancelled', async () => {
    await signInAs(customer);
    await cart.addLine(dishes[0]!.id, 1);
    await cart.cancel();
    expect(cart.isEmpty()).toBe(true);
  });

  it('is busy while a mutation is in flight and idle afterwards', async () => {
    await signInAs(customer);
    const pending = cart.addLine(dishes[0]!.id, 1);
    expect(cart.isBusy()).toBe(true);
    expect(cart.canCheckout()).toBe(false);
    await pending;
    expect(cart.isBusy()).toBe(false);
  });

  it('clears busy even when the mutation fails', async () => {
    await signInAs(customer);
    await expect(cart.addLine('rec_does_not_exist', 1)).rejects.toBeDefined();
    expect(cart.isBusy()).toBe(false);
  });

  describe('checkout', () => {
    it('can check out when there is something to buy and enough credit', async () => {
      await signInAs(customer);
      await cart.addLine(dishes[0]!.id, 1);
      expect(cart.canCheckout()).toBe(true);
      expect(cart.shortfallIdr()).toBe(0);
    });

    it('places the order, debits credit and starts a fresh cart', async () => {
      await signInAs(customer);
      await cart.addLine(dishes[0]!.id, 2);
      const total = cart.totalIdr();
      const before = session.creditIdr();

      const placed = await cart.checkout();

      expect(placed.totalIdr).toBe(total);
      expect(session.creditIdr()).toBe(before - total);
      expect(cart.isEmpty()).toBe(true);
      expect(cart.isBusy()).toBe(false);
    });

    it('cannot check out an empty cart', async () => {
      await signInAs(customer);
      expect(cart.canCheckout()).toBe(false);
      await expect(cart.checkout()).rejects.toSatisfy((e: unknown) =>
        hasErrorCode(e, 'EMPTY_CART'),
      );
    });

    it('reports the shortfall when credit is not enough, and the server agrees', async () => {
      // A new customer starts with no credit, so anything they order is a shortfall.
      await auth.signUp({
        firstName: 'Putri',
        lastName: 'Lestari',
        email: 'putri@example.com',
        password: 'a-long-password',
      });
      await settle();
      await cart.addLine(dishes[0]!.id, 1);

      expect(cart.canCheckout()).toBe(false);
      expect(cart.shortfallIdr()).toBe(cart.totalIdr());
      await expect(cart.checkout()).rejects.toSatisfy((e: unknown) =>
        hasErrorCode(e, 'INSUFFICIENT_CREDIT'),
      );
      // A refused checkout reloads, so the cart is intact and not stuck busy.
      expect(cart.isBusy()).toBe(false);
      expect(cart.lineCount()).toBe(1);
      expect(session.creditIdr()).toBe(0);
    });
  });

  describe('following the signed-in user', () => {
    it('clears the cart on sign out', async () => {
      await signInAs(customer);
      await cart.addLine(dishes[0]!.id, 1);
      expect(cart.isEmpty()).toBe(false);

      await auth.signOut();
      TestBed.tick();

      expect(cart.isEmpty()).toBe(true);
      expect(cart.isLoading()).toBe(false);
    });

    it('shows nothing of the previous user after switching accounts', async () => {
      await signInAs(customer);
      await cart.addLine(dishes[0]!.id, 1);
      await auth.signOut();
      TestBed.tick();

      await signInAs(admin);
      expect(cart.isEmpty()).toBe(true);
    });

    it('brings the cart back when the same customer signs in again', async () => {
      await signInAs(customer);
      await cart.addLine(dishes[0]!.id, 1);
      await auth.signOut();
      TestBed.tick();

      await signInAs(customer);
      expect(cart.lineCount()).toBe(1);
    });

    it('discards a slow response that arrives after the user has gone', async () => {
      await signInAs(customer);
      await cart.addLine(dishes[0]!.id, 1);
      await auth.signOut();
      TestBed.tick();
      expect(cart.isEmpty()).toBe(true);

      // Sign in and out again immediately: the first load is still in flight.
      await auth.signIn(customer);
      TestBed.tick();
      await auth.signOut();
      TestBed.tick();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(cart.isEmpty()).toBe(true);
      expect(cart.isBusy()).toBe(false);
    });
  });

  describe('loading versus empty', () => {
    it('is loading, not empty-and-idle, until the first cart arrives', async () => {
      await auth.signIn(customer);
      TestBed.tick();
      // The effect has started a load; the screen must not claim "your cart is empty" yet.
      expect(cart.isLoading()).toBe(true);
      await vi.waitFor(() => expect(cart.isLoading()).toBe(false));
      expect(cart.isEmpty()).toBe(true);
    });
  });
});
