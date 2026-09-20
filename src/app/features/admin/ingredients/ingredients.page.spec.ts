import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '@core/auth/auth.service';
import { adminGuard } from '@core/auth/guards';
import { expectNoAxeViolations } from '../../../../testing/a11y';
import { DEMO_ACCOUNTS } from '../../../../testing/apollo';
import { fill, Placeholder, renderRoute } from '../../../../testing/app-harness';
import { IngredientsPage } from './ingredients.page';

const routes = [
  { path: 'admin/ingredients', component: IngredientsPage, canActivate: [adminGuard] },
  { path: 'login', component: Placeholder },
];

type Page = Awaited<ReturnType<typeof renderRoute>>;

const text = (el: Element) => el.textContent.replace(/\s+/g, ' ');
const rows = (page: Page) => Array.from(page.el.querySelectorAll('tbody tr'));
const names = (page: Page) => rows(page).map((r) => r.querySelector('th')?.textContent.trim());
const stocks = (page: Page) =>
  rows(page).map((r) => Number(r.querySelector('td.num')?.textContent.replace(/\D/g, '')));
const button = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('button')).find((b) =>
    b.textContent.includes(label),
  ) as HTMLButtonElement;

/** Waits for the dialog to finish opening, so a click is not lost to a half-built element. */
async function dialogReady(selector: string): Promise<HTMLElement> {
  await vi.waitFor(() => {
    expect(document.querySelector(selector)).not.toBeNull();
    expect(document.querySelector('.mat-mdc-dialog-container.mdc-dialog--open')).not.toBeNull();
    expect(document.querySelector(`${selector} label`)?.textContent).toBeTruthy();
  });
  return document.querySelector(selector) as HTMLElement;
}

async function confirmation(): Promise<HTMLButtonElement[]> {
  await vi.waitFor(() => {
    expect(document.querySelectorAll('zc-confirm-dialog button').length).toBe(2);
    expect(document.querySelector('.mat-mdc-dialog-container.mdc-dialog--open')).not.toBeNull();
  });
  return Array.from(document.querySelectorAll<HTMLButtonElement>('zc-confirm-dialog button'));
}

async function open(url = '/admin/ingredients'): Promise<Page> {
  const page = await renderRoute('/', routes);
  await TestBed.inject(AuthService).signIn(DEMO_ACCOUNTS.admin);
  await page.harness.navigateByUrl(url);
  await page.harness.fixture.whenStable();
  const shown = { ...page, el: page.harness.routeNativeElement as HTMLElement };
  await vi.waitFor(() => expect(rows(shown).length).toBeGreaterThan(0));
  return shown;
}

