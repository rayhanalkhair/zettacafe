import { TestBed } from '@angular/core/testing';
import { LanguageStore } from '@core/i18n/language.store';
import { expectNoAxeViolations } from '../../../testing/a11y';
import { fill, renderRoute } from '../../../testing/app-harness';
import { AboutPage } from './about.page';

const routes = [
  { path: 'about', component: AboutPage },
  { path: 'profile', redirectTo: 'about', pathMatch: 'full' as const },
];

type Page = Awaited<ReturnType<typeof renderRoute>>;

const text = (el: Element) => el.textContent.replace(/\s+/g, ' ');
const submit = (page: Page) => page.el.querySelector<HTMLButtonElement>('button[type="submit"]')!;

async function open(url = '/about'): Promise<Page> {
  return renderRoute(url, routes);
}

function writeValidMessage(page: Page, name = 'Sari'): void {
  fill(page.el, 'Name', name);
  fill(page.el, 'Email', 'sari@example.com');
  fill(page.el, 'Message', 'Do you have gluten-free options?');
}

describe('AboutPage', () => {
  afterEach(() => localStorage.clear());

  it('says who we are and when we are open, under a single h1', async () => {
    const page = await open();
    expect(page.el.querySelectorAll('h1')).toHaveLength(1);
    expect(page.el.querySelector('h1')?.textContent).toContain('About ZettaCafe');
    expect(text(page.el)).toContain('Opening hours');
    expect(page.el.querySelectorAll('dl.hours div')).toHaveLength(2);
    expect(text(page.el)).toContain('Western Indonesia Time');
  });

  it('is honest that it is a portfolio project', async () => {
    const page = await open();
    expect(text(page.el)).toContain('portfolio project');
    expect(text(page.el)).toContain('not sent anywhere');
  });

  it('is still reachable at the address v1 also used', async () => {
    const page = await open('/profile');
    expect(page.router.url).toBe('/about');
    expect(page.el.querySelector('h1')?.textContent).toContain('About ZettaCafe');
  });

  it('has no accessibility violations, before and after sending', async () => {
    const page = await open();
    await expectNoAxeViolations(page.el);
    writeValidMessage(page);
    submit(page).click();
    await vi.waitFor(() => expect(page.el.querySelector('.sent')).not.toBeNull());
    await expectNoAxeViolations(page.el);
  });

  describe('the contact form', () => {
    it('labels every field', async () => {
      const page = await open();
      const labels = Array.from(page.el.querySelectorAll('label')).map((l) => l.textContent.trim());
      expect(labels).toEqual(['Name', 'Email', 'Message']);
    });

    // v1's form had no FormGroup, so Submit was a native GET that reloaded the whole app.
    it('handles the submit itself, without a native form submission', async () => {
      const page = await open();
      const form = page.el.querySelector('form')!;
      const event = new Event('submit', { cancelable: true });
      form.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    });

    it('asks for what is missing, and does not confirm', async () => {
      const page = await open();
      submit(page).click();
      await vi.waitFor(() => expect(page.el.querySelectorAll('mat-error').length).toBe(3));
      expect(page.el.querySelector('.sent')).toBeNull();
      expect(text(page.el)).toContain('required');
    });

    it('refuses an email that is not one', async () => {
      const page = await open();
      writeValidMessage(page);
      fill(page.el, 'Email', 'not-an-email');
      submit(page).click();
      await vi.waitFor(() => expect(text(page.el)).toContain('valid email'));
      expect(page.el.querySelector('.sent')).toBeNull();
    });

    it('refuses a message longer than the limit', async () => {
      const page = await open();
      writeValidMessage(page);
      fill(page.el, 'Message', 'x'.repeat(1001));
      submit(page).click();
      await vi.waitFor(() => expect(text(page.el)).toContain('at most 1000'));
    });

    it('confirms on the page, by name, and says plainly that nothing was sent', async () => {
      const page = await open();
      writeValidMessage(page, '  Sari  ');
      submit(page).click();

      await vi.waitFor(() => expect(page.el.querySelector('.sent')).not.toBeNull());
      const sent = text(page.el.querySelector('.sent')!);
      expect(sent).toContain('Thank you, Sari.');
      expect(sent).toContain('was not sent anywhere');
      expect(page.el.querySelector('form')).toBeNull();
      // The confirmation is announced without moving focus.
      expect(page.el.querySelector('.sent')?.getAttribute('role')).toBe('status');
    });

    it('offers a fresh, empty form afterwards', async () => {
      const page = await open();
      writeValidMessage(page);
      submit(page).click();
      await vi.waitFor(() => expect(page.el.querySelector('.sent')).not.toBeNull());

      Array.from(page.el.querySelectorAll('button'))
        .find((b) => b.textContent.includes('Write another'))!
        .click();
      await vi.waitFor(() => expect(page.el.querySelector('form')).not.toBeNull());
      expect(page.el.querySelector<HTMLInputElement>('input')?.value).toBe('');
      expect(page.el.querySelectorAll('mat-error')).toHaveLength(0);
    });
  });

  it('is translated', async () => {
    const page = await open();
    TestBed.inject(LanguageStore).set('id');
    await vi.waitFor(() =>
      expect(page.el.querySelector('h1')?.textContent).toContain('Tentang ZettaCafe'),
    );
    expect(text(page.el)).toContain('Jam buka');
  });
});
