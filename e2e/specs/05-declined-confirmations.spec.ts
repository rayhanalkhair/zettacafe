import { expect, signIn, test } from '../support/fixtures';

// v1 fired its mutation on the "No" branch of every confirmation. The proof has to be
// what is stored, so each test reloads before it looks.
test.describe('declining a confirmation', () => {
  test('leaves a recipe published, even after a reload', async ({ page }) => {
    await signIn(page, 'admin');
    await page.goto('/admin/recipes');
    await page.getByRole('searchbox', { name: 'Search recipes' }).fill('Gado-Gado');
    const row = page.getByRole('row', { name: /Gado-Gado/ });
    await expect(row).toContainText('Published');

    await page.getByRole('button', { name: 'Unpublish Gado-Gado' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Unpublish this recipe?' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();

    await page.reload();
    await page.getByRole('searchbox', { name: 'Search recipes' }).fill('Gado-Gado');
    await expect(page.getByRole('row', { name: /Gado-Gado/ })).toContainText('Published');

    await page.goto('/menu');
    await page.getByRole('searchbox', { name: 'Search the menu' }).fill('Gado-Gado');
    await expect(page.getByRole('heading', { name: 'Gado-Gado' })).toBeVisible();
  });

  test('confirming does unpublish it, and it leaves the menu', async ({ page }) => {
    await signIn(page, 'admin');
    await page.goto('/admin/recipes');
    await page.getByRole('searchbox', { name: 'Search recipes' }).fill('Gado-Gado');
    await page.getByRole('button', { name: 'Unpublish Gado-Gado' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Unpublish' }).click();
    await expect(page.getByText('Gado-Gado is hidden from the menu.')).toBeVisible();

    await page.reload();
    await page.getByRole('searchbox', { name: 'Search recipes' }).fill('Gado-Gado');
    await expect(page.getByRole('row', { name: /Gado-Gado/ })).toContainText('Draft');
    await page.goto('/menu');
    await page.getByRole('searchbox', { name: 'Search the menu' }).fill('Gado-Gado');
    await expect(page.getByText('Try a different word, or show everything.')).toBeVisible();
  });

  test('leaves the cart alone when they decline to empty it', async ({ page }) => {
    await signIn(page, 'customer');
    await page.goto('/menu');
    await page.getByRole('searchbox', { name: 'Search the menu' }).fill('Nasi Uduk');
    await page.getByRole('button', { name: 'Add Nasi Uduk to your cart' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Add to cart' }).click();

    await page.goto('/cart');
    await page.getByRole('button', { name: 'Empty the cart' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Nasi Uduk' })).toBeVisible();
  });
});
