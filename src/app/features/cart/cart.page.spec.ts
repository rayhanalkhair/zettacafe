import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '@core/auth/auth.service';
import { authGuard } from '@core/auth/guards';
import { SessionStore } from '@core/auth/session.store';
import { CartStore } from '@core/cart/cart.store';
import { AddCartLineDocument, CheckoutDocument } from '@core/graphql/generated/operations';
import { expectNoAxeViolations } from '../../../testing/a11y';
import { DEMO_ACCOUNTS } from '../../../testing/apollo';
import {
  asAdmin,
  confirmation,
  fill,
  findDish,
  Placeholder,
  renderRoute,
} from '../../../testing/app-harness';
import { CartPage } from './cart.page';

const routes = [
  { path: 'cart', component: CartPage, canActivate: [authGuard] },
  { path: 'login', component: Placeholder },
  { path: 'menu', component: Placeholder },
  { path: 'orders', component: Placeholder },
];

type Page = Awaited<ReturnType<typeof renderRoute>>;

const text = (el: Element) => el.textContent.replace(/\s+/g, ' ');
const lines = (page: Page) => Array.from(page.el.querySelectorAll('.line'));
const lineNames = (page: Page) => lines(page).map((l) => l.querySelector('.name')?.textContent);
const button = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('button')).find((b) =>
    b.textContent.includes(label),
  ) as HTMLButtonElement;

/**
 * The buttons of the open confirmation: [0] is Cancel, [1] confirms. Waits until the
 * dialog has finished opening (Material marks the container `mdc-dialog--open`), so a
 * click is not lost to an element that is still being set up.
 */
/**
 * Renders the cart for the signed-in customer with the given dishes already in it.
 * `[name, quantity, note]`; `'all'` means every serving that can be made.
 */
async function openCart(items: [string, number | 'all', string?][] = []): Promise<Page> {
  const page = await renderRoute('/', routes);
  await TestBed.inject(AuthService).signIn(DEMO_ACCOUNTS.customer);
  const cart = TestBed.inject(CartStore);
  TestBed.tick();
  await vi.waitFor(() => expect(cart.isLoading()).toBe(false));
  for (const [name, quantity, note] of items) {
    const dish = await findDish(name);
    await cart.addLine(
      dish.id,
      quantity === 'all' ? dish.availableServings : quantity,
      note ?? null,
    );
  }
  await page.harness.navigateByUrl('/cart');
  await page.harness.fixture.whenStable();
  return { ...page, el: page.harness.routeNativeElement as HTMLElement };
}

