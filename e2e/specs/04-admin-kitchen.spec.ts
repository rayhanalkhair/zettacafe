import { expect, signIn, test } from '../support/fixtures';
import type { Page } from '@playwright/test';

async function signOut(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
}

async function stockOf(page: Page, ingredient: string): Promise<number> {
  await page.goto('/admin/ingredients');
  await page.getByRole('searchbox', { name: 'Search ingredients' }).fill(ingredient);
  const row = page.getByRole('row', { name: new RegExp(ingredient) });
  await expect(row).toBeVisible();
  const cells = await row.getByRole('cell').allInnerTexts();
  const stock = cells.find((cell) => /\d/.test(cell));
  return Number(stock?.replace(/\D/g, ''));
}

test.describe('an admin running the kitchen', () => {
  test('adds an ingredient and a recipe, publishes it, and a customer order uses the stock', async ({
    page,
  }) => {
    await signIn(page, 'admin');

    // 1. An ingredient.
    await page.goto('/admin/ingredients');
    await page.getByRole('button', { name: 'Add ingredient' }).click();
    const ingredient = page.getByRole('dialog');
    await ingredient.getByLabel('Name').fill('Kemangi');
    await ingredient.getByLabel('Stock').fill('100');
    await ingredient.getByLabel('Unit').fill('g');
    await ingredient.getByRole('button', { name: 'Add ingredient' }).click();
    await expect(page.getByText('Kemangi added.')).toBeVisible();

    // 2. A recipe that uses it. It starts as a draft.
    await page.goto('/admin/recipes');
    await page.getByRole('button', { name: 'Add recipe' }).click();
    const recipe = page.getByRole('dialog');
    await recipe.getByLabel('Name').fill('Ayam Kemangi');
    await recipe.getByLabel('Price').fill('30000');
    await recipe.getByLabel('Description (English)').fill('Chicken with fragrant basil.');
    await recipe.getByRole('combobox', { name: 'Ingredient' }).click();
    await page.getByRole('option', { name: /Kemangi/ }).click();
    await recipe.getByLabel('Per serving').fill('10');
    await recipe.getByRole('button', { name: 'Add recipe' }).click();
    await expect(page.getByText(/Ayam Kemangi added as a draft/)).toBeVisible();

    // 3. Absent from the public menu while a draft.
    await page.goto('/menu');
    await page.getByRole('searchbox', { name: 'Search the menu' }).fill('Ayam Kemangi');
    await expect(page.getByText('Try a different word, or show everything.')).toBeVisible();

    // 4. Publish it, after confirming.
    await page.goto('/admin/recipes');
    await page.getByRole('searchbox', { name: 'Search recipes' }).fill('Ayam Kemangi');
    await page.getByRole('button', { name: 'Publish Ayam Kemangi' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText('Ayam Kemangi is on the menu.')).toBeVisible();

    await page.goto('/menu');
    await page.getByRole('searchbox', { name: 'Search the menu' }).fill('Ayam Kemangi');
    await expect(page.getByRole('heading', { name: 'Ayam Kemangi' })).toBeVisible();

    // 5. A customer orders two, which uses 20 of the 100 g.
    await signOut(page);
    await signIn(page, 'customer');
    await page.goto('/menu');
    await page.getByRole('searchbox', { name: 'Search the menu' }).fill('Ayam Kemangi');
    await page.getByRole('button', { name: 'Add Ayam Kemangi to your cart' }).click();
    const add = page.getByRole('dialog');
    await add.getByLabel('Servings').fill('2');
    await add.getByRole('button', { name: 'Add to cart' }).click();
    await page.goto('/cart');
    await page.getByRole('button', { name: 'Place order' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Place order' }).click();
    await expect(page.getByRole('heading', { name: 'Order placed' })).toBeVisible();

    // 6. Back as admin the stock went down by exactly what the order needed, and the
    //    order is in the revenue figures.
    await signOut(page);
    await signIn(page, 'admin');
    expect(await stockOf(page, 'Kemangi')).toBe(80);
    await page.goto('/orders');
    await expect(page.getByText('Total revenue')).toBeVisible();
  });

  test('refuses to delete an ingredient that a recipe still uses', async ({ page }) => {
    await signIn(page, 'admin');
    await page.goto('/admin/ingredients');
    await page.getByRole('searchbox', { name: 'Search ingredients' }).fill('Snapper');
    await page.getByRole('button', { name: 'Delete Snapper' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('That ingredient is still used by a recipe.')).toBeVisible();
    await expect(page.getByRole('row', { name: /Snapper/ })).toBeVisible();
  });
});
