import {
  provideAppInitializer,
  inject,
  type EnvironmentProviders,
  type Provider,
} from '@angular/core';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import en from '../../public/i18n/en.json';
import id from '../../public/i18n/id.json';

/**
 * Real translations, so specs assert the words a person would read and a missing
 * key shows up as the key itself. Starts in English; `translate.use('id')` switches.
 */
export function provideTestTranslations(): (Provider | EnvironmentProviders)[] {
  return [
    provideTranslateService({ fallbackLang: 'en' }),
    provideAppInitializer(() => {
      const translate = inject(TranslateService);
      translate.setTranslation('en', en);
      translate.setTranslation('id', id);
      translate.use('en');
    }),
  ];
}
