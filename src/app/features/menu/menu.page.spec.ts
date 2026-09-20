import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { CartStore } from '@core/cart/cart.store';
import { AuthService } from '@core/auth/auth.service';
import { LanguageStore } from '@core/i18n/language.store';
import { expectNoAxeViolations } from '../../../testing/a11y';
import { DEMO_ACCOUNTS } from '../../../testing/apollo';
import { fill, Placeholder, renderRoute } from '../../../testing/app-harness';
import { MenuPage } from './menu.page';
import { MenuService } from './menu.service';

const routes = [
  { path: 'menu', component: MenuPage },
  { path: 'login', component: Placeholder },
];

type Page = Awaited<ReturnType<typeof renderRoute>>;

const rows = (page: Page) => Array.from(page.el.querySelectorAll('zc-menu-board-row'));
const names = (page: Page) => rows(page).map((r) => r.querySelector('h2')?.textContent);
const text = (el: Element) => el.textContent.replace(/\s+/g, ' ');

/** Waits for the first page of dishes, whatever the URL asked for. */
async function ready(page: Page): Promise<void> {
  await vi.waitFor(() => expect(rows(page).length).toBeGreaterThan(0));
}

async function open(url = '/menu'): Promise<Page> {
  const page = await renderRoute(url, routes);
  await ready(page);
  return page;
}

const search = (page: Page, term: string) => fill(page.el, 'Search the menu', term);

