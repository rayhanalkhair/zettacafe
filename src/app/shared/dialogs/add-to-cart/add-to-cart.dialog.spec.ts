import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { gql } from '@apollo/client';
import { Apollo } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { CartStore } from '@core/cart/cart.store';
import { expectNoAxeViolations } from '../../../../testing/a11y';
import { DEMO_ACCOUNTS } from '../../../../testing/apollo';
import { dialogReady, fill, renderRoute } from '../../../../testing/app-harness';
import { AddToCartDialog, type AddToCartData } from './add-to-cart.dialog';
import { AddToCartService } from './add-to-cart.service';

const RENDANG = { id: 'rec_rendang', name: 'Rendang Daging' };

/** A real dish id from the seeded menu, found through the cart's own API surface. */
async function firstDishId(): Promise<string> {
  const result = await TestBed.inject(Apollo).client.query({
    query: gql`
      query {
        recipes(filter: { status: PUBLISHED, search: "rendang" }) {
          items {
            id
          }
        }
      }
    `,
  });
  return (result.data as { recipes: { items: { id: string }[] } }).recipes.items[0]!.id;
}

async function openDialog(data: Partial<AddToCartData> = {}) {
  await renderRoute('/', []);
  await TestBed.inject(AuthService).signIn(DEMO_ACCOUNTS.customer);
  const recipeId = await firstDishId();
  const ref = TestBed.inject(MatDialog).open(AddToCartDialog, {
    data: {
      mode: 'add',
      recipeId,
      recipeName: RENDANG.name,
      availableServings: 12,
      ...data,
    } satisfies AddToCartData,
  });
  const el = await dialogReady('zc-add-to-cart-dialog');
  await vi.waitFor(() => expect(el.querySelector('label')?.textContent).toContain('Servings'));
  return { ref, el, recipeId, cart: TestBed.inject(CartStore) };
}

const submit = (el: HTMLElement) => el.querySelector<HTMLButtonElement>('button[type="submit"]')!;

describe('AddToCartDialog', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    localStorage.clear();
  });

  it('is named, labelled and has no accessibility violations', async () => {
    const { el } = await openDialog();
    expect(el.querySelector('h2')?.textContent).toBe('Add to cart');
    expect(el.textContent).toContain('Up to 12 available.');
    await expectNoAxeViolations(el);
  });

  // Material reports aria-modal="false" unless told otherwise, so a screen reader may
  // still read the page behind a dialog that has a backdrop. This goes through the
  // service the pages use, since that is what sets it.
  it('is announced as a modal dialog when opened for a customer', async () => {
    await renderRoute('/', []);
    await TestBed.inject(AuthService).signIn(DEMO_ACCOUNTS.customer);
    await TestBed.inject(AddToCartService).start({
      id: await firstDishId(),
      name: RENDANG.name,
      description: '',
      imageUrl: null,
      priceIdr: 1000,
      discountedPriceIdr: 1000,
      discountPercent: 0,
      availableServings: 5,
      isAvailable: true,
    });
    await vi.waitFor(() => expect(document.querySelector('mat-dialog-container')).not.toBeNull());
    // Material sets these a moment after the element exists.
    await vi.waitFor(() => {
      const container = document.querySelector('mat-dialog-container');
      expect(container?.getAttribute('role')).toBe('dialog');
      expect(container?.getAttribute('aria-modal')).toBe('true');
    });
  });

  it('starts at one serving', async () => {
    const { el } = await openDialog();
    expect(el.querySelector<HTMLInputElement>('input[type="number"]')?.value).toBe('1');
  });

  it('will not ask for more than can be made', async () => {
    const { el, cart } = await openDialog({ availableServings: 3 });
    fill(el, 'Servings', '4');
    submit(el).click();
    await vi.waitFor(() =>
      expect(el.querySelector('mat-error')?.textContent).toContain('at most 3'),
    );
    expect(cart.lineCount()).toBe(0);
  });

  it('will not ask for more than the server accepts, however much is in stock', async () => {
    const { el } = await openDialog({ availableServings: 500 });
    expect(el.textContent).toContain('Up to 99 available.');
  });

  it('rejects a note longer than the server allows', async () => {
    const { el, cart } = await openDialog();
    fill(el, 'Note for the kitchen', 'x'.repeat(201));
    submit(el).click();
    await vi.waitFor(() =>
      expect(el.querySelector('mat-error')?.textContent).toContain('at most 200'),
    );
    expect(cart.lineCount()).toBe(0);
  });

  it('adds the dish with its note, and closes', async () => {
    const { ref, el, cart } = await openDialog();
    fill(el, 'Servings', '3');
    fill(el, 'Note for the kitchen', '  no chilli  ');
    submit(el).click();

    expect(await firstValueFrom(ref.afterClosed())).toBe(true);
    expect(cart.lines()[0]).toMatchObject({ quantity: 3, note: 'no chilli' });
  });

  it('treats a blank note as no note', async () => {
    const { ref, el, cart } = await openDialog();
    fill(el, 'Note for the kitchen', '   ');
    submit(el).click();
    await firstValueFrom(ref.afterClosed());
    expect(cart.lines()[0]?.note).toBeNull();
  });

  describe('edit mode', () => {
    it('changes the line it was given, keeping its id', async () => {
      const { cart, recipeId } = await openDialog();
      await cart.addLine(recipeId, 1, null);
      const [line] = cart.lines();
      TestBed.inject(MatDialog).closeAll();

      const edit = TestBed.inject(MatDialog).open(AddToCartDialog, {
        data: {
          mode: 'edit',
          recipeId,
          recipeName: RENDANG.name,
          availableServings: 12,
          lineId: line!.id,
          quantity: line!.quantity,
          note: line!.note,
        } satisfies AddToCartData,
      });
      await vi.waitFor(() =>
        expect(document.querySelector('zc-add-to-cart-dialog h2')?.textContent).toBe(
          'Change your order',
        ),
      );
      const editEl = document.querySelector('zc-add-to-cart-dialog') as HTMLElement;
      await vi.waitFor(() =>
        expect(editEl.querySelector('label')?.textContent).toContain('Servings'),
      );
      expect(editEl.querySelector<HTMLInputElement>('input[type="number"]')?.value).toBe('1');

      fill(editEl, 'Servings', '4');
      submit(editEl).click();
      expect(await firstValueFrom(edit.afterClosed())).toBe(true);

      expect(cart.lineCount()).toBe(1);
      expect(cart.lines()[0]).toMatchObject({ id: line!.id, quantity: 4 });
    });
  });
});
