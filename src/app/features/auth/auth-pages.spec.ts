import { TestBed } from '@angular/core/testing';
import { AuthService } from '@core/auth/auth.service';
import { SessionStore } from '@core/auth/session.store';
import { expectNoAxeViolations } from '../../../testing/a11y';
import { DEMO_ACCOUNTS } from '../../../testing/apollo';
import {
  fill,
  guestRoute,
  Placeholder,
  renderRoute,
  submitButton,
} from '../../../testing/app-harness';
import { ForgotPasswordPage } from './forgot-password/forgot-password.page';
import { LoginPage } from './login/login.page';
import { RegisterPage } from './register/register.page';

const { customer } = DEMO_ACCOUNTS;

const routes = [
  guestRoute('login', LoginPage),
  guestRoute('register', RegisterPage),
  guestRoute('forgot-password', ForgotPasswordPage),
  { path: 'somewhere', component: Placeholder },
];

/** Lets the store effects and any navigation started by the page finish. */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 30));

async function submit(page: Awaited<ReturnType<typeof renderRoute>>): Promise<void> {
  submitButton(page.el).click();
  await vi.waitFor(() => expect(submitButton(page.el)?.disabled ?? false).toBe(false));
  await page.harness.fixture.whenStable();
  await settle();
}

describe('LoginPage', () => {
  afterEach(() => localStorage.clear());

  it('has no accessibility violations', async () => {
    const page = await renderRoute('/login', routes);
    await expectNoAxeViolations(page.el);
  });

  it('labels the page with a single h1 and the fields with their labels', async () => {
    const { el } = await renderRoute('/login', routes);
    expect(el.querySelectorAll('h1')).toHaveLength(1);
    expect(el.querySelector('h1')?.textContent).toContain('Sign in');
    expect(el.textContent).toContain('Email');
    expect(el.textContent).toContain('Password');
  });

  it('shows what is missing, focuses the first problem, and does not call the server', async () => {
    const page = await renderRoute('/login', routes);
    const session = TestBed.inject(SessionStore);
    await submit(page);
    await vi.waitFor(() => expect(page.el.querySelectorAll('mat-error').length).toBe(2));
    expect(document.activeElement?.getAttribute('type')).toBe('email');
    expect(session.isAuthenticated()).toBe(false);
  });

  it('says so, and stays put, when the password is wrong', async () => {
    const page = await renderRoute('/login', routes);
    fill(page.el, 'Email', customer.email);
    fill(page.el, 'Password', 'not-the-password');
    await submit(page);

    await vi.waitFor(() =>
      expect(page.el.querySelector('[role="alert"]')?.textContent).toMatch(/wrong/i),
    );
    expect(page.router.url).toBe('/login');
    expect(TestBed.inject(SessionStore).isAuthenticated()).toBe(false);
    expect(submitButton(page.el).disabled).toBe(false);
  });

  it('signs in and goes home', async () => {
    const page = await renderRoute('/login', routes);
    fill(page.el, 'Email', customer.email);
    fill(page.el, 'Password', customer.password);
    await submit(page);

    await vi.waitFor(() => expect(page.router.url).toBe('/'));
    expect(TestBed.inject(SessionStore).isCustomer()).toBe(true);
  });

  it('returns a guest to the page they were headed for', async () => {
    const page = await renderRoute('/login?returnUrl=%2Fcart', routes);
    fill(page.el, 'Email', customer.email);
    fill(page.el, 'Password', customer.password);
    await submit(page);
    await vi.waitFor(() => expect(page.router.url).toBe('/cart'));
  });

  // A crafted login link must not be able to send someone to another site.
  it('ignores a returnUrl that points off-site', async () => {
    const page = await renderRoute('/login?returnUrl=https%3A%2F%2Fevil.example', routes);
    fill(page.el, 'Email', customer.email);
    fill(page.el, 'Password', customer.password);
    await submit(page);
    await vi.waitFor(() => expect(page.router.url).toBe('/'));
  });

  it('keeps the returnUrl on the link to register', async () => {
    const { el } = await renderRoute('/login?returnUrl=%2Fcart', routes);
    const link = Array.from(el.querySelectorAll('a')).find((a) => a.href.includes('/register'));
    expect(link?.getAttribute('href')).toContain('returnUrl=%2Fcart');
  });

  it('sends a signed-in user away from the login page', async () => {
    localStorage.clear();
    const page = await renderRoute('/somewhere', routes);
    await TestBed.inject(AuthService).signIn(customer);
    await page.harness.navigateByUrl('/login');
    expect(page.router.url).toBe('/');
  });
});

