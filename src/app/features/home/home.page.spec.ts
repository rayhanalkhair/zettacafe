import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '@core/auth/auth.service';
import { CartStore } from '@core/cart/cart.store';
import { LanguageStore } from '@core/i18n/language.store';
import { expectNoAxeViolations } from '../../../testing/a11y';
import { DEMO_ACCOUNTS } from '../../../testing/apollo';
import { confirmation, dialogReady, Placeholder, renderRoute } from '../../../testing/app-harness';
import { HomePage } from './home.page';
import { HomeService } from './home.service';

const routes = [
  { path: '', pathMatch: 'full' as const, component: HomePage },
  { path: 'menu', component: Placeholder },
  { path: 'register', component: Placeholder },
  { path: 'login', component: Placeholder },
];

type Page = Awaited<ReturnType<typeof renderRoute>>;

const text = (el: Element) => el.textContent.replace(/\s+/g, ' ');
const section = (page: Page, id: string) =>
  page.el.querySelector(`section[aria-labelledby="${id}"]`);
const cards = (root: Element | null) => Array.from(root?.querySelectorAll('zc-recipe-card') ?? []);

async function open(): Promise<Page> {
  const page = await renderRoute('/', routes);
  await vi.waitFor(() =>
    expect(cards(section(page, 'featured-heading')).length).toBeGreaterThan(0),
  );
  return page;
}

describe('HomePage', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    localStorage.clear();
  });

  it('opens with a single h1, a way to the menu, and an invitation to join', async () => {
    const page = await open();
    expect(page.el.querySelectorAll('h1')).toHaveLength(1);
    expect(page.el.querySelector('h1')?.textContent).toContain('Indonesian food and coffee');
    const hrefs = Array.from(page.el.querySelectorAll('.actions a')).map((a) =>
      a.getAttribute('href'),
    );
    expect(hrefs).toEqual(['/menu', '/register']);
  });

  it('does not invite a signed-in customer to create an account', async () => {
    const page = await renderRoute('/', routes);
    await TestBed.inject(AuthService).signIn(DEMO_ACCOUNTS.customer);
    const hrefs = () =>
      Array.from(page.el.querySelectorAll('.actions a')).map((a) => a.getAttribute('href'));
    await vi.waitFor(() => expect(hrefs()).toEqual(['/menu']));
  });

  it('has no accessibility violations', async () => {
    const page = await open();
    await expectNoAxeViolations(page.el);
  });

  it('keeps the headings in order: h1, then a section heading, then each dish', async () => {
    const page = await open();
    const levels = Array.from(page.el.querySelectorAll('h1, h2, h3')).map((h) => h.tagName);
    expect(levels[0]).toBe('H1');
    expect(levels[1]).toBe('H2');
    expect(levels).toContain('H3');
  });

  describe('the two lists', () => {
    // v1 had them named the wrong way round, so its highlight section showed discounts.
    it('shows the offers section only with discounted dishes', async () => {
      const page = await open();
      await vi.waitFor(() => expect(section(page, 'offers-heading')).not.toBeNull());
      const offers = cards(section(page, 'offers-heading'));
      expect(offers.length).toBeGreaterThan(0);
      expect(offers.every((c) => /\d+% off/.test(text(c)))).toBe(true);
    });

    it('shows the featured section as the curated dishes, each one orderable', async () => {
      const page = await open();
      const featured = cards(section(page, 'featured-heading'));
      expect(featured.length).toBeGreaterThan(0);
      expect(featured.length).toBeLessThanOrEqual(6);
      expect(
        featured.every((c) => c.querySelector<HTMLButtonElement>('button')?.disabled === false),
      ).toBe(true);
    });

    it('names the dish on every Add button', async () => {
      const page = await open();
      const first = cards(section(page, 'featured-heading'))[0]!;
      expect(first.querySelector('button')?.getAttribute('aria-label')).toMatch(
        /^Add .+ to your cart$/,
      );
    });
  });

  describe('ordering from the home page', () => {
    it('asks a guest to sign in, and brings them back here', async () => {
      const page = await open();
      cards(section(page, 'featured-heading'))[0]!.querySelector('button')!.click();
      const [, confirm] = await confirmation();
      expect(document.querySelector('zc-confirm-dialog')?.textContent).toContain(
        'Sign in to order',
      );
      confirm!.click();

      await vi.waitFor(() => expect(page.router.url).toContain('/login'));
      expect(new URLSearchParams(page.router.url.split('?')[1]).get('returnUrl')).toBe('/');
    });

    it('lets a signed-in customer add a dish to the cart', async () => {
      const page = await renderRoute('/', routes);
      await TestBed.inject(AuthService).signIn(DEMO_ACCOUNTS.customer);
      const cart = TestBed.inject(CartStore);
      await vi.waitFor(() =>
        expect(cards(section(page, 'featured-heading')).length).toBeGreaterThan(0),
      );

      cards(section(page, 'featured-heading'))[0]!.querySelector('button')!.click();
      const dialog = await dialogReady('zc-add-to-cart-dialog');
      dialog.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();

      await vi.waitFor(() => expect(cart.lineCount()).toBe(1));
    });
  });

  describe('language', () => {
    it('follows the language switch without a reload', async () => {
      const page = await open();
      TestBed.inject(LanguageStore).set('id');
      await vi.waitFor(() =>
        expect(page.el.querySelector('h1')?.textContent).toContain('Makanan dan kopi Indonesia'),
      );
      expect(text(page.el)).toContain('Tambah');
    });
  });

  describe('when the content cannot be loaded', () => {
    it('shows an error with a retry, and recovers', async () => {
      let attempts = 0;
      const page = await renderRoute('/', routes, [
        {
          provide: HomeService,
          useValue: {
            load: () => {
              attempts++;
              return attempts === 1
                ? Promise.reject(new Error('offline'))
                : Promise.resolve({ featured: [], discounted: [] });
            },
          },
        },
      ]);
      await vi.waitFor(() => expect(page.el.querySelector('[role="alert"]')).not.toBeNull());
      expect(text(page.el)).toContain('The menu did not load');
      // The hero is still there: a failed query must not blank the page.
      expect(page.el.querySelector('h1')).not.toBeNull();

      Array.from(page.el.querySelectorAll('button'))
        .find((b) => b.textContent.includes('Try again'))!
        .click();
      await vi.waitFor(() => expect(page.el.querySelector('[role="alert"]')).toBeNull());
      expect(text(page.el)).toContain('Nothing is on the home page yet');
    });
  });
});
