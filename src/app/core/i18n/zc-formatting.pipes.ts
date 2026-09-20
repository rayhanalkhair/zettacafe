import { inject, Pipe, type PipeTransform } from '@angular/core';
import { formatIdr } from '@shared/ui/locale';
import { LanguageStore } from './language.store';

export { formatIdr };

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

/** A plain number grouped for the active language: `12.500` in Indonesian, `12,500` in English. */
@Pipe({ name: 'zcNumber', pure: false })
export class ZcNumberPipe implements PipeTransform {
  private readonly language = inject(LanguageStore);

  transform(value: number | null | undefined): string {
    return value === null || value === undefined
      ? ''
      : new Intl.NumberFormat(this.language.locale()).format(value);
  }
}
