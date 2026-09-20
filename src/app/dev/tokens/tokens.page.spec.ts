import { DOCUMENT } from '@angular/common';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { TokensPage } from './tokens.page';

describe('TokensPage', () => {
  let fixture: ComponentFixture<TokensPage>;
  let root: HTMLElement;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TokensPage] }).compileComponents();
    root = TestBed.inject(DOCUMENT).documentElement;
    fixture = TestBed.createComponent(TokensPage);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    root.removeAttribute('data-theme');
  });

  const button = (label: string): HTMLButtonElement => {
    const found = [...el.querySelectorAll<HTMLButtonElement>('.modes button')].find(
      (b) => b.textContent.trim() === label,
    );
    if (!found) throw new Error(`No theme button labelled "${label}"`);
    return found;
  };

  it('renders a swatch for every colour token', () => {
    const names = [...el.querySelectorAll('.swatch .name')].map((n) => n.textContent.trim());
    expect(names).toContain('--zc-paper');
    expect(names).toContain('--zc-aren');
    expect(names).toContain('--zc-focus');
    expect(names.length).toBe(19);
    expect(new Set(names).size).toBe(names.length);
  });

  it('exposes landmarks and a skip link', () => {
    expect(el.querySelector('main#tokens-main')).not.toBeNull();
    expect(el.querySelector('a.skip-link[href="#tokens-main"]')).not.toBeNull();
    expect(el.querySelectorAll('h1').length).toBe(1);
  });

  it('starts on the system theme with no override', () => {
    expect(root.hasAttribute('data-theme')).toBe(false);
    expect(button('system').getAttribute('aria-pressed')).toBe('true');
    expect(button('dark').getAttribute('aria-pressed')).toBe('false');
  });

  it('forces a theme and reports it to assistive tech', async () => {
    button('dark').click();
    await fixture.whenStable();

    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(button('dark').getAttribute('aria-pressed')).toBe('true');
    expect(button('system').getAttribute('aria-pressed')).toBe('false');
  });

  it('returns to the system theme by removing the override', async () => {
    button('light').click();
    await fixture.whenStable();
    expect(root.getAttribute('data-theme')).toBe('light');

    button('system').click();
    await fixture.whenStable();
    expect(root.hasAttribute('data-theme')).toBe(false);
  });

  it('never leaves a forced theme behind when it is destroyed', async () => {
    button('dark').click();
    await fixture.whenStable();
    expect(root.getAttribute('data-theme')).toBe('dark');

    fixture.destroy();
    expect(root.hasAttribute('data-theme')).toBe(false);
  });

  it('describes struck-through prices to screen readers', () => {
    const was = el.querySelector('.was');
    expect(was?.querySelector('.visually-hidden')?.textContent.trim()).toBe('Was');
    expect(el.querySelector('.now .visually-hidden')?.textContent.trim()).toBe('Now');
  });
});