describe('RegisterPage', () => {
  afterEach(() => localStorage.clear());

  it('has no accessibility violations', async () => {
    const page = await renderRoute('/register', routes);
    await expectNoAxeViolations(page.el);
  });

  it('asks for a password of at least 8 characters before submitting', async () => {
    const page = await renderRoute('/register', routes);
    fill(page.el, 'First name', 'Putri');
    fill(page.el, 'Last name', 'Lestari');
    fill(page.el, 'Email', 'putri@example.com');
    fill(page.el, 'Password', 'short');
    await submit(page);

    await vi.waitFor(() => expect(page.el.textContent).toContain('at least 8 characters'));
    expect(TestBed.inject(SessionStore).isAuthenticated()).toBe(false);
  });

  it('creates the account, signs the person in and goes home', async () => {
    const page = await renderRoute('/register', routes);
    fill(page.el, 'First name', '  Putri ');
    fill(page.el, 'Last name', 'Lestari');
    fill(page.el, 'Email', 'putri@example.com');
    fill(page.el, 'Password', 'a-long-password');
    await submit(page);

    await vi.waitFor(() => expect(page.router.url).toBe('/'));
    const session = TestBed.inject(SessionStore);
    expect(session.displayName()).toBe('Putri Lestari');
    expect(session.creditIdr()).toBe(0);
  });

  it('says when the email is already registered', async () => {
    const page = await renderRoute('/register', routes);
    fill(page.el, 'First name', 'A');
    fill(page.el, 'Last name', 'B');
    fill(page.el, 'Email', customer.email);
    fill(page.el, 'Password', 'a-long-password');
    await submit(page);

    await vi.waitFor(() =>
      expect(page.el.querySelector('[role="alert"]')?.textContent).toContain(customer.email),
    );
    expect(page.router.url).toBe('/register');
  });
});

describe('ForgotPasswordPage', () => {
  afterEach(() => localStorage.clear());

  const requestCode = async (page: Awaited<ReturnType<typeof renderRoute>>) => {
    fill(page.el, 'Email', customer.email);
    await submit(page);
    await vi.waitFor(() => expect(page.el.querySelector('.demo')).not.toBeNull());
    return page.el.querySelector('.demo strong')?.textContent.trim() ?? '';
  };

  it('has no accessibility violations on either step', async () => {
    const page = await renderRoute('/forgot-password', routes);
    await expectNoAxeViolations(page.el);
    await requestCode(page);
    await expectNoAxeViolations(page.el);
  });

  it('gives a four-digit code in demo mode and moves to the second step', async () => {
    const page = await renderRoute('/forgot-password', routes);
    const code = await requestCode(page);
    expect(code).toMatch(/^\d{4}$/);
    expect(page.el.textContent).toContain(customer.email);
    expect(page.el.textContent).toContain('New password');
  });

  it('rejects a wrong code without changing the password', async () => {
    const page = await renderRoute('/forgot-password', routes);
    const code = await requestCode(page);
    const wrong = code === '0000' ? '1111' : '0000';
    fill(page.el, 'Verification code', wrong);
    fill(page.el, 'New password', 'brand-new-password');
    await submit(page);

    await vi.waitFor(() =>
      expect(page.el.querySelector('[role="alert"]')?.textContent).toContain('code'),
    );
    expect(page.router.url).toBe('/forgot-password');
  });

  it('validates the code shape before asking the server', async () => {
    const page = await renderRoute('/forgot-password', routes);
    await requestCode(page);
    fill(page.el, 'Verification code', '12');
    fill(page.el, 'New password', 'brand-new-password');
    await submit(page);
    await vi.waitFor(() => expect(page.el.querySelector('mat-error')).not.toBeNull());
    expect(page.router.url).toBe('/forgot-password');
  });

  it('resets the password, and the new one signs in', async () => {
    const page = await renderRoute('/forgot-password', routes);
    const code = await requestCode(page);
    fill(page.el, 'Verification code', code);
    fill(page.el, 'New password', 'brand-new-password');
    await submit(page);

    await vi.waitFor(() => expect(page.router.url).toBe('/login'));
    const auth = TestBed.inject(AuthService);
    await expect(
      auth.signIn({ email: customer.email, password: customer.password }),
    ).rejects.toBeDefined();
    await auth.signIn({ email: customer.email, password: 'brand-new-password' });
    expect(TestBed.inject(SessionStore).isCustomer()).toBe(true);
  });

  it('lets the person go back and use a different email', async () => {
    const page = await renderRoute('/forgot-password', routes);
    await requestCode(page);
    const back = Array.from(page.el.querySelectorAll('button')).find((b) =>
      b.textContent.includes('different email'),
    );
    back?.click();
    await page.harness.fixture.whenStable();
    await vi.waitFor(() => expect(page.el.querySelector('.demo')).toBeNull());
    expect(page.el.textContent).toContain('Get a code');
  });
});
