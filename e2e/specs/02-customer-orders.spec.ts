import { addDish, creditOf, expect, moneyOf, signIn, test } from '../support/fixtures';

test.describe('a customer ordering', () => {
  // The v1 cart always removed its FIRST line, whichever one you pressed. So the test
  // removes the SECOND of three and checks that exactly the right one goes.
  test('removes the line they chose, keeps the rest, and pays exactly the total', async ({
    page,
  }) => {
    await signIn(page, 'customer');
    const before = await creditOf(page);

    await addDish(page, 'Nasi Goreng Kampung', 2); // 2 x 28.000 = 56.000
    await addDish(page, 'Soto Betawi', 1); // 36.000
    await addDish(page, 'Gado-Gado', 1); // 26.000

    await page.getByRole('link', { name: /^Cart/ }).click();
    const lines = page.locator('ul.lines > li');
    await expect(lines).toHaveCount(3);

    await page.getByRole('button', { name: 'Remove Soto Betawi from your cart' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Remove' }).click();

    await expect(lines).toHaveCount(2);
    await expect(page.getByRole('heading', { name: 'Nasi Goreng Kampung' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Gado-Gado' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Soto Betawi' })).toHaveCount(0);

    // Edit the first line's note: it must keep its quantity and gain the note.
    await page.getByRole('button', { name: 'Edit Nasi Goreng Kampung' }).click();
    const edit = page.getByRole('dialog');
    await expect(edit.getByRole('heading', { name: 'Change your order' })).toBeVisible();
    await edit.getByLabel('Note for the kitchen').fill('less spicy');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Note: less spicy')).toBeVisible();

    const total = 2 * 28_000 + 26_000;
    await page.getByRole('button', { name: 'Place order' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Place order' }).click();

    await expect(page.getByRole('heading', { name: 'Order placed' })).toBeVisible();
    await expect.poll(() => creditOf(page)).toBe(before - total);

    await page.getByRole('link', { name: 'See your orders' }).click();
    const order = page.locator('article.order').first();
    await expect(order).toContainText('2 × Nasi Goreng Kampung');
    await expect(order).toContainText('(less spicy)');
    await expect(order).toContainText('1 × Gado-Gado');
    await expect(order).not.toContainText('Soto Betawi');
  });

  test('is stopped by a short balance, tops up, and then orders', async ({ page }) => {
    await signIn(page, 'customer');
    await addDish(page, 'Ikan Bakar Jimbaran', 3); // 3 x 58.000 = 174.000 (the kitchen has snapper for three)
    await addDish(page, 'Rendang Daging', 2); // on offer at 20% off, 257.200 in all

    await page.goto('/cart');
    const total = await moneyOf(page.locator('.grand dd'));
    expect(total).toBe(3 * 58_000 + 2 * 41_600);
    await expect(page.getByText(/You are short by/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Place order' })).toBeDisabled();

    await page.locator('.summary').getByRole('button', { name: 'Add credit' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Add credit' })).toBeVisible();
    await dialog.getByLabel('Amount', { exact: true }).fill('100000');
    await dialog.getByRole('button', { name: 'Add credit' }).click();

    await expect(page.getByRole('button', { name: 'Place order' })).toBeEnabled();
    await page.getByRole('button', { name: 'Place order' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Place order' }).click();
    await expect(page.getByRole('heading', { name: 'Order placed' })).toBeVisible();
    await expect.poll(() => creditOf(page)).toBe(250_000 + 100_000 - total);
  });

  test('keeps the session and the cart across a reload', async ({ page }) => {
    await signIn(page, 'customer');
    await addDish(page, 'Pecel Lele', 3);

    await page.goto('/cart');
    await page.reload();

    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pecel Lele' })).toBeVisible();
    await expect(page.locator('.line .unit')).toContainText('3 ×');
  });
});
