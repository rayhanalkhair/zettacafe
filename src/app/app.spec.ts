import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTestApollo } from '../testing/apollo';
import { provideTestTranslations } from '../testing/translate';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideTestApollo(), provideTestTranslations()],
    }).compileComponents();
  });

  afterEach(() => localStorage.clear());

  it('creates the app shell', () => {
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });

  it('renders the skip link, the header and a router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.skip-link')?.textContent).toContain('Skip to content');
    expect(el.querySelector('zc-site-header header')).not.toBeNull();
    expect(el.querySelector('router-outlet')).not.toBeNull();
  });
});
