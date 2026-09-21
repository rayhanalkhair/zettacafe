import { ACCOUNTS, expect, signIn, test } from '../support/fixtures';

test.describe('signing in and out', () => {
  test('rejects a wrong password and stays signed out', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(ACCOUNTS.customer.email);
    await page.getByLabel('Password', { exact: true }).fill('not-the-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Wrong email or password.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
    // v1 stored the string "undefined" here and every guard then let you in.
    await expect(page.getByRole('button', { name: 'Sign out' })).toHaveCount(0);
    await page.goto('/cart');
    await expect(page).toHaveURL(/\/login/);
  });

  test('signs in, returns to the page they wanted, and signs out after confirming', async ({
    page,
  }) => {
    await page.goto('/orders');
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Forders/);
    await page.getByLabel('Email').fill(ACCOUNTS.customer.email);
    await page.getByLabel('Password', { exact: true }).fill(ACCOUNTS.customer.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/orders$/);

    await page.getByRole('button', { name: 'Sign out' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Sign out?' })).toBeVisible();
    // Declining leaves you signed in.
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
    await page.goto('/orders');
    await expect(page).toHaveURL(/\/login/);
  });

  test('keeps a customer out of the admin pages and shows the admin links to an admin', async ({
    page,
  }) => {
    await signIn(page, 'customer');
    await expect(page.getByRole('link', { name: 'Recipes' })).toHaveCount(0);
    await page.goto('/admin/recipes');
    await expect(page).not.toHaveURL(/admin/);

    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Sign out' }).click();
    // Wait for the sign-out to finish: going to /login while still signed in is bounced.
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
    await signIn(page, 'admin');
    await expect(page.getByRole('link', { name: 'Recipes' })).toBeVisible();
    await page.getByRole('link', { name: 'Ingredients' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Ingredients' })).toBeVisible();
  });

  test('registers a new account and is signed in with no credit', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('First name').fill('Sari');
    await page.getByLabel('Last name').fill('Wulandari');
    await page.getByLabel('Email').fill('sari@example.com');
    await page.getByLabel('Password', { exact: true }).fill('a-long-password');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await expect(page.locator('.who')).toContainText('Sari');
    await expect(page.locator('.credit')).toContainText('0');
  });

  test('refuses an email that is already registered', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('First name').fill('Dewi');
    await page.getByLabel('Last name').fill('Lestari');
    await page.getByLabel('Email').fill(ACCOUNTS.customer.email);
    await page.getByLabel('Password', { exact: true }).fill('a-long-password');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText(/is already registered/)).toBeVisible();
  });

  test('resets a forgotten password with the demo code, then signs in with the new one', async ({
    page,
  }) => {
    await page.goto('/forgot-password');
    await page.getByLabel('Email').fill(ACCOUNTS.customer.email);
    await page.getByRole('button', { name: 'Get a code' }).click();

    const notice = page.getByText(/Demo mode: no email is sent/);
    await expect(notice).toBeVisible();
    const code = (await notice.innerText()).match(/\d{4}/)?.[0];
    expect(code).toBeTruthy();

    await page.getByLabel('Verification code').fill(code!);
    await page.getByLabel('New password').fill('brand-new-password');
    await page.getByRole('button', { name: 'Change password' }).click();
    await expect(page.getByText('Password changed. You can sign in now.')).toBeVisible();

    await page.goto('/login');
    await page.getByLabel('Email').fill(ACCOUNTS.customer.email);
    await page.getByLabel('Password', { exact: true }).fill('brand-new-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  });
});