describe('CartPage', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    localStorage.clear();
  });

  it('sends a guest to sign in and back afterwards', async () => {
    const page = await renderRoute('/cart', routes);
    expect(page.router.url).toBe('/login?returnUrl=%2Fcart');
  });

  describe('when empty', () => {
    it('says so and points to the menu', async () => {
      const page = await openCart();
      await vi.waitFor(() => expect(text(page.el)).toContain('Your cart is empty'));
      expect(
        Array.from(page.el.querySelectorAll('a')).find((a) => a.getAttribute('href') === '/menu'),
      ).toBeDefined();
      expect(button(page.el, 'Place order')).toBeUndefined();
    });

    it('has no accessibility violations', async () => {
      const page = await openCart();
      await vi.waitFor(() => expect(text(page.el)).toContain('Your cart is empty'));
      await expectNoAxeViolations(page.el);
    });
  });

  describe('with dishes', () => {
    const three: [string, number, string?][] = [
      ['Rendang', 1, 'no chilli'],
      ['Nasi Goreng', 2],
      ['Soto', 1],
    ];

    it('lists each line with its note and total, and totals them', async () => {
      const page = await openCart(three);
      await vi.waitFor(() => expect(lines(page)).toHaveLength(3));
      expect(text(lines(page)[0]!)).toContain('no chilli');

      const cart = TestBed.inject(CartStore);
      expect(text(page.el.querySelector('.grand')!)).toContain(
        `Rp ${cart.totalIdr().toLocaleString('en-US')}`,
      );
      expect(text(page.el.querySelector('.summary')!)).toContain('Rp 250,000');
    });

    it('has no accessibility violations', async () => {
      const page = await openCart(three);
      await vi.waitFor(() => expect(lines(page)).toHaveLength(3));
      await expectNoAxeViolations(page.el);
    });

    it('names the dish on every action, since "Edit" alone is ambiguous', async () => {
      const page = await openCart(three);
      await vi.waitFor(() => expect(lines(page)).toHaveLength(3));
      const labels = Array.from(lines(page)[1]!.querySelectorAll('button')).map((b) =>
        b.getAttribute('aria-label'),
      );
      expect(labels[0]).toMatch(/^Edit .+/);
      expect(labels[1]).toMatch(/^Remove .+ from your cart$/);
    });

    describe('removing', () => {
      // The v1 bug: removing any line always removed the first one.
      it('removes the line that was clicked, not the first', async () => {
        const page = await openCart(three);
        await vi.waitFor(() => expect(lines(page)).toHaveLength(3));
        const [first, second, third] = lineNames(page);

        (lines(page)[1]!.querySelectorAll('button')[1] as HTMLButtonElement).click();
        const [, confirm] = await confirmation();
        confirm!.click();

        await vi.waitFor(() => expect(lines(page)).toHaveLength(2));
        expect(lineNames(page)).toEqual([first, third]);
        expect(lineNames(page)).not.toContain(second);
      });

      it('asks first, and cancelling keeps everything', async () => {
        const page = await openCart(three);
        await vi.waitFor(() => expect(lines(page)).toHaveLength(3));
        (lines(page)[0]!.querySelectorAll('button')[1] as HTMLButtonElement).click();
        const [cancel] = await confirmation();
        expect(document.querySelector('zc-confirm-dialog')?.textContent).toContain('Remove');
        cancel!.click();
        await vi.waitFor(() => expect(document.querySelector('zc-confirm-dialog')).toBeNull());
        expect(lines(page)).toHaveLength(3);
      });
    });

    describe('editing', () => {
      it('changes the servings of that line only', async () => {
        const page = await openCart(three);
        await vi.waitFor(() => expect(lines(page)).toHaveLength(3));
        const cart = TestBed.inject(CartStore);
        const [first, second, third] = cart.lines();

        (lines(page)[1]!.querySelectorAll('button')[0] as HTMLButtonElement).click();
        await vi.waitFor(() =>
          expect(document.querySelector('zc-add-to-cart-dialog h2')?.textContent).toBe(
            'Change your order',
          ),
        );
        const dialog = document.querySelector('zc-add-to-cart-dialog') as HTMLElement;
        await vi.waitFor(() =>
          expect(dialog.querySelector('label')?.textContent).toContain('Servings'),
        );
        expect(dialog.querySelector<HTMLInputElement>('input[type="number"]')?.value).toBe('2');

        fill(dialog, 'Servings', '3');
        dialog.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();

        await vi.waitFor(() => expect(cart.lines()[1]?.quantity).toBe(3));
        expect(cart.lines()[0]).toMatchObject({ id: first!.id, quantity: first!.quantity });
        expect(cart.lines()[2]).toMatchObject({ id: third!.id, quantity: third!.quantity });
        expect(cart.lines()[1]?.id).toBe(second!.id);
      });
    });

    describe('emptying', () => {
      it('asks first, then empties the cart', async () => {
        const page = await openCart(three);
        await vi.waitFor(() => expect(lines(page)).toHaveLength(3));
        button(page.el, 'Empty the cart').click();
        const [, confirm] = await confirmation();
        confirm!.click();
        await vi.waitFor(() => expect(text(page.el)).toContain('Your cart is empty'));
        expect(TestBed.inject(CartStore).isEmpty()).toBe(true);
      });
    });
  });

  describe('credit', () => {
    it('reports the shortfall, offers to top up, and will not check out', async () => {
      // Eight rendang cost more than the customer's Rp 250,000.
      const page = await openCart([['Rendang', 8]]);
      await vi.waitFor(() => expect(lines(page)).toHaveLength(1));

      const hint = page.el.querySelector('#checkout-hint')!;
      expect(hint.textContent).toMatch(/short by Rp [\d,]+/);
      const checkout = button(page.el, 'Place order');
      expect(checkout.disabled).toBe(true);
      expect(checkout.getAttribute('aria-describedby')).toBe('checkout-hint');

      button(page.el, 'Add credit').click();
      await vi.waitFor(() => expect(document.querySelector('zc-top-up-dialog')).not.toBeNull());
    });
  });

  describe('problems with a line', () => {
    /** Someone else buys most of a dish after it was put in this cart. */
    async function stockRunsLow(): Promise<{ page: Page; left: number }> {
      const page = await openCart([['Rendang', 'all']]);
      // Enough credit that the only problem is stock, not money.
      await TestBed.inject(AuthService).topUp(10_000_000);
      const rendang = await findDish('Rendang');
      const bought = 10;
      await asAdmin(AddCartLineDocument, { input: { recipeId: rendang.id, quantity: bought } });
      await asAdmin(CheckoutDocument, {});
      await TestBed.inject(CartStore).load();
      return { page, left: rendang.availableServings - bought };
    }

    it('flags a dish that can only be partly made, and blocks checkout', async () => {
      const { page, left } = await stockRunsLow();
      await vi.waitFor(() => expect(text(page.el)).toContain(`Only ${left} can be made`));
      expect(page.el.querySelector('[role="status"].attention')).not.toBeNull();
      expect(button(page.el, 'Place order').disabled).toBe(true);
      expect(text(page.el)).toContain('Fix the marked items');
    });

    it('fits the line to what can be made, which clears the problem', async () => {
      const { page, left } = await stockRunsLow();
      await vi.waitFor(() => expect(text(page.el)).toContain(`Order ${left} instead`));
      button(page.el, `Order ${left} instead`).click();

      await vi.waitFor(() => expect(text(page.el)).not.toContain('can be made'));
      const cart = TestBed.inject(CartStore);
      expect(cart.lines()[0]?.quantity).toBe(left);
      expect(cart.hasIssues()).toBe(false);
    });
  });

  describe('checkout', () => {
    it('asks first, and cancelling places nothing', async () => {
      const page = await openCart([['Nasi Goreng', 1]]);
      await vi.waitFor(() => expect(lines(page)).toHaveLength(1));
      const before = TestBed.inject(SessionStore).creditIdr();

      button(page.el, 'Place order').click();
      const [cancel] = await confirmation();
      expect(document.querySelector('zc-confirm-dialog')?.textContent).toMatch(
        /Rp [\d,]+ will be taken/,
      );
      cancel!.click();
      await vi.waitFor(() => expect(document.querySelector('zc-confirm-dialog')).toBeNull());

      expect(TestBed.inject(SessionStore).creditIdr()).toBe(before);
      expect(lines(page)).toHaveLength(1);
    });

    it('places the order, debits the credit, shows the receipt and empties the cart', async () => {
      const page = await openCart([
        ['Nasi Goreng', 2],
        ['Soto', 1],
      ]);
      await vi.waitFor(() => expect(lines(page)).toHaveLength(2));
      const session = TestBed.inject(SessionStore);
      const cart = TestBed.inject(CartStore);
      const total = cart.totalIdr();
      const before = session.creditIdr();

      button(page.el, 'Place order').click();
      const [, confirm] = await confirmation();
      confirm!.click();

      await vi.waitFor(() => expect(text(page.el)).toContain('Order placed'));
      expect(text(page.el)).toContain(`Rp ${total.toLocaleString('en-US')}`);
      expect(page.el.querySelectorAll('.receipt li')).toHaveLength(2);
      expect(session.creditIdr()).toBe(before - total);
      expect(cart.isEmpty()).toBe(true);
      expect(
        Array.from(page.el.querySelectorAll('a')).find((a) => a.getAttribute('href') === '/orders'),
      ).toBeDefined();
    });
  });
});
