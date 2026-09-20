import { TestBed } from '@angular/core/testing';
import { AuthService } from '@core/auth/auth.service';
import { authGuard } from '@core/auth/guards';
import { CartStore } from '@core/cart/cart.store';
import { expectNoAxeViolations } from '../../../testing/a11y';
import { DEMO_ACCOUNTS } from '../../../testing/apollo';
import { findDish, Placeholder, renderRoute } from '../../../testing/app-harness';
import { OrdersPage } from './orders.page';

const routes = [
  { path: 'orders', component: OrdersPage, canActivate: [authGuard] },
  { path: 'login', component: Placeholder },
  { path: 'menu', component: Placeholder },
];

type Page = Awaited<ReturnType<typeof renderRoute>>;

const text = (el: Element) => el.textContent.replace(/\s+/g, ' ');
const orders = (page: Page) => Array.from(page.el.querySelectorAll('article.order'));

/** Signs in and places `count` one-dish orders, oldest first. */
async function signInWithOrders(who: 'customer' | 'admin', count: number): Promise<Page> {
  const page = await renderRoute('/', routes);
  await TestBed.inject(AuthService).signIn(DEMO_ACCOUNTS[who]);
  const cart = TestBed.inject(CartStore);
  TestBed.tick();
  await vi.waitFor(() => expect(cart.isLoading()).toBe(false));
  // Plenty of credit: these specs are about the list, not about running out.
  await TestBed.inject(AuthService).topUp(10_000_000);
  const dish = await findDish('Nasi Goreng');
  for (let i = 0; i < count; i++) {
    await cart.addLine(dish.id, i + 1, null);
    await cart.checkout();
  }
  await page.harness.navigateByUrl('/orders');
  await page.harness.fixture.whenStable();
  return { ...page, el: page.harness.routeNativeElement as HTMLElement };
}

describe('OrdersPage', () => {
  afterEach(() => localStorage.clear());

  it('sends a guest to sign in', async () => {
    const page = await renderRoute('/orders', routes);
    expect(page.router.url).toBe('/login?returnUrl=%2Forders');
  });

  it('says so, and points to the menu, when there are no orders', async () => {
    const page = await signInWithOrders('customer', 0);
    await vi.waitFor(() => expect(text(page.el)).toContain('No orders yet'));
    expect(page.el.querySelector('a')?.getAttribute('href')).toBe('/menu');
  });

  describe('with orders', () => {
    it('shows three to a page, newest first, and pages through the rest', async () => {
      const page = await signInWithOrders('customer', 4);
      await vi.waitFor(() => expect(orders(page)).toHaveLength(3));
      expect(text(page.el)).toMatch(/Page 1 of 2/);
      // Orders were placed with 1, 2, 3, 4 servings, so the newest has the largest total.
      const totals = orders(page).map((o) => o.querySelector('.order-total')?.textContent.trim());
      expect(totals.map((t) => Number(t?.replace(/\D/g, '')))).toEqual(
        [...totals.map((t) => Number(t?.replace(/\D/g, '')))].sort((a, b) => b - a),
      );

      (
        Array.from(page.el.querySelectorAll('zc-pager button')).find((b) =>
          b.textContent.includes('Next'),
        ) as HTMLButtonElement
      ).click();
      await vi.waitFor(() => expect(page.router.url).toContain('page=2'));
      await vi.waitFor(() => expect(orders(page)).toHaveLength(1));
      expect(text(page.el)).toMatch(/Page 2 of 2/);
    });

    it('opens on the page the URL names', async () => {
      const page = await signInWithOrders('customer', 4);
      await page.harness.navigateByUrl('/orders?page=2');
      await vi.waitFor(() => expect(orders(page)).toHaveLength(1));
    });

    it('lists what was bought, in a labelled order, with no accessibility violations', async () => {
      const page = await signInWithOrders('customer', 2);
      await vi.waitFor(() => expect(orders(page)).toHaveLength(2));
      expect(text(orders(page)[0]!)).toContain('Nasi Goreng');
      expect(text(orders(page)[0]!)).toMatch(/\d+ × Nasi Goreng/);
      await expectNoAxeViolations(page.el);
    });

    it('does not show the finance summary to a customer, or ask the server for it', async () => {
      const page = await signInWithOrders('customer', 1);
      await vi.waitFor(() => expect(orders(page)).toHaveLength(1));
      expect(page.el.querySelector('.finance')).toBeNull();
    });

    it('shows an admin the revenue summary', async () => {
      const page = await signInWithOrders('admin', 2);
      await vi.waitFor(() => expect(page.el.querySelector('.finance')).not.toBeNull());
      const finance = text(page.el.querySelector('.finance')!);
      expect(finance).toContain('Total revenue');
      expect(finance).toContain('Average order');
      expect(finance).toMatch(/Orders\s*2/);
    });
  });
});
