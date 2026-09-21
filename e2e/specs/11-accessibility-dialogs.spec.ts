import type { Page } from '@playwright/test';
import { violationsOf } from '../support/axe';
import { addDish, expect, openAs, settle, signIn, test } from '../support/fixtures';

async function open(page: Page) {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(page.locator('.mat-mdc-dialog-container.mdc-dialog--open')).toBeVisible();
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  return dialog;
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`accessibility of dialogs, ${scheme} theme`, () => {
    test.use({ colorScheme: scheme, reducedMotion: 'reduce' });

    test('add to cart, sign in prompt, top up and sign out', async ({ page }) => {
      // The guest prompt.
      await openAs(page, 'guest', '/menu');
      await page
        .getByRole('button', { name: /^Add .* to your cart$/ })
        .first()
        .click();
      await open(page);
      expect(await violationsOf(page)).toEqual([]);
      await page.keyboard.press('Escape');

      // The customer's dialogs.
      await signIn(page, 'customer');
      await page.goto('/menu');
      await settle(page);
      await page
        .getByRole('button', { name: /^Add .* to your cart$/ })
        .first()
        .click();
      await open(page);
      expect(await violationsOf(page)).toEqual([]);
      await page.keyboard.press('Escape');

      await page.getByRole('button', { name: 'Add credit' }).click();
      await open(page);
      expect(await violationsOf(page)).toEqual([]);
      await page.keyboard.press('Escape');

      await page.getByRole('button', { name: 'Sign out' }).click();
      await open(page);
      expect(await violationsOf(page)).toEqual([]);
    });

    test('the cart: edit, remove and checkout confirmations', async ({ page }) => {
      await signIn(page, 'customer');
      await addDish(page, 'Nasi Uduk');
      await page.goto('/cart');
      await settle(page);

      await page.getByRole('button', { name: 'Edit Nasi Uduk' }).click();
      await open(page);
      expect(await violationsOf(page)).toEqual([]);
      await page.keyboard.press('Escape');

      await page.getByRole('button', { name: 'Remove Nasi Uduk from your cart' }).click();
      await open(page);
      expect(await violationsOf(page)).toEqual([]);
      await page.keyboard.press('Escape');

      await page.getByRole('button', { name: 'Place order' }).click();
      await open(page);
      expect(await violationsOf(page)).toEqual([]);
    });

    test('the admin forms, details and confirmations', async ({ page }) => {
      await openAs(page, 'admin', '/admin/ingredients');
      await page.getByRole('button', { name: 'Add ingredient' }).click();
      await open(page);
      expect(await violationsOf(page)).toEqual([]);
      await page.keyboard.press('Escape');

      await page
        .getByRole('button', { name: /^Delete / })
        .first()
        .click();
      await open(page);
      expect(await violationsOf(page)).toEqual([]);
      await page.keyboard.press('Escape');

      await page.goto('/admin/recipes');
      await settle(page);
      await page.getByRole('button', { name: 'Add recipe' }).click();
      await open(page);
      expect(await violationsOf(page)).toEqual([]);
      await page.keyboard.press('Escape');

      await page
        .getByRole('button', { name: /^Edit / })
        .first()
        .click();
      await open(page);
      expect(await violationsOf(page)).toEqual([]);
      await page.keyboard.press('Escape');

      await page
        .getByRole('button', { name: /^Details of / })
        .first()
        .click();
      await open(page);
      expect(await violationsOf(page)).toEqual([]);
    });
  });
}
