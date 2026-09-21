import { expect, signIn, test } from '../support/fixtures';

// These use real key events, which jsdom cannot: they are the only place focus order,
// the skip link and dialog focus return are proved end to end.
test.describe('using only the keyboard', () => {
  test('the skip link is the first stop and moves focus to the content', async ({ page }) => {
    await page.goto('/menu');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await page.keyboard.press('Enter');
    // Focus moves to <main> itself; the URL does not change (the router would otherwise
    // treat the bare #main link as a navigation).
    await expect(page.locator('main')).toBeFocused();
    await expect(page).toHaveURL(/\/menu$/);
    await page.keyboard.press('Tab');
    // The next stop is inside the page, not back in the header.
    await expect(page.locator('main').getByRole('searchbox')).toBeFocused();
  });

  test('every stop on the menu page has a name and none is skipped by tabindex', async ({
    page,
  }) => {
    await page.goto('/menu');
    await expect(page.locator('ul.board > li').first()).toBeVisible();

    expect(await page.locator('[tabindex]:not([tabindex="0"]):not([tabindex="-1"])').count()).toBe(
      0,
    );

    const stops: string[] = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const name = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const label =
          el.getAttribute('aria-label') ??
          (el as HTMLInputElement).labels?.[0]?.textContent?.trim() ??
          el.textContent?.trim() ??
          (el as HTMLInputElement).placeholder ??
          '';
        return `${el.tagName.toLowerCase()}: ${label}`;
      });
      if (name === null) break;
      stops.push(name);
    }
    expect(stops.length).toBeGreaterThan(8);
    // Nothing focusable is anonymous.
    expect(
      stops.filter((s) => /: $/.test(s)),
      stops.join('\n'),
    ).toEqual([]);
  });

  test('a dialog opens from the keyboard, traps focus, closes on Escape and returns focus', async ({
    page,
  }) => {
    await signIn(page, 'customer');
    await page.goto('/menu');
    const add = page.getByRole('button', { name: /^Add Nasi Goreng Kampung to your cart$/ });
    await page.getByRole('searchbox', { name: 'Search the menu' }).fill('Nasi Goreng');
    await expect(add).toBeVisible();
    await add.focus();
    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    // Focus starts in the first field, not on Close.
    await expect(dialog.getByLabel('Servings')).toBeFocused();

    // Tab cycles inside the dialog; it never reaches the page behind.
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(
        true,
      );
    }

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(add).toBeFocused();
  });

  test('a confirmation focuses Cancel, the safe choice', async ({ page }) => {
    await signIn(page, 'customer');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Cancel' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeFocused();
  });

  test('a form submits with Enter', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('customer@zettacafe.id');
    await page.getByLabel('Password', { exact: true }).fill('zettacafe123');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  });
});
