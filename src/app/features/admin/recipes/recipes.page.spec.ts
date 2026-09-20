import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '@core/auth/auth.service';
import { adminGuard } from '@core/auth/guards';
import { expectNoAxeViolations } from '../../../../testing/a11y';
import { DEMO_ACCOUNTS } from '../../../../testing/apollo';
import { choose, fill, Placeholder, renderRoute } from '../../../../testing/app-harness';
import { RecipesPage } from './recipes.page';
import { RecipesService } from './recipes.service';

const routes = [
  { path: 'admin/recipes', component: RecipesPage, canActivate: [adminGuard] },
  { path: 'login', component: Placeholder },
];

type Page = Awaited<ReturnType<typeof renderRoute>>;

const text = (el: Element) => el.textContent.replace(/\s+/g, ' ');
const rows = (page: Page) => Array.from(page.el.querySelectorAll('tbody tr'));
const names = (page: Page) =>
  rows(page).map((r) => r.querySelector('th')?.firstChild?.textContent?.trim());
const button = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('button')).find((b) =>
    b.textContent.includes(label),
  ) as HTMLButtonElement;
const rowOf = (page: Page, name: string) =>
  rows(page).find((r) => r.querySelector('th')?.textContent.includes(name))!;

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

async function open(url = '/admin/recipes'): Promise<Page> {
  const page = await renderRoute('/', routes);
  await TestBed.inject(AuthService).signIn(DEMO_ACCOUNTS.admin);
  await page.harness.navigateByUrl(url);
  await page.harness.fixture.whenStable();
  const shown = { ...page, el: page.harness.routeNativeElement as HTMLElement };
  await vi.waitFor(() => expect(rows(shown).length).toBeGreaterThan(0));
  return shown;
}

/** Fills the create form with a valid draft called `name`, and submits it. */
async function createRecipe(page: Page, name: string): Promise<void> {
  button(page.el, 'Add recipe').click();
  const dialog = await dialogReady('zc-recipe-form-dialog');
  await formReady(dialog);
  await vi.waitFor(() => expect(dialog.querySelectorAll('mat-select').length).toBeGreaterThan(0));
  fill(dialog, 'Name', name);
  fill(dialog, 'Price', '30000');
  fill(dialog, 'Description (English)', 'A test bowl.');
  await choose(dialog, 'Ingredient', 'Rice');
  fill(dialog, 'Per serving', '200');
  await submitForm(dialog);
  await vi.waitFor(() => expect(document.querySelector('zc-recipe-form-dialog')).toBeNull(), {
    timeout: 5000,
  });
}

/**
 * The recipe form is usable once its ingredient choices have loaded. They come from the
 * server in pages, so on a slow machine a select opened too early lists nothing. The
 * submit button is disabled until they have arrived, which is what a person waits for.
 */
async function formReady(dialog: HTMLElement): Promise<void> {
  await vi.waitFor(() =>
    expect(dialog.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false),
  );
}

/** Submits the form once it can be: the button is disabled while the ingredients load. */
async function submitForm(dialog: HTMLElement): Promise<void> {
  const submit = dialog.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  await vi.waitFor(() => expect(submit.disabled).toBe(false));
  submit.click();
}

async function statusOf(name: string): Promise<string | undefined> {
  const found = await TestBed.inject(RecipesService).load({
    search: name,
    status: 'all',
    sort: 'NAME',
    direction: 'ASC',
    offset: 0,
  });
  return found.items.find((r) => r.name === name)?.status;
}

