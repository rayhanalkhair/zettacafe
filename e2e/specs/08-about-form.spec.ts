import { expect, test } from '../support/fixtures';

// v1's contact form had no form group, so Submit did a native GET and reloaded the app.
test.describe('the About page contact form', () => {
  test('validates, is honest that it is a demo, and does not navigate away', async ({ page }) => {
    await page.goto('/about');
    const url = page.url();

    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText('This field is required.').first()).toBeVisible();
    expect(page.url()).toBe(url);

    await page.getByLabel('Name').fill('Rina');
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Message').fill('Do you have vegan options?');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText('Enter a valid email address.')).toBeVisible();

    await page.getByLabel('Email').fill('rina@example.com');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText('Thank you, Rina.')).toBeVisible();
    await expect(
      page.getByText('This is a portfolio demo, so your message was not sent anywhere.').first(),
    ).toBeVisible();
    expect(page.url()).toBe(url);

    await page.getByRole('button', { name: 'Write another' }).click();
    await expect(page.getByLabel('Name')).toHaveValue('');
  });
});
