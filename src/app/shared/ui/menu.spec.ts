import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { expectNoAxeViolations } from '../../../testing/a11y';
import { provideTestTranslations } from '../../../testing/translate';
import { DialogShell } from './dialog-shell/dialog-shell';
import { MenuBoardRow } from './menu-board-row/menu-board-row';
import type { MenuItem } from './menu-item';
import { Pager } from './pager/pager';
import { RecipeCard } from './recipe-card/recipe-card';
import { TableShell, type TableState } from './table-shell/table-shell';

const dish: MenuItem = {
  id: 'rec_1',
  name: 'Rendang Daging',
  description: 'Slow-cooked in coconut and kluwek.',
  imageUrl: null,
  priceIdr: 52000,
  discountedPriceIdr: 41600,
  discountPercent: 20,
  availableServings: 12,
  isAvailable: true,
};

const text = (el: Element): string => el.textContent.replace(/\s+/g, ' ');

describe('menu components', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideTestTranslations()] }));

  describe('MenuBoardRow', () => {
    const row = async (item: Partial<MenuItem>) => {
      const fixture = TestBed.createComponent(MenuBoardRow);
      fixture.componentRef.setInput('item', { ...dish, ...item });
      await fixture.whenStable();
      return fixture.nativeElement as HTMLElement;
    };

    it('shows the dish, its discounted price and the discount', async () => {
      const el = await row({});
      expect(el.querySelector('h3')?.textContent).toBe('Rendang Daging');
      expect(text(el)).toContain('Now Rp 41,600');
      expect(text(el)).toContain('20% off');
      await expectNoAxeViolations(el);
    });

    it.each([2, 3, 4] as const)('renders the dish name as an h%s when asked', async (level) => {
      const fixture = TestBed.createComponent(MenuBoardRow);
      fixture.componentRef.setInput('item', dish);
      fixture.componentRef.setInput('headingLevel', level);
      await fixture.whenStable();
      expect((fixture.nativeElement as HTMLElement).querySelector(`h${level}`)?.textContent).toBe(
        'Rendang Daging',
      );
    });

    it('flags a sold-out dish in words', async () => {
      const el = await row({ isAvailable: false, availableServings: 0 });
      expect(text(el)).toContain('Sold out');
    });

    it('flags a dish running low, and not a well-stocked one', async () => {
      expect(text(await row({ availableServings: 3 }))).toContain('3 left');
      expect(text(await row({ availableServings: 12 }))).not.toContain('left');
    });

    it('treats its photo as decorative, since the name sits beside it', async () => {
      const el = await row({ imageUrl: 'https://example.com/a.jpg' });
      expect(el.querySelector('img')?.getAttribute('alt')).toBe('');
      await expectNoAxeViolations(el);
    });

    it('projects the row action', async () => {
      @Component({
        imports: [MenuBoardRow],
        template: `<zc-menu-board-row [item]="item"
          ><button zcRowAction type="button">Add</button></zc-menu-board-row
        >`,
      })
      class Host {
        item = dish;
      }
      const fixture = TestBed.createComponent(Host);
      await fixture.whenStable();
      expect((fixture.nativeElement as HTMLElement).querySelector('button')?.textContent).toBe(
        'Add',
      );
    });
  });

  describe('RecipeCard', () => {
    it('shows the dish and has no accessibility violations', async () => {
      const fixture = TestBed.createComponent(RecipeCard);
      fixture.componentRef.setInput('item', { ...dish, imageUrl: 'https://example.com/a.jpg' });
      await fixture.whenStable();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('h3')?.textContent).toBe('Rendang Daging');
      expect(text(el)).toContain('20% off');
      await expectNoAxeViolations(el);
    });
  });

  describe('RecipeCard heading level', () => {
    it.each([2, 3, 4] as const)('renders the dish name as an h%s when asked', async (level) => {
      const fixture = TestBed.createComponent(RecipeCard);
      fixture.componentRef.setInput('item', dish);
      fixture.componentRef.setInput('headingLevel', level);
      await fixture.whenStable();
      expect((fixture.nativeElement as HTMLElement).querySelector(`h${level}`)).not.toBeNull();
    });
  });

  describe('Pager', () => {
    const pager = async (offset: number, limit: number, total: number) => {
      const fixture = TestBed.createComponent(Pager);
      fixture.componentRef.setInput('offset', offset);
      fixture.componentRef.setInput('limit', limit);
      fixture.componentRef.setInput('total', total);
      const changes: number[] = [];
      fixture.componentInstance.offsetChange.subscribe((o) => changes.push(o));
      await fixture.whenStable();
      const el = fixture.nativeElement as HTMLElement;
      const buttons = el.querySelectorAll('button');
      return { el, changes, previous: buttons[0], next: buttons[1] };
    };

    it('renders nothing when everything fits on one page', async () => {
      expect((await pager(0, 10, 7)).el.querySelector('nav')).toBeNull();
    });

    it('shows the page and disables previous on the first page', async () => {
      const { el, previous } = await pager(0, 10, 25);
      expect(text(el)).toContain('Page 1 of 3');
      expect(previous?.disabled).toBe(true);
      await expectNoAxeViolations(el);
    });

    it('emits the offset of the next and previous page', async () => {
      const { changes, next, previous } = await pager(10, 10, 25);
      next?.click();
      previous?.click();
      expect(changes).toEqual([20, 0]);
    });

    it('disables next on the last page', async () => {
      const { el, next } = await pager(20, 10, 25);
      expect(text(el)).toContain('Page 3 of 3');
      expect(next?.disabled).toBe(true);
    });
  });

  describe('TableShell', () => {
    @Component({
      imports: [TableShell],
      template: `
        <zc-table-shell
          [state]="state"
          label="Recipes"
          emptyHeading="No recipes"
          errorHeading="Could not load recipes"
          (retry)="retries = retries + 1"
        >
          <table>
            <caption>
              Recipes
            </caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Rendang</td>
              </tr>
            </tbody>
          </table>
        </zc-table-shell>
      `,
    })
    class Host {
      state: TableState = 'ready';
      retries = 0;
    }

    const show = async (state: TableState) => {
      const fixture = TestBed.createComponent(Host);
      fixture.componentInstance.state = state;
      await fixture.whenStable();
      return { fixture, el: fixture.nativeElement as HTMLElement };
    };

    it('shows only the table when ready, in a labelled scroll region', async () => {
      const { el } = await show('ready');
      expect(el.querySelector('table')).not.toBeNull();
      expect(el.querySelector('[role="status"]')).toBeNull();
      expect(el.querySelector('[role="region"]')?.getAttribute('aria-label')).toBe('Recipes');
      await expectNoAxeViolations(el);
    });

    it('shows only loading while loading, and marks itself busy', async () => {
      const { el } = await show('loading');
      expect(el.querySelector('table')).toBeNull();
      expect(el.querySelector('[role="status"]')).not.toBeNull();
      expect(el.querySelector('[aria-busy="true"]')).not.toBeNull();
      expect(text(el)).not.toContain('No recipes');
    });

    it('shows only the empty state when empty', async () => {
      const { el } = await show('empty');
      expect(text(el)).toContain('No recipes');
      expect(el.querySelector('table')).toBeNull();
    });

    it('shows the error and forwards retry', async () => {
      const { fixture, el } = await show('error');
      expect(el.querySelector('[role="alert"]')).not.toBeNull();
      el.querySelector('button')?.click();
      expect(fixture.componentInstance.retries).toBe(1);
    });
  });

  describe('DialogShell', () => {
    @Component({
      imports: [DialogShell],
      template: `
        <zc-dialog-shell heading="Add dish">
          <p>Body</p>
          <div zcDialogActions><button type="button">Save</button></div>
        </zc-dialog-shell>
      `,
    })
    class DialogContent {
      readonly ref = inject(MatDialogRef);
    }

    it('names the dialog, closes from a real button, and has no violations', async () => {
      const dialog = TestBed.inject(MatDialog);
      const ref = dialog.open(DialogContent);
      await vi.waitFor(() => expect(document.querySelector('mat-dialog-container')).not.toBeNull());
      const container = document.querySelector('mat-dialog-container') as HTMLElement;

      await vi.waitFor(() => expect(container.querySelector('h2')?.textContent).toBe('Add dish'));
      const title = container.querySelector('h2');
      expect(container.getAttribute('aria-labelledby')).toBe(title?.id);

      const close = container.querySelector('button.close') as HTMLButtonElement;
      expect(close.getAttribute('aria-label')).toBe('Close');
      expect(close.tagName).toBe('BUTTON');
      expect(container.textContent).toContain('Save');

      await expectNoAxeViolations(container);

      const closed = new Promise((resolve) => ref.afterClosed().subscribe(resolve));
      close.click();
      await closed;
    });
  });
});