describe('RecipesPage', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    localStorage.clear();
  });

  describe('who may see it', () => {
    it('sends a guest to sign in', async () => {
      const page = await renderRoute('/admin/recipes', routes);
      expect(page.router.url).toBe('/login?returnUrl=%2Fadmin%2Frecipes');
    });

    it('sends a customer home', async () => {
      const page = await renderRoute('/', routes);
      await TestBed.inject(AuthService).signIn(DEMO_ACCOUNTS.customer);
      await page.harness.navigateByUrl('/admin/recipes');
      expect(page.router.url).toBe('/');
    });
  });

  describe('the table', () => {
    it('lists ten a page, with a real table and a count', async () => {
      const page = await open();
      expect(rows(page)).toHaveLength(10);
      expect(page.el.querySelector('caption')).not.toBeNull();
      expect(page.el.querySelectorAll('th[scope="col"]').length).toBeGreaterThanOrEqual(4);
      expect(text(page.el)).toMatch(/Page 1 of \d+/);
      expect(page.el.querySelector('[role="status"]')?.textContent).toMatch(/\d+ recipes/);
    });

    it('has no accessibility violations', async () => {
      const page = await open();
      await expectNoAxeViolations(page.el);
    });

    it('shows price with its discount, servings left, and status in words', async () => {
      const page = await open('/admin/recipes?search=rendang');
      await vi.waitFor(() => expect(names(page)).toEqual(['Rendang Daging']));
      const row = text(rows(page)[0]!);
      expect(row).toContain('Now Rp 41,600');
      expect(row).toContain('Published');
    });

    it('names the recipe on every row action, since "Edit" alone is ambiguous', async () => {
      const page = await open();
      const labels = Array.from(rows(page)[0]!.querySelectorAll('button')).map((b) =>
        b.getAttribute('aria-label'),
      );
      expect(labels[0]).toMatch(/^Details of .+/);
      expect(labels[1]).toMatch(/^Edit .+/);
      expect(labels[2]).toMatch(/^Unpublish .+/);
      expect(labels[3]).toMatch(/^Delete .+/);
    });
  });

  describe('search, filter and sort', () => {
    it('narrows by name and keeps it in the URL', async () => {
      const page = await open();
      fill(page.el, 'Search recipes', 'soto');
      await vi.waitFor(() => expect(names(page).length).toBeLessThan(10));
      expect(names(page).every((n) => /soto/i.test(n ?? ''))).toBe(true);
      expect(page.router.url).toContain('search=soto');
    });

    it('sorts by price, ascending then descending', async () => {
      const page = await open();
      const header = Array.from(page.el.querySelectorAll('thead th')).find((th) =>
        th.textContent.includes('Price'),
      ) as HTMLElement;

      header.querySelector('button')!.click();
      await vi.waitFor(() => expect(header.getAttribute('aria-sort')).toBe('ascending'));
      await vi.waitFor(() => expect(page.router.url).toContain('sort=price'));

      header.querySelector('button')!.click();
      await vi.waitFor(() => expect(header.getAttribute('aria-sort')).toBe('descending'));
      expect(page.router.url).toContain('dir=desc');
    });

    it('marks the active status filter, and shows only drafts when asked', async () => {
      const page = await open();
      await createRecipe(page, 'Zzz Draft Bowl');
      button(page.el, 'Drafts').click();
      await vi.waitFor(() => expect(page.router.url).toContain('status=draft'));
      await vi.waitFor(() => expect(names(page)).toContain('Zzz Draft Bowl'));
      expect(button(page.el, 'Drafts').getAttribute('aria-pressed')).toBe('true');
      expect(rows(page).every((r) => text(r).includes('Draft'))).toBe(true);
    });

    it('says so, and offers a way back, when nothing matches', async () => {
      const page = await open();
      fill(page.el, 'Search recipes', 'zzzz-nothing');
      await vi.waitFor(() => expect(text(page.el)).toContain('No recipes'));
      button(page.el, 'Clear filters').click();
      await vi.waitFor(() => expect(rows(page)).toHaveLength(10));
    });
  });

  describe('adding', () => {
    it('adds a recipe as a draft, not on the menu until published', async () => {
      const page = await open();
      await createRecipe(page, 'Zzz New Bowl');
      await vi.waitFor(() => expect(document.body.textContent).toContain('added as a draft'));
      expect(await statusOf('Zzz New Bowl')).toBe('DRAFT');
    });

    it('is named, labelled and has no accessibility violations', async () => {
      const page = await open();
      button(page.el, 'Add recipe').click();
      const dialog = await dialogReady('zc-recipe-form-dialog');
      await formReady(dialog);
      await vi.waitFor(() => expect(dialog.querySelectorAll('mat-select').length).toBe(2));
      expect(dialog.querySelector('h2')?.textContent).toBe('Add recipe');
      await expectNoAxeViolations(dialog);
    });

    it('asks for what is missing, and does not call the server', async () => {
      const page = await open();
      const before = (
        await TestBed.inject(RecipesService).load({
          search: '',
          status: 'all',
          sort: 'NAME',
          direction: 'ASC',
          offset: 0,
        })
      ).totalCount;
      button(page.el, 'Add recipe').click();
      const dialog = await dialogReady('zc-recipe-form-dialog');
      await submitForm(dialog);

      await vi.waitFor(() =>
        expect(dialog.querySelectorAll('mat-error').length).toBeGreaterThan(2),
      );
      // Where focus lands is not asserted here: Material moves a dialog's focus itself once
      // its opening animation ends, which on a slow machine can be after this submit.
      // focusFirstInvalid has its own unit spec, and the sign-in page checks it end to end.
      expect(document.querySelector('zc-recipe-form-dialog')).not.toBeNull();
      const after = (
        await TestBed.inject(RecipesService).load({
          search: '',
          status: 'all',
          sort: 'NAME',
          direction: 'ASC',
          offset: 0,
        })
      ).totalCount;
      expect(after).toBe(before);
    });

    it.each([
      ['a price below the minimum', 'Price', '500', 'at least'],
      ['a discount above 100', 'Discount', '150', 'at most'],
      ['an image link that is not a web address', 'Image link', 'not a link', 'web address'],
    ])('refuses %s', async (_name, label, value, message) => {
      const page = await open();
      button(page.el, 'Add recipe').click();
      const dialog = await dialogReady('zc-recipe-form-dialog');
      fill(dialog, label, value);
      await submitForm(dialog);
      await vi.waitFor(() => expect(dialog.textContent).toContain(message));
    });

    it('will not take the same ingredient twice', async () => {
      const page = await open();
      button(page.el, 'Add recipe').click();
      const dialog = await dialogReady('zc-recipe-form-dialog');
      await formReady(dialog);
      await vi.waitFor(() =>
        expect(dialog.querySelectorAll('mat-select').length).toBeGreaterThan(0),
      );
      fill(dialog, 'Name', 'Zzz Twice');
      fill(dialog, 'Price', '30000');
      fill(dialog, 'Description (English)', 'x');
      await choose(dialog, 'Ingredient', 'Rice');
      fill(dialog, 'Per serving', '100');
      button(dialog, 'Add an ingredient').click();
      await vi.waitFor(() => expect(dialog.querySelectorAll('.ingredient-row').length).toBe(2));
      await choose(dialog, 'Ingredient', 'Rice', 1);
      fill(dialog, 'Per serving', '100', 1);
      await submitForm(dialog);

      await vi.waitFor(() => expect(dialog.textContent).toContain('only once'));
      expect(await statusOf('Zzz Twice')).toBeUndefined();
    });

    it('keeps at least one ingredient row', async () => {
      const page = await open();
      button(page.el, 'Add recipe').click();
      const dialog = await dialogReady('zc-recipe-form-dialog');
      const remove = button(dialog, 'Remove');
      expect(remove.disabled).toBe(true);
      button(dialog, 'Add an ingredient').click();
      await vi.waitFor(() => expect(dialog.querySelectorAll('.ingredient-row').length).toBe(2));
      expect(button(dialog, 'Remove').disabled).toBe(false);
    });
  });

  describe('editing', () => {
    it('opens with the recipe filled in, including every ingredient row', async () => {
      const page = await open('/admin/recipes?search=rendang');
      await vi.waitFor(() => expect(names(page)).toEqual(['Rendang Daging']));
      button(rowOf(page, 'Rendang'), 'Edit').click();
      const dialog = await dialogReady('zc-recipe-form-dialog');
      await formReady(dialog);
      await vi.waitFor(() =>
        expect(dialog.querySelectorAll('mat-select').length).toBeGreaterThan(2),
      );

      expect(dialog.querySelector('h2')?.textContent).toBe('Edit recipe');
      expect(dialog.querySelector<HTMLInputElement>('input')?.value).toBe('Rendang Daging');
      expect(dialog.querySelectorAll('.ingredient-row').length).toBeGreaterThan(1);
    });

    it('saves a new price and shows it in the table', async () => {
      const page = await open('/admin/recipes?search=rendang');
      await vi.waitFor(() => expect(names(page)).toEqual(['Rendang Daging']));
      button(rowOf(page, 'Rendang'), 'Edit').click();
      const dialog = await dialogReady('zc-recipe-form-dialog');
      await formReady(dialog);
      await vi.waitFor(() =>
        expect(dialog.querySelectorAll('mat-select').length).toBeGreaterThan(2),
      );

      fill(dialog, 'Price', '60000');
      await submitForm(dialog);
      await vi.waitFor(() => expect(text(rowOf(page, 'Rendang'))).toContain('60,000'));
    });

    it('does not publish or unpublish, since status has its own action', async () => {
      const page = await open('/admin/recipes?search=rendang');
      await vi.waitFor(() => expect(names(page)).toEqual(['Rendang Daging']));
      button(rowOf(page, 'Rendang'), 'Edit').click();
      const dialog = await dialogReady('zc-recipe-form-dialog');
      await formReady(dialog);
      await vi.waitFor(() =>
        expect(dialog.querySelectorAll('mat-select').length).toBeGreaterThan(2),
      );
      fill(dialog, 'Discount', '10');
      await submitForm(dialog);
      await vi.waitFor(() => expect(document.querySelector('zc-recipe-form-dialog')).toBeNull(), {
        timeout: 5000,
      });
      expect(await statusOf('Rendang Daging')).toBe('PUBLISHED');
    });
  });

  describe('details', () => {
    it('shows what one serving uses against what is in stock', async () => {
      const page = await open('/admin/recipes?search=rendang');
      await vi.waitFor(() => expect(names(page)).toEqual(['Rendang Daging']));
      button(rowOf(page, 'Rendang'), 'Details').click();
      // A read-only dialog has no fields, so wait for its heading instead.
      await vi.waitFor(() =>
        expect(document.querySelector('zc-recipe-detail-dialog h2')?.textContent).toBe(
          'Rendang Daging',
        ),
      );
      const dialog = document.querySelector('zc-recipe-detail-dialog') as HTMLElement;

      expect(dialog.querySelector('h2')?.textContent).toBe('Rendang Daging');
      expect(dialog.textContent).toContain('Beef');
      expect(dialog.querySelectorAll('tbody tr').length).toBeGreaterThan(2);
      await expectNoAxeViolations(dialog);
    });
  });

  describe('publishing', () => {
    // v1 rule 8 and its bug: the "No" branch used to run the mutation anyway.
    it('asks first, and declining leaves the status unchanged on the server', async () => {
      const page = await open();
      await createRecipe(page, 'Zzz Publish Me');
      await vi.waitFor(() => expect(names(page)).toBeDefined());
      fill(page.el, 'Search recipes', 'zzz publish me');
      await vi.waitFor(() => expect(names(page)).toEqual(['Zzz Publish Me']));

      button(rows(page)[0]!, 'Publish').click();
      const [cancel] = await confirmation();
      expect(document.querySelector('zc-confirm-dialog')?.textContent).toContain('Zzz Publish Me');
      cancel!.click();
      await vi.waitFor(() => expect(document.querySelector('zc-confirm-dialog')).toBeNull());

      expect(await statusOf('Zzz Publish Me')).toBe('DRAFT');
      expect(text(rows(page)[0]!)).toContain('Draft');
    });

    it('publishes once confirmed, and can unpublish again', async () => {
      const page = await open();
      await createRecipe(page, 'Zzz Toggle Me');
      fill(page.el, 'Search recipes', 'zzz toggle me');
      await vi.waitFor(() => expect(names(page)).toEqual(['Zzz Toggle Me']));

      button(rows(page)[0]!, 'Publish').click();
      let [, confirm] = await confirmation();
      confirm!.click();
      await vi.waitFor(() => expect(text(rows(page)[0]!)).toContain('Published'));
      expect(await statusOf('Zzz Toggle Me')).toBe('PUBLISHED');

      button(rows(page)[0]!, 'Unpublish').click();
      [, confirm] = await confirmation();
      confirm!.click();
      await vi.waitFor(() => expect(text(rows(page)[0]!)).toContain('Draft'));
      expect(await statusOf('Zzz Toggle Me')).toBe('DRAFT');
    });
  });

  describe('deleting', () => {
    it('asks first, cancelling keeps it, confirming removes it', async () => {
      const page = await open();
      await createRecipe(page, 'Zzz Delete Me');
      fill(page.el, 'Search recipes', 'zzz delete me');
      await vi.waitFor(() => expect(names(page)).toEqual(['Zzz Delete Me']));

      button(rows(page)[0]!, 'Delete').click();
      const [cancel] = await confirmation();
      cancel!.click();
      await vi.waitFor(() => expect(document.querySelector('zc-confirm-dialog')).toBeNull());
      expect(names(page)).toEqual(['Zzz Delete Me']);

      button(rows(page)[0]!, 'Delete').click();
      const [, confirm] = await confirmation();
      confirm!.click();
      await vi.waitFor(() => expect(text(page.el)).toContain('No recipes'));
      expect(await statusOf('Zzz Delete Me')).toBeUndefined();
    });
  });
});
