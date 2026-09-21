import { expect, test } from '../support/fixtures';

test.describe('a guest browsing the menu', () => {
  test('sees the board, searches it and filters by category', async ({ page }) => {
    await page.goto('/menu');
    await expect(page.getByRole('heading', { level: 1, name: 'Menu' })).toBeVisible();

    const board = page.locator('ul.board > li');
    await expect(board.first()).toBeVisible();
    const everything = await board.count();
    expect(everything).toBeGreaterThan(3);

    await page.getByRole('searchbox', { name: 'Search the menu' }).fill('rendang');
    await expect(page.getByRole('heading', { level: 2, name: /rendang/i }).first()).toBeVisible();
    await expect.poll(() => board.count()).toBeLessThan(everything);

    await page.getByRole('searchbox', { name: 'Search the menu' }).fill('zzzz-not-a-dish');
    await expect(page.getByText('Try a different word, or show everything.')).toBeVisible();
    await page.getByRole('button', { name: 'Show everything' }).click();
    await expect(board.first()).toBeVisible();

    await page.getByRole('button', { name: 'Drinks' }).click();
    await expect(page.getByRole('button', { name: 'Drinks' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page).toHaveURL(/category=/);
  });

  test('is sent to sign in when adding a dish, then lands on the login page', async ({ page }) => {
    await page.goto('/menu');
    await page
      .getByRole('button', { name: /^Add .* to your cart$/ })
      .first()
      .click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Sign in to order' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Go to sign in' }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('cannot open the cart or the admin pages', async ({ page }) => {
    await page.goto('/cart');
    await expect(page).toHaveURL(/\/login/);
    await page.goto('/admin/recipes');
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fadmin%2Frecipes/);
  });
});
