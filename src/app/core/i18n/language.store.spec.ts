import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { StorageKeys } from '@core/storage/local-storage.service';
import { LanguageStore } from './language.store';
import { formatIdr, ZcCurrencyPipe, ZcDatePipe, ZcNumberPipe } from './zc-formatting.pipes';

/** A fresh store, as after a page reload: new injector, same localStorage. */
function createStore(): LanguageStore {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideTranslateService({ fallbackLang: 'en' })] });
  return TestBed.inject(LanguageStore);
}

describe('LanguageStore', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = '';
  });
  afterEach(() => localStorage.clear());

  it('defaults to English', () => {
    const store = createStore();
    expect(store.language()).toBe('en');
    expect(store.locale()).toBe('en-US');
  });

  it('maps each language to its locale', () => {
    const store = createStore();
    store.set('id');
    expect(store.locale()).toBe('id-ID');
    store.set('en');
    expect(store.locale()).toBe('en-US');
  });

  it('toggles between the two languages', () => {
    const store = createStore();
    store.toggle();
    expect(store.language()).toBe('id');
    store.toggle();
    expect(store.language()).toBe('en');
  });

  // v1 never updated <html lang>, so a screen reader kept the wrong pronunciation.
  it('keeps <html lang>, ngx-translate and storage in step with the choice', () => {
    const store = createStore();
    const translate = TestBed.inject(TranslateService);
    store.set('id');
    TestBed.tick();

    expect(document.documentElement.lang).toBe('id');
    expect(translate.getCurrentLang()).toBe('id');
    expect(JSON.parse(localStorage.getItem(StorageKeys.language) ?? 'null')).toBe('id');
  });

  it('restores the saved language after a reload', () => {
    createStore().set('id');
    TestBed.tick();
    expect(createStore().language()).toBe('id');
  });

  it('ignores a saved value that is not a language', () => {
    localStorage.setItem(StorageKeys.language, JSON.stringify('fr'));
    expect(createStore().language()).toBe('en');
  });
});

describe('formatIdr', () => {
  it('groups rupiah the Indonesian way', () => {
    expect(formatIdr(28_000, 'id-ID')).toBe('Rp 28.000');
  });

  it('groups rupiah the English way', () => {
    expect(formatIdr(1_250_000, 'en-US')).toBe('Rp 1,250,000');
  });

  it('never shows decimals, which rupiah does not use', () => {
    expect(formatIdr(20_000, 'en-US')).toBe('Rp 20,000');
  });
});

describe('zc pipes', () => {
  let store: LanguageStore;

  beforeEach(() => {
    localStorage.clear();
    store = createStore();
  });
  afterEach(() => localStorage.clear());

  // Angular's CurrencyPipe reads LOCALE_ID once and would keep the boot locale.
  it('zcCurrency reformats when the language changes', () => {
    const pipe = TestBed.runInInjectionContext(() => new ZcCurrencyPipe());
    expect(pipe.transform(28_000)).toBe('Rp 28,000');
    store.set('id');
    expect(pipe.transform(28_000)).toBe('Rp 28.000');
  });

  it('zcCurrency renders nothing for a missing value, but a real zero', () => {
    const pipe = TestBed.runInInjectionContext(() => new ZcCurrencyPipe());
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform(0)).toBe('Rp 0');
  });

  it('zcDate reformats when the language changes', () => {
    const pipe = TestBed.runInInjectionContext(() => new ZcDatePipe());
    const iso = '2026-03-01T09:00:00.000Z';
    const english = pipe.transform(iso);
    store.set('id');
    const indonesian = pipe.transform(iso);
    expect(english).not.toBe('');
    expect(indonesian).not.toBe(english);
    expect(indonesian).toContain('Mar');
  });

  it('zcDate accepts a Date and rejects nonsense quietly', () => {
    const pipe = TestBed.runInInjectionContext(() => new ZcDatePipe());
    expect(pipe.transform(new Date('2026-03-01T09:00:00Z'))).not.toBe('');
    expect(pipe.transform('not a date')).toBe('');
    expect(pipe.transform(null)).toBe('');
  });

  it('zcNumber groups by language and reformats when it changes', () => {
    const pipe = TestBed.runInInjectionContext(() => new ZcNumberPipe());
    expect(pipe.transform(12500)).toBe('12,500');
    store.set('id');
    expect(pipe.transform(12500)).toBe('12.500');
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(0)).toBe('0');
  });
});
