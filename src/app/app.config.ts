import {
  type ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, TitleStrategy, withComponentInputBinding } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { AuthService } from '@core/auth/auth.service';
import { GlobalErrorHandler } from '@core/errors/global-error-handler';
import { provideZcApollo } from '@core/graphql/apollo.providers';
import { LanguageStore } from '@core/i18n/language.store';
import { TranslatedTitleStrategy } from '@core/i18n/translated-title.strategy';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(),
    provideZcApollo(),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    { provide: TitleStrategy, useExisting: TranslatedTitleStrategy },
    provideAppInitializer(() => {
      // Apply the saved language before anything renders.
      inject(LanguageStore);
      // Re-validate a restored session in the background. Does nothing for a guest,
      // so a first visit never loads the server, and it does not delay first paint.
      void inject(AuthService).refresh();
    }),
    // Configured once here. v1 duplicated TranslateModule.forChild plus an
    // identical HttpLoaderFactory across six NgModules.
    provideTranslateService({
      loader: provideTranslateHttpLoader({ prefix: '/i18n/', suffix: '.json' }),
      fallbackLang: 'en',
      lang: 'en',
    }),
  ],
};
