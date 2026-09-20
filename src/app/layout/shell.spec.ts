import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '@core/auth/auth.service';
import { SessionStore } from '@core/auth/session.store';
import { TranslatedTitleStrategy } from '@core/i18n/translated-title.strategy';
import { expectNoAxeViolations } from '../../testing/a11y';
import { DEMO_ACCOUNTS } from '../../testing/apollo';
import { Placeholder, renderRoute } from '../../testing/app-harness';
import { App } from '../app';
import { TitleStrategy } from '@angular/router';

const routes = [{ path: 'login', title: 'titles.login', component: Placeholder }];

async function renderApp() {
  const page = await renderRoute('/', routes, [
    { provide: TitleStrategy, useExisting: TranslatedTitleStrategy },
  ]);
  const fixture = TestBed.createComponent(App);
  await fixture.whenStable();
  return { ...page, app: fixture, root: fixture.nativeElement as HTMLElement };
}

const button = (root: HTMLElement, text: string) =>
  Array.from(root.querySelectorAll('button, a')).find((e) => e.textContent.trim() === text) as
    HTMLElement | undefined;

describe('app shell', () => {
  afterEach(() => localStorage.clear());

  it('has no accessibility violations', async () => {
    const { root } = await renderApp();
    await expectNoAxeViolations(root);
  });

  it('offers sign in to a guest', async () => {
    const { root } = await renderApp();
    expect(button(root, 'Sign in')?.getAttribute('href')).toBe('/login');
    expect(button(root, 'Sign out')).toBeUndefined();
  });

  it('offers the person their name and sign out once signed in', async () => {
    const { root, app } = await renderApp();
    await TestBed.inject(AuthService).signIn(DEMO_ACCOUNTS.customer);
    await app.whenStable();

    expect(root.querySelector('.who')?.textContent).toContain(
      TestBed.inject(SessionStore).displayName(),
    );
    expect(button(root, 'Sign out')).toBeDefined();
    expect(button(root, 'Sign in')).toBeUndefined();
  });

  it('shows the credit, and opens the top-up dialog on demand', async () => {
    const { root, app } = await renderApp();
    await TestBed.inject(AuthService).signIn(DEMO_ACCOUNTS.customer);
    await app.whenStable();
    expect(root.querySelector('.credit')?.textContent).toContain('Rp 250,000');

    button(root, 'Top up')?.click();
    await vi.waitFor(() =>
      expect(document.querySelector('zc-top-up-dialog h2')?.textContent).toBe('Add credit'),
    );
    TestBed.inject(MatDialog).closeAll();
  });

  it('signs out, goes home and clears the session', async () => {
    const { root, app, router } = await renderApp();
    await TestBed.inject(AuthService).signIn(DEMO_ACCOUNTS.customer);
    await app.whenStable();

    button(root, 'Sign out')?.click();
    await vi.waitFor(() => expect(TestBed.inject(SessionStore).isAuthenticated()).toBe(false));
    // The rest of sign out (server call, notice, navigation) finishes after the local part.
    await vi.waitFor(() => expect(document.body.textContent).toContain('You have signed out.'));
    await app.whenStable();
    expect(router.url).toBe('/');
    expect(button(root, 'Sign in')).toBeDefined();
  });

  it('names the language it switches to, in that language, and switches', async () => {
    const { root, app } = await renderApp();
    const toggle = button(root, 'Bahasa Indonesia');
    expect(toggle?.getAttribute('lang')).toBe('id');

    toggle?.click();
    await app.whenStable();
    TestBed.tick();
    expect(document.documentElement.lang).toBe('id');
    const back = button(root, 'English');
    expect(back?.getAttribute('lang')).toBe('en');
  });

  it('moves focus to the main landmark from the skip link', async () => {
    const { root } = await renderApp();
    const main = document.createElement('main');
    main.id = 'main';
    main.tabIndex = -1;
    document.body.append(main);

    (root.querySelector('.skip-link') as HTMLAnchorElement).click();
    expect(document.activeElement).toBe(main);
    main.remove();
  });
});

describe('TranslatedTitleStrategy', () => {
  afterEach(() => localStorage.clear());

  it('titles the page in the active language and follows a language change', async () => {
    const { harness } = await renderRoute('/', routes, [
      { provide: TitleStrategy, useExisting: TranslatedTitleStrategy },
    ]);
    await harness.navigateByUrl('/login');
    const title = TestBed.inject(Title);
    expect(title.getTitle()).toBe('Sign in · ZettaCafe');

    TestBed.inject(TranslateService).use('id');
    await vi.waitFor(() => expect(title.getTitle()).toBe('Masuk · ZettaCafe'));
  });

  it('falls back to the site name when a page has no title', async () => {
    await renderRoute('/', routes, [
      { provide: TitleStrategy, useExisting: TranslatedTitleStrategy },
    ]);
    expect(TestBed.inject(Title).getTitle()).toBe('ZettaCafe');
  });
});