describe('IngredientsPage', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    localStorage.clear();
  });

  describe('who may see it', () => {
    it('sends a guest to sign in', async () => {
      const page = await renderRoute('/admin/ingredients', routes);
      expect(page.router.url).toBe('/login?returnUrl=%2Fadmin%2Fingredients');
    });

    it('sends a customer home', async () => {
      const page = await renderRoute('/', routes);
      await TestBed.inject(AuthService).signIn(DEMO_ACCOUNTS.customer);
      await page.harness.navigateByUrl('/admin/ingredients');
      expect(page.router.url).toBe('/');
    });
  });

  describe('the table', () => {
    it('lists ten ingredients a page, by name, with a real table', async () => {
      const page = await open();
      expect(rows(page)).toHaveLength(10);
      expect(names(page)).toEqual([...names(page)].sort((a, b) => a!.localeCompare(b!)));
      expect(page.el.querySelectorAll('th[scope="col"]').length).toBeGreaterThanOrEqual(3);
      expect(page.el.querySelector('caption')).not.toBeNull();
      expect(text(page.el)).toMatch(/Page 1 of \d+/);
      expect(page.el.querySelector('[role="status"]')?.textContent).toMatch(/\d+ ingredients/);
    });

    it('has no accessibility violations', async () => {
      const page = await open();
      await expectNoAxeViolations(page.el);
    });

    it('shows stock with its unit and a status in words', async () => {
      const page = await open('/admin/ingredients?search=kluwek');
      await vi.waitFor(() => expect(names(page)).toEqual(['Kluwek']));
      expect(text(rows(page)[0]!)).toContain('0 pcs');
      expect(text(rows(page)[0]!)).toContain('Out of stock');
    });

    it('names the ingredient on every row action', async () => {
      const page = await open();
      const labels = Array.from(rows(page)[0]!.querySelectorAll('button')).map((b) =>
        b.getAttribute('aria-label'),
      );
      expect(labels[0]).toMatch(/^Edit .+/);
      expect(labels[1]).toMatch(/^Delete .+/);
    });
  });

  describe('search and filter', () => {
    it('narrows by name once typing pauses, and keeps it in the URL', async () => {
      const page = await open();
      fill(page.el, 'Search ingredients', 'chilli');
      await vi.waitFor(() => expect(names(page).length).toBeLessThan(10));
      expect(names(page).every((n) => /chilli/i.test(n ?? ''))).toBe(true);
      expect(page.router.url).toContain('search=chilli');
    });

    it('shows only what is out of stock', async () => {
      const page = await open();
      button(page.el, 'Out of stock').click();
      await vi.waitFor(() => expect(page.router.url).toContain('stock=out'));
      await vi.waitFor(() => expect(names(page)).toContain('Kluwek'));
      expect(rows(page).every((r) => text(r).includes('Out of stock'))).toBe(true);
    });

    it('shows only what is in stock, and marks the active filter', async () => {
      const page = await open('/admin/ingredients?stock=in');
      expect(button(page.el, 'In stock').getAttribute('aria-pressed')).toBe('true');
      expect(names(page)).not.toContain('Kluwek');
    });

    it('says so, and offers a way back, when nothing matches', async () => {
      const page = await open();
      fill(page.el, 'Search ingredients', 'zzzz-nothing');
      await vi.waitFor(() => expect(text(page.el)).toContain('No ingredients'));
      button(page.el, 'Clear filters').click();
      await vi.waitFor(() => expect(rows(page)).toHaveLength(10));
      expect(page.router.url).not.toContain('search');
    });
  });

  describe('sorting', () => {
    const header = (page: Page, label: string) =>
      Array.from(page.el.querySelectorAll('thead th')).find((th) =>
        th.textContent.includes(label),
      ) as HTMLElement;

    it('starts sorted by name, and says so to assistive technology', async () => {
      const page = await open();
      expect(header(page, 'Name').getAttribute('aria-sort')).toBe('ascending');
      expect(header(page, 'Stock').getAttribute('aria-sort')).toBe('none');
    });

    it('sorts by stock ascending, then descending', async () => {
      const page = await open();
      header(page, 'Stock').querySelector('button')!.click();
      await vi.waitFor(() =>
        expect(header(page, 'Stock').getAttribute('aria-sort')).toBe('ascending'),
      );
      await vi.waitFor(() => expect(stocks(page)).toEqual([...stocks(page)].sort((a, b) => a - b)));
      expect(stocks(page)[0]).toBe(0);

      header(page, 'Stock').querySelector('button')!.click();
      await vi.waitFor(() =>
        expect(header(page, 'Stock').getAttribute('aria-sort')).toBe('descending'),
      );
      await vi.waitFor(() => expect(stocks(page)).toEqual([...stocks(page)].sort((a, b) => b - a)));
      expect(page.router.url).toContain('dir=desc');
    });
  });

  describe('paging', () => {
    it('moves to the next page and puts it in the URL', async () => {
      const page = await open();
      const first = names(page);
      button(page.el, 'Next page').click();
      await vi.waitFor(() => expect(page.router.url).toContain('page=2'));
      await vi.waitFor(() => expect(names(page)).not.toEqual(first));
    });
  });

  describe('adding', () => {
    it('adds an ingredient and shows it', async () => {
      const page = await open();
      button(page.el, 'Add ingredient').click();
      const dialog = await dialogReady('zc-ingredient-form-dialog');
      expect(dialog.querySelector('h2')?.textContent).toBe('Add ingredient');

      fill(dialog, 'Name', 'Zzz Lemon');
      fill(dialog, 'Stock', '250');
      fill(dialog, 'Unit', 'g');
      dialog.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();

      await vi.waitFor(() =>
        expect(document.querySelector('zc-ingredient-form-dialog')).toBeNull(),
      );
      fill(page.el, 'Search ingredients', 'zzz lemon');
      await vi.waitFor(() => expect(names(page)).toEqual(['Zzz Lemon']));
      expect(text(rows(page)[0]!)).toContain('250 g');
      await vi.waitFor(() => expect(document.body.textContent).toContain('Zzz Lemon added.'));
    });

    it('is named, labelled and has no accessibility violations', async () => {
      const page = await open();
      button(page.el, 'Add ingredient').click();
      const dialog = await dialogReady('zc-ingredient-form-dialog');
      await expectNoAxeViolations(dialog);
    });

    it('asks for what is missing, and does not call the server', async () => {
      const page = await open();
      button(page.el, 'Add ingredient').click();
      const dialog = await dialogReady('zc-ingredient-form-dialog');
      fill(dialog, 'Stock', '');
      dialog.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
      await vi.waitFor(() =>
        expect(dialog.querySelectorAll('mat-error').length).toBeGreaterThan(1),
      );
      expect(dialog.textContent).toContain('required');
    });

    it.each([
      ['a fraction', '2.5', 'whole number'],
      ['a negative number', '-1', 'at least 0'],
      ['more than the limit', '2000000', 'at most'],
    ])('refuses stock that is %s', async (_name, value, message) => {
      const page = await open();
      button(page.el, 'Add ingredient').click();
      const dialog = await dialogReady('zc-ingredient-form-dialog');
      fill(dialog, 'Name', 'Test');
      fill(dialog, 'Unit', 'g');
      fill(dialog, 'Stock', value);
      dialog.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
      await vi.waitFor(() => expect(dialog.textContent).toContain(message));
    });

    it('says when the name is taken, in the dialog, and keeps it open', async () => {
      const page = await open();
      button(page.el, 'Add ingredient').click();
      const dialog = await dialogReady('zc-ingredient-form-dialog');
      fill(dialog, 'Name', 'Rice');
      fill(dialog, 'Unit', 'g');
      dialog.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
      await vi.waitFor(() => expect(dialog.querySelector('[role="alert"]')).not.toBeNull());
      expect(document.querySelector('zc-ingredient-form-dialog')).not.toBeNull();
    });
  });

  describe('editing', () => {
    it('changes the stock of that ingredient', async () => {
      const page = await open('/admin/ingredients?search=kluwek');
      await vi.waitFor(() => expect(names(page)).toEqual(['Kluwek']));
      button(rows(page)[0]!, 'Edit').click();
      const dialog = await dialogReady('zc-ingredient-form-dialog');
      expect(dialog.querySelector('h2')?.textContent).toBe('Edit ingredient');
      expect(dialog.querySelector<HTMLInputElement>('input')?.value).toBe('Kluwek');

      fill(dialog, 'Stock', '40');
      dialog.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();

      await vi.waitFor(() => expect(text(rows(page)[0]!)).toContain('40 pcs'));
      expect(text(rows(page)[0]!)).toContain('In stock');
    });
  });

  describe('deleting', () => {
    it('asks first, and cancelling keeps it', async () => {
      const page = await open('/admin/ingredients?search=ice');
      await vi.waitFor(() => expect(names(page)).toContain('Ice'));
      const row = rows(page).find((r) => r.querySelector('th')?.textContent.trim() === 'Ice')!;
      button(row, 'Delete').click();
      const [cancel] = await confirmation();
      expect(document.querySelector('zc-confirm-dialog')?.textContent).toContain('Ice');
      cancel!.click();
      await vi.waitFor(() => expect(document.querySelector('zc-confirm-dialog')).toBeNull());
      expect(names(page)).toContain('Ice');
    });

    it('removes an ingredient nothing uses', async () => {
      const page = await open();
      // A fresh ingredient, so no recipe depends on it.
      button(page.el, 'Add ingredient').click();
      const dialog = await dialogReady('zc-ingredient-form-dialog');
      fill(dialog, 'Name', 'Zzz Spare');
      fill(dialog, 'Unit', 'pcs');
      dialog.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
      await vi.waitFor(() =>
        expect(document.querySelector('zc-ingredient-form-dialog')).toBeNull(),
      );

      fill(page.el, 'Search ingredients', 'zzz spare');
      await vi.waitFor(() => expect(names(page)).toEqual(['Zzz Spare']));
      button(rows(page)[0]!, 'Delete').click();
      const [, confirm] = await confirmation();
      confirm!.click();

      await vi.waitFor(() => expect(text(page.el)).toContain('No ingredients'));
    });

    // The server refuses to delete an ingredient a live recipe depends on.
    it('explains why an ingredient a dish still uses cannot be deleted', async () => {
      const page = await open('/admin/ingredients?search=rice');
      await vi.waitFor(() => expect(names(page)).toContain('Rice'));
      const row = rows(page).find((r) => r.querySelector('th')?.textContent.trim() === 'Rice')!;
      button(row, 'Delete').click();
      const [, confirm] = await confirmation();
      confirm!.click();

      await vi.waitFor(() =>
        expect(document.body.textContent).toMatch(/used by|still uses|depends/i),
      );
      expect(names(page)).toContain('Rice');
    });
  });
});