describe('MenuPage', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    localStorage.clear();
  });

  it('shows the first ten dishes, how many there are, and a pager', async () => {
    const page = await open();
    expect(rows(page)).toHaveLength(10);
    expect(page.el.querySelector('[role="status"]')?.textContent).toMatch(/\d+ on the menu/);
    expect(text(page.el)).toMatch(/Page 1 of \d+/);
  });

  it('has no accessibility violations', async () => {
    const page = await open();
    await expectNoAxeViolations(page.el);
  });

  it('lists dishes in a real list under a single h1', async () => {
    const page = await open();
    expect(page.el.querySelectorAll('h1')).toHaveLength(1);
    expect(page.el.querySelectorAll('ul.board > li')).toHaveLength(10);
  });

  describe('search', () => {
    it('filters by name once typing pauses, and keeps it in the URL', async () => {
      const page = await open();
      search(page, 'rendang');
      await vi.waitFor(() => expect(names(page)).toEqual(['Rendang Daging']));
      expect(page.router.url).toContain('search=rendang');
    });

    it('restores a search from the URL, including the box', async () => {
      const page = await open('/menu?search=soto');
      await vi.waitFor(() => expect(names(page).every((n) => /soto/i.test(n ?? ''))).toBe(true));
      expect((page.el.querySelector('input[type="search"]') as HTMLInputElement).value).toBe(
        'soto',
      );
    });

    it('says so, and offers a way back, when nothing matches', async () => {
      const page = await open();
      search(page, 'zzzz-no-such-dish');
      await vi.waitFor(() => expect(text(page.el)).toContain('Nothing matches'));
      expect(rows(page)).toHaveLength(0);

      (
        Array.from(page.el.querySelectorAll('button')).find((b) =>
          b.textContent.includes('Show everything'),
        ) as HTMLButtonElement
      ).click();
      await vi.waitFor(() => expect(rows(page)).toHaveLength(10));
      expect(page.router.url).not.toContain('search');
    });
  });

  describe('category', () => {
    const chip = (page: Page, label: string) =>
      Array.from(page.el.querySelectorAll('.categories button')).find(
        (b) => b.textContent.trim() === label,
      ) as HTMLButtonElement;

    it('marks the active choice, and starts on everything', async () => {
      const page = await open();
      expect(chip(page, 'Everything').getAttribute('aria-pressed')).toBe('true');
      expect(chip(page, 'Drinks').getAttribute('aria-pressed')).toBe('false');
    });

    it('narrows to drinks and puts it in the URL', async () => {
      const page = await open();
      const everything = text(page.el.querySelector('[role="status"]')!);
      chip(page, 'Drinks').click();
      await vi.waitFor(() => expect(page.router.url).toContain('category=drink'));
      await vi.waitFor(() =>
        expect(chip(page, 'Drinks').getAttribute('aria-pressed')).toBe('true'),
      );
      await vi.waitFor(() =>
        expect(text(page.el.querySelector('[role="status"]')!)).not.toBe(everything),
      );
    });

    it('restores the category from the URL', async () => {
      const page = await open('/menu?category=food');
      expect(chip(page, 'Food').getAttribute('aria-pressed')).toBe('true');
    });
  });

  describe('paging', () => {
    it('moves to the next page and puts it in the URL', async () => {
      const page = await open();
      const first = names(page);
      (
        Array.from(page.el.querySelectorAll('zc-pager button')).find((b) =>
          b.textContent.includes('Next'),
        ) as HTMLButtonElement
      ).click();

      await vi.waitFor(() => expect(page.router.url).toContain('page=2'));
      await vi.waitFor(() => expect(names(page)).not.toEqual(first));
      expect(text(page.el)).toMatch(/Page 2 of/);
    });

    it('opens on the page the URL names', async () => {
      const page = await open('/menu?page=2');
      expect(text(page.el)).toMatch(/Page 2 of/);
    });

    it('goes back to page one when the search changes', async () => {
      const page = await open('/menu?page=2');
      search(page, 'a');
      await vi.waitFor(() => expect(page.router.url).not.toContain('page='));
    });
  });

  describe('stock', () => {
    it('disables ordering for a dish that is sold out, and says so in words', async () => {
      const page = await open('/menu?search=rawon');
      await vi.waitFor(() => expect(names(page)).toEqual(['Rawon Surabaya']));
      expect(text(page.el)).toContain('Sold out');
      expect(page.el.querySelector<HTMLButtonElement>('zc-menu-board-row button')?.disabled).toBe(
        true,
      );
    });

    it('names the dish on its button, since "Add" alone is ambiguous', async () => {
      const page = await open('/menu?search=rendang');
      await vi.waitFor(() => expect(names(page)).toEqual(['Rendang Daging']));
      expect(page.el.querySelector('zc-menu-board-row button')?.getAttribute('aria-label')).toBe(
        'Add Rendang Daging to your cart',
      );
    });
  });

  describe('language', () => {
    it('shows descriptions in Indonesian after switching, without a reload', async () => {
      const page = await open('/menu?search=rendang');
      await vi.waitFor(() => expect(names(page)).toEqual(['Rendang Daging']));
      const english = rows(page)[0]!.querySelector('.description')!.textContent;

      TestBed.inject(LanguageStore).set('id');
      await vi.waitFor(() =>
        expect(rows(page)[0]?.querySelector('.description')?.textContent).not.toBe(english),
      );
      expect(text(page.el)).toContain('Tambah');
    });
  });

  describe('ordering', () => {
    const addRendang = async (page: Page) => {
      search(page, 'rendang');
      await vi.waitFor(() => expect(names(page)).toEqual(['Rendang Daging']));
      page.el.querySelector<HTMLButtonElement>('zc-menu-board-row button')!.click();
    };

    // v1 rule 3: guests browse but cannot order.
    it('asks a guest to sign in, and brings them back to the same view', async () => {
      const page = await open('/menu?category=food');
      await addRendang(page);
      await vi.waitFor(() =>
        expect(document.querySelector('zc-confirm-dialog')?.textContent).toContain(
          'Sign in to order',
        ),
      );
      const buttons = Array.from(
        document.querySelectorAll<HTMLButtonElement>('zc-confirm-dialog button'),
      );
      buttons[1]!.click();

      await vi.waitFor(() => expect(page.router.url).toContain('/login'));
      const params = new URLSearchParams(page.router.url.split('?')[1]);
      expect(params.get('returnUrl')).toContain('/menu?');
      expect(params.get('returnUrl')).toContain('category=food');
    });

    it('leaves a guest where they are when they decline', async () => {
      const page = await open();
      await addRendang(page);
      await vi.waitFor(() => expect(document.querySelector('zc-confirm-dialog')).not.toBeNull());
      document.querySelector<HTMLButtonElement>('zc-confirm-dialog button')!.click();
      await vi.waitFor(() => expect(document.querySelector('zc-confirm-dialog')).toBeNull());
      expect(page.router.url).toContain('/menu');
    });

    it('lets a signed-in customer choose how many and add a note', async () => {
      const page = await open();
      await TestBed.inject(AuthService).signIn(DEMO_ACCOUNTS.customer);
      const cart = TestBed.inject(CartStore);
      await addRendang(page);

      await vi.waitFor(() =>
        expect(document.querySelector('zc-add-to-cart-dialog')).not.toBeNull(),
      );
      const dialog = document.querySelector('zc-add-to-cart-dialog') as HTMLElement;
      await vi.waitFor(() => expect(dialog.querySelector('h2')?.textContent).toBe('Add to cart'));
      expect(dialog.textContent).toContain('Rendang Daging');

      fill(dialog, 'Servings', '2');
      fill(dialog, 'Note for the kitchen', 'less spicy');
      dialog.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();

      await vi.waitFor(() => expect(cart.lineCount()).toBe(1));
      expect(cart.lines()[0]).toMatchObject({ quantity: 2, note: 'less spicy' });
      await vi.waitFor(() => expect(document.body.textContent).toContain('is in your cart'));
    });
  });

  describe('when the menu cannot be loaded', () => {
    it('shows an error with a retry, and recovers', async () => {
      let attempts = 0;
      const page = await renderRoute('/menu', routes, [
        {
          provide: MenuService,
          useValue: {
            load: () => {
              attempts++;
              return attempts === 1
                ? Promise.reject(new Error('offline'))
                : Promise.resolve({ items: [], totalCount: 0 });
            },
          },
        },
      ]);
      await vi.waitFor(() => expect(page.el.querySelector('[role="alert"]')).not.toBeNull());
      expect(text(page.el)).toContain('The menu did not load');

      (
        Array.from(page.el.querySelectorAll('button')).find((b) =>
          b.textContent.includes('Try again'),
        ) as HTMLButtonElement
      ).click();
      await vi.waitFor(() => expect(page.el.querySelector('[role="alert"]')).toBeNull());
      expect(attempts).toBe(2);
    });
  });
});
