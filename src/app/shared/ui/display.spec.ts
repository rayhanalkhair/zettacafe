import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { expectNoAxeViolations } from '../../../testing/a11y';
import { provideTestTranslations } from '../../../testing/translate';
import { Money } from './money/money';
import { PageShell } from './page-shell/page-shell';
import { SectionHeading } from './section-heading/section-heading';
import { EmptyState, ErrorState, LoadingPane } from './states/states';
import { StatusPill } from './status-pill/status-pill';

@Component({
  imports: [PageShell, SectionHeading, StatusPill, Money, LoadingPane, EmptyState, ErrorState],
  template: `
    <zc-page-shell>
      <zc-section-heading heading="Menu" [level]="1" headingId="menu-h">
        <button type="button">Add</button>
      </zc-section-heading>
      <zc-status-pill label="Sold out" tone="danger" />
      <zc-money [value]="41600" [listPrice]="52000" />
      <zc-loading-pane />
      <zc-empty-state heading="Nothing here" message="Add a dish to begin.">
        <button type="button">Add a dish</button>
      </zc-empty-state>
      <zc-error-state
        heading="Could not load"
        message="Check your connection."
        (retry)="retried = true"
      />
    </zc-page-shell>
  `,
})
class Host {
  retried = false;
}

async function render<T>(component: new () => T): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(component);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('display components', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideTestTranslations()] }));

  it('has no accessibility violations', async () => {
    await expectNoAxeViolations(await render(Host));
  });

  describe('PageShell', () => {
    it('provides the main landmark that is the skip link target', async () => {
      const root = await render(Host);
      const main = root.querySelector('main');
      expect(main?.id).toBe('main');
      expect(main?.getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('SectionHeading', () => {
    it('renders the requested heading level and id', async () => {
      const root = await render(Host);
      const h1 = root.querySelector('h1');
      expect(h1?.textContent).toContain('Menu');
      expect(h1?.id).toBe('menu-h');
    });

    it.each([2, 3, 4] as const)('renders an h%s', async (level) => {
      const fixture = TestBed.createComponent(SectionHeading);
      fixture.componentRef.setInput('heading', 'Title');
      fixture.componentRef.setInput('level', level);
      await fixture.whenStable();
      expect((fixture.nativeElement as HTMLElement).querySelector(`h${level}`)).not.toBeNull();
    });
  });

  describe('states', () => {
    it('announces loading politely, in the active language', async () => {
      const fixture = TestBed.createComponent(LoadingPane);
      await fixture.whenStable();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('[role="status"]')?.textContent).toContain('Loading…');

      TestBed.inject(TranslateService).use('id');
      fixture.detectChanges();
      await fixture.whenStable();
      expect(el.textContent).toContain('Memuat…');
    });

    it('announces an error assertively and emits retry', async () => {
      const fixture = TestBed.createComponent(ErrorState);
      fixture.componentRef.setInput('heading', 'Could not load');
      let retries = 0;
      fixture.componentInstance.retry.subscribe(() => retries++);
      await fixture.whenStable();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('[role="alert"]')).not.toBeNull();
      el.querySelector('button')?.click();
      expect(retries).toBe(1);
    });

    it('shows the empty state message and its projected action', async () => {
      const root = await render(Host);
      expect(root.textContent).toContain('Nothing here');
      expect(root.textContent).toContain('Add a dish');
    });
  });

  describe('StatusPill', () => {
    it('carries the state in words and a shape, not colour alone', async () => {
      const root = await render(Host);
      const pill = root.querySelector('.pill');
      expect(pill?.textContent).toContain('Sold out');
      expect(pill?.getAttribute('data-tone')).toBe('danger');
      expect(pill?.querySelector('.shape')?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('Money', () => {
    const money = async (value: number, listPrice: number | null) => {
      const fixture = TestBed.createComponent(Money);
      fixture.componentRef.setInput('value', value);
      fixture.componentRef.setInput('listPrice', listPrice);
      await fixture.whenStable();
      return fixture.nativeElement as HTMLElement;
    };

    it('formats rupiah in English grouping by default', async () => {
      expect((await money(28000, null)).textContent).toContain('Rp 28,000');
    });

    it('says "was" and "now" in words when discounted', async () => {
      const el = await money(41600, 52000);
      expect(el.querySelector('del')).not.toBeNull();
      expect(el.querySelector('.visually-hidden')?.textContent).toContain('Was Rp 52,000');
      expect(el.textContent).toContain('Now Rp 41,600');
    });

    it('does not show a list price that is not higher', async () => {
      expect((await money(28000, 28000)).querySelector('del')).toBeNull();
      expect((await money(28000, 20000)).querySelector('del')).toBeNull();
    });

    it('reformats when the language changes', async () => {
      const fixture = TestBed.createComponent(Money);
      fixture.componentRef.setInput('value', 28000);
      await fixture.whenStable();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Rp 28,000');

      TestBed.inject(TranslateService).use('id');
      await fixture.whenStable();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Rp 28.000');
    });
  });
});
