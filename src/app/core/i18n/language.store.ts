import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { localeFor } from '@shared/ui/locale';
import { LocalStorageService, StorageKeys } from '@core/storage/local-storage.service';

export type Language = 'en' | 'id';

export const LANGUAGES: readonly Language[] = ['en', 'id'];

function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'id';
}

/**
 * The active language. Persists the choice, tells ngx-translate, and keeps
 * `<html lang>` correct (v1 never updated it, which is an accessibility defect:
 * a screen reader would keep reading Indonesian with English pronunciation).
 *
 * `locale` is what number and date formatting should use. Angular's own
 * CurrencyPipe and DatePipe read LOCALE_ID once at startup and never react to a
 * signal, so after a language switch they would keep formatting in the old
 * locale. The zc pipes read this store instead.
 */
@Injectable({ providedIn: 'root' })
export class LanguageStore {
  private readonly translate = inject(TranslateService);
  private readonly storage = inject(LocalStorageService);
  private readonly root = inject(DOCUMENT).documentElement;

  private readonly state = signal<Language>(
    this.storage.read(StorageKeys.language, isLanguage) ?? 'en',
  );

  readonly language = this.state.asReadonly();
  readonly locale = computed(() => localeFor(this.state()));

  constructor() {
    effect(() => {
      const language = this.state();
      this.translate.use(language);
      this.storage.write(StorageKeys.language, language);
      this.root.lang = language;
    });
  }

  set(language: Language): void {
    this.state.set(language);
  }

  toggle(): void {
    this.state.update((current) => (current === 'en' ? 'id' : 'en'));
  }
}
