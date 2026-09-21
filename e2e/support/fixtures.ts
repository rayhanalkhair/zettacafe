import { expect, test as base, type Locator, type Page } from '@playwright/test';

/**
 * The tests never touch the network. The only thing the app fetches from outside is
 * the SampleAPIs coffee list at first seed, and the drinks' photos. The list is
 * answered with an error, which makes the app use its committed snapshot (the path
 * a visitor takes when that service is down), and everything else external is
 * refused. If the app ever starts calling somewhere new, `external` records it and
 * the "no surprise requests" test fails.
 */
export const test = base.extend<{ external: string[] }>({
  external: async ({ context }, use) => {
    const seen: string[] = [];
    await context.route(
      (url) => !['localhost', '127.0.0.1'].includes(url.hostname),
      (route) => {
        seen.push(route.request().url());
        return route.request().url().includes('api.sampleapis.com')
          ? route.fulfill({ status: 503, body: 'offline in tests' })
          : route.abort();
      },
    );
    await use(seen);
  },
  page: async ({ page, external }, use) => {
    void external;
    await use(page);
  },
});

export { expect };

export const ACCOUNTS = {
  admin: { email: 'admin@zettacafe.id', password: 'zettacafe123' },
  customer: { email: 'customer@zettacafe.id', password: 'zettacafe123' },
} as const;

/** Signs in through the real form. */
export async function signIn(page: Page, who: keyof typeof ACCOUNTS): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ACCOUNTS[who].email);
  await page.getByLabel('Password', { exact: true }).fill(ACCOUNTS[who].password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
}

/** The number in the header's credit readout, e.g. "Rp 250.000" -> 250000. */
export async function creditOf(page: Page): Promise<number> {
  const text = (await page.locator('.credit').innerText()) ?? '';
  return Number(text.replace(/\D/g, ''));
}

/** The rupiah amount in an element, e.g. Rp 257.200 -> 257200. */
export async function moneyOf(where: Locator): Promise<number> {
  return Number((await where.innerText()).replace(/\D/g, ''));
}

/** Adds a dish from the menu as the signed-in customer, with the given servings. */
export async function addDish(page: Page, name: string, servings = 1): Promise<void> {
  await page.goto('/menu');
  await page.getByRole('searchbox', { name: 'Search the menu' }).fill(name);
  await page.getByRole('button', { name: `Add ${name} to your cart` }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Add to cart' })).toBeVisible();
  await dialog.getByLabel('Servings').fill(String(servings));
  await dialog.getByRole('button', { name: 'Add to cart' }).click();
  await expect(dialog).toBeHidden();
}

/** Every route a signed-in person can reach, per role. */
export const ROUTES = {
  guest: ['/', '/menu', '/about', '/login', '/register', '/forgot-password'],
  customer: ['/', '/menu', '/about', '/cart', '/orders'],
  admin: ['/', '/menu', '/about', '/orders', '/admin/recipes', '/admin/ingredients'],
} as const;

/**
 * Waits until a page has finished loading AND finished animating, so that a check
 * (axe, a measurement) sees the page a person would settle on, not a frame of the
 * page-load reveal with half-transparent text.
 */
export async function settle(page: Page): Promise<void> {
  await expect(page.locator('h1').first()).toBeVisible();
  await expect(page.locator('zc-loading-pane')).toHaveCount(0);
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
}

/** Opens the page as this role: signs in first unless they are a guest. */
export async function openAs(
  page: Page,
  role: 'guest' | 'customer' | 'admin',
  path: string,
): Promise<void> {
  if (role !== 'guest') await signIn(page, role);
  await page.goto(path);
  await settle(page);
}
