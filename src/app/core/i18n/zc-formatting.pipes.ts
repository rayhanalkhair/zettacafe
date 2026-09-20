import { inject, Pipe, type PipeTransform } from '@angular/core';
import { LanguageStore } from './language.store';

/** Formats rupiah in the active language: `Rp 28.000` in Indonesian, `Rp 28,000` in English. */
export function formatIdr(value: number, locale: string): string {
  return `Rp ${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)}`;
}

/**
 * Money. v1 used `| currency : "Rp. "` in eleven templates, which rendered
 * `Rp. 20,000.00` in both languages: a fake symbol with a hardcoded space, and
 * the wrong grouping and decimals for rupiah.
 *
 * Impure on purpose: it reads the language signal, and a pure pipe would cache its
 * result and never notice the language changing.
 */
@Pipe({ name: 'zcCurrency', pure: false })
export class ZcCurrencyPipe implements PipeTransform {
  private readonly language = inject(LanguageStore);

  transform(value: number | null | undefined): string {
    return value === null || value === undefined ? '' : formatIdr(value, this.language.locale());
  }
}

/** A date and time in the active language. Accepts an ISO string or a Date. */
@Pipe({ name: 'zcDate', pure: false })
export class ZcDatePipe implements PipeTransform {
  private readonly language = inject(LanguageStore);

  transform(value: string | Date | null | undefined): string {
    if (value === null || value === undefined) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(this.language.locale(), {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }
}
