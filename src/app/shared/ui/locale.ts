import { computed, inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';

/** The BCP 47 locale that number and date formatting should use for a UI language. */
export function localeFor(language: string): string {
  return language === 'id' ? 'id-ID' : 'en-US';
}

/** Formats rupiah in a locale: `Rp 28.000` in Indonesian, `Rp 28,000` in English. */
export function formatIdr(value: number, locale: string): string {
  return `Rp ${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)}`;
}

/**
 * The active formatting locale as a signal, for shared components that must not
 * depend on core stores. It follows ngx-translate, which LanguageStore drives, so
 * a language switch reformats every price without a reload.
 */
export function injectLocale(): Signal<string> {
  const translate = inject(TranslateService);
  const language = toSignal(translate.onLangChange.pipe(map((event) => event.lang)), {
    initialValue: translate.getCurrentLang() || 'en',
  });
  return computed(() => localeFor(language()));
}
