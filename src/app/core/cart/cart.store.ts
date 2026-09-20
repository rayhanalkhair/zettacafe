import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { SessionStore } from '@core/auth/session.store';
import {
  AddCartLineDocument,
  CancelCartDocument,
  CartDocument,
  CheckoutDocument,
  RemoveCartLineDocument,
  UpdateCartLineDocument,
  type CartFieldsFragment,
  type CheckoutMutation,
} from '@core/graphql/generated/operations';
import { errorCodeOf } from '@core/errors/to-user-message';

export type CartStatus = 'idle' | 'loading' | 'mutating';

export type Cart = CartFieldsFragment;
export type PlacedOrder = CheckoutMutation['checkout'];

/**
 * The signed-in user's cart.
 *
 * It replaces v1's component state (`cart`, `isLoading`) re-fetched by hand from
 * eight different methods. Loading and empty are now mutually exclusive states of
 * one store, which is what fixes v1's two defects: the only spinner in the app
 * could never render (`isLoading = 'on'`, a truthy string, behind an inverted
 * `*ngIf`), and an empty-cart screen flashed on every load before data arrived.
 *
 * Every line operation takes the LINE's id. v1's remove always operated on the
 * first cart entry whichever item was clicked; an id, not an index or an object,
 * makes that mistake inexpressible.
 */
@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly apollo = inject(Apollo);
  private readonly session = inject(SessionStore);

  private readonly cartState = signal<Cart | null>(null);
  private readonly statusState = signal<CartStatus>('loading');
  /** Bumped on every reset so a slow response for a previous user is discarded. */
  private generation = 0;

  readonly cart = this.cartState.asReadonly();
  readonly status = this.statusState.asReadonly();

  readonly lines = computed(() => this.cartState()?.lines ?? []);
  readonly lineCount = computed(() => this.lines().length);
  readonly itemCount = computed(() => this.lines().reduce((n, line) => n + line.quantity, 0));
  readonly totalIdr = computed(() => this.cartState()?.totalIdr ?? 0);
  readonly issues = computed(() => this.cartState()?.issues ?? []);

  readonly isEmpty = computed(() => this.lineCount() === 0);
  /** A real boolean. True only until the first cart for this user has arrived. */
  readonly isLoading = computed(() => this.statusState() === 'loading');
  readonly isBusy = computed(() => this.statusState() !== 'idle');
  readonly hasIssues = computed(() => this.issues().length > 0);

  /** True when checkout can be attempted: something to buy, nothing blocking, enough credit. */
  readonly canCheckout = computed(
    () =>
      !this.isEmpty() &&
      !this.isBusy() &&
      !this.hasIssues() &&
      this.totalIdr() <= this.session.creditIdr(),
  );
  readonly shortfallIdr = computed(() => Math.max(0, this.totalIdr() - this.session.creditIdr()));

  constructor() {
    // A cart belongs to a person. Loading follows the signed-in user's id, so
    // signing out clears it and switching accounts loads the new one.
    effect(() => {
      const userId = this.session.user()?.id ?? null;
      untracked(() => {
        if (userId) void this.load().catch(() => undefined);
        else this.reset();
      });
    });
  }

  async load(): Promise<void> {
    const generation = this.generation;
    this.statusState.set('loading');
    try {
      const result = await this.apollo.client.query({
        query: CartDocument,
        fetchPolicy: 'network-only',
        errorPolicy: 'none',
      });
      if (generation !== this.generation) return;
      this.cartState.set(result.data?.cart ?? null);
    } finally {
      if (generation === this.generation) this.statusState.set('idle');
    }
  }

  addLine(recipeId: string, quantity = 1, note?: string | null): Promise<void> {
    return this.mutate(async () => {
      const result = await this.apollo.client.mutate({
        mutation: AddCartLineDocument,
        variables: { input: { recipeId, quantity, note: note ?? null } },
        errorPolicy: 'none',
      });
      return result.data?.addCartLine ?? null;
    });
  }

  updateLine(lineId: string, quantity: number, note: string | null): Promise<void> {
    return this.mutate(async () => {
      const result = await this.apollo.client.mutate({
        mutation: UpdateCartLineDocument,
        variables: { input: { lineId, quantity, note } },
        errorPolicy: 'none',
      });
      return result.data?.updateCartLine ?? null;
    });
  }

  removeLine(lineId: string): Promise<void> {
    return this.mutate(async () => {
      const result = await this.apollo.client.mutate({
        mutation: RemoveCartLineDocument,
        variables: { lineId },
        errorPolicy: 'none',
      });
      return result.data?.removeCartLine ?? null;
    });
  }

  cancel(): Promise<void> {
    return this.mutate(async () => {
      const result = await this.apollo.client.mutate({
        mutation: CancelCartDocument,
        errorPolicy: 'none',
      });
      return result.data?.cancelCart ?? null;
    });
  }

  /**
   * Places the order and returns it. It sends the total the user is looking at,
   * so a price that moved meanwhile fails with PRICE_CHANGED instead of charging
   * something they never saw. After ANY failure the cart is reloaded, so the
   * screen shows the server's current issues and totals rather than stale ones.
   */
  async checkout(): Promise<PlacedOrder> {
    this.statusState.set('mutating');
    const generation = this.generation;
    try {
      const result = await this.apollo.client.mutate({
        mutation: CheckoutDocument,
        variables: { expectedTotalIdr: this.totalIdr() },
        errorPolicy: 'none',
      });
      const placed = result.data?.checkout;
      if (!placed) throw new Error('The server returned no order.');
      if (generation === this.generation) {
        this.session.patchUser({ creditIdr: placed.user.creditIdr });
        this.cartState.set(null);
        this.statusState.set('idle');
        await this.load();
      }
      return placed;
    } catch (error) {
      // The server refused, so its state is what is true now. Reload it.
      if (errorCodeOf(error) !== 'UNAUTHENTICATED') await this.load().catch(() => undefined);
      throw error;
    } finally {
      if (this.statusState() === 'mutating') this.statusState.set('idle');
    }
  }

  /** Runs one line mutation: marks the store busy, applies the returned cart, always clears busy. */
  private async mutate(run: () => Promise<Cart | null>): Promise<void> {
    const generation = this.generation;
    this.statusState.set('mutating');
    try {
      const cart = await run();
      if (generation === this.generation && cart) this.cartState.set(cart);
    } finally {
      if (generation === this.generation) this.statusState.set('idle');
    }
  }

  private reset(): void {
    this.generation++;
    this.cartState.set(null);
    // A guest has no cart to wait for, so nothing is loading.
    this.statusState.set('idle');
  }
}
