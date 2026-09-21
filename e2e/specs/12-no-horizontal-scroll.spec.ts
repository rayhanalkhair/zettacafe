import { expect, openAs, ROUTES, test } from '../support/fixtures';

// The Phase 7 sweep found a header and a hidden table heading that pushed pages wider
// than a phone. jsdom has no layout, so only a browser can guard against it coming
// back. This runs in both projects, so it covers 360 and 1440 wide.
for (const role of ['guest', 'customer', 'admin'] as const) {
  for (const path of ROUTES[role]) {
    test(`${role} ${path} fits the viewport`, async ({ page }) => {
      await openAs(page, role, path);
      const { scroll, inner } = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        inner: window.innerWidth,
      }));
      expect(scroll).toBeLessThanOrEqual(inner);

      // Every button and link is a reasonable target (WCAG 2.5.8 asks for 24 px).
      const small = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea')]
          .filter((el) => {
            const box = el.getBoundingClientRect();
            const shown = box.width > 0 && box.height > 0;
            const hidden = el.closest('.visually-hidden');
            return shown && !hidden && (box.width < 24 || box.height < 24);
          })
          .map((el) => `${el.tagName.toLowerCase()} ${el.textContent?.trim().slice(0, 20)}`),
      );
      expect(small).toEqual([]);
    });
  }
}
