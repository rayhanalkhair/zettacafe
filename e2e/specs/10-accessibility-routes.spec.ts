import { violationsOf } from '../support/axe';
import { expect, openAs, ROUTES, test } from '../support/fixtures';

// Every route, per role, in both colour schemes. Reduced motion is on so nothing is
// caught mid-animation.
for (const scheme of ['light', 'dark'] as const) {
  test.describe(`accessibility, ${scheme} theme`, () => {
    test.use({ colorScheme: scheme, reducedMotion: 'reduce' });

    for (const role of ['guest', 'customer', 'admin'] as const) {
      for (const path of ROUTES[role]) {
        test(`${role} ${path}`, async ({ page }) => {
          await openAs(page, role, path);
          expect(await violationsOf(page)).toEqual([]);
        });
      }
    }
  });
}

// A gate that cannot fail proves nothing. Put a real defect on a real page and check
// the same helper reports it, contrast included.
test('the check itself catches a contrast failure and an unlabelled control', async ({ page }) => {
  await openAs(page, 'guest', '/about');
  await page.evaluate(() => {
    document
      .querySelector('main')!
      .insertAdjacentHTML(
        'beforeend',
        '<p style="color:#bbb;background:#fff">Pale text on white</p><button></button>',
      );
  });
  const found = (await violationsOf(page)).join('\n');
  expect(found).toContain('color-contrast');
  expect(found).toContain('button-name');
});
