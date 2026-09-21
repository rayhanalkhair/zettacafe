import { expect, ROUTES, signIn, test } from '../support/fixtures';

test.describe('what the production build does and does not do', () => {
  test('makes no request to anywhere but this server and the coffee list', async ({
    page,
    external,
  }) => {
    await page.goto('/');
    for (const path of ROUTES.guest) {
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible();
    }
    // Drink photos are blocked by the fixture, so they show up here too: they are the
    // only other place the app reaches out. Anything else is a new dependency.
    const unexpected = external.filter(
      (url) => !url.startsWith('https://api.sampleapis.com/') && !url.includes('unsplash'),
    );
    expect(unexpected).toEqual([]);
  });

  test('throws nothing and logs no errors on any route, for any role', async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      // Blocked photos are expected in the tests.
      if (message.type() === 'error' && !/Failed to load resource/.test(message.text())) {
        problems.push(`console: ${message.text()}`);
      }
    });

    for (const path of ROUTES.guest) await page.goto(path);
    await signIn(page, 'admin');
    for (const path of ROUTES.admin) {
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible();
    }
    expect(problems).toEqual([]);
  });

  test('ships without the dev tools', async ({ page }) => {
    for (const path of ['/dev/tokens', '/dev/graphql', '/dev/kitchen-sink', '/dev/session']) {
      await page.goto(path);
      await expect(
        page.getByRole('heading', { name: /design tokens|graphql console/i }),
      ).toHaveCount(0);
      await expect(page.locator('h1')).toHaveCount(0);
    }
  });

  test('loads each page as its own chunk, and the server only when it is needed', async ({
    page,
  }) => {
    const scripts: string[] = [];
    page.on('response', (response) => {
      if (response.url().endsWith('.js')) scripts.push(response.url().split('/').pop()!);
    });

    await page.goto('/about');
    await expect(page.locator('h1').first()).toBeVisible();
    const aboutOnly = scripts.length;
    await page.getByRole('link', { name: 'Menu' }).click();
    await expect(page.locator('ul.board > li').first()).toBeVisible();
    // Going to another page fetched more code, so pages are separate chunks.
    expect(scripts.length).toBeGreaterThan(aboutOnly);
    // The menu is the page that needs the data layer.
    expect(scripts.length).toBeGreaterThan(3);
  });
});
