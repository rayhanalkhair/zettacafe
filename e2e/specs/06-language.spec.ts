import { expect, signIn, test } from '../support/fixtures';

test.describe('switching language', () => {
  test('translates the page, sets <html lang>, and remembers the choice', async ({ page }) => {
    await page.goto('/menu');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await page.getByRole('button', { name: 'Bahasa Indonesia' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
    await expect(page.getByRole('heading', { level: 1, name: 'Menu' })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Cari di menu' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Masuk' })).toBeVisible();

    // Survives a reload and a client-side navigation.
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
    await page.getByRole('link', { name: 'Tentang' }).click();
    await expect(page).toHaveTitle(/Tentang/);

    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('groups the digits of a price by the chosen language', async ({ page }) => {
    await signIn(page, 'customer');
    await expect(page.locator('.credit')).toContainText('Rp 250,000');
    await page.getByRole('button', { name: 'Bahasa Indonesia' }).click();
    await expect(page.locator('.credit')).toContainText('Rp 250.000');
  });

  test('reformats the page when the language changes, with no reload', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { level: 1, name: 'About ZettaCafe' })).toBeVisible();
    await page.getByRole('button', { name: 'Bahasa Indonesia' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Tentang ZettaCafe' })).toBeVisible();
  });
});
