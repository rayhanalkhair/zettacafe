import { inject, Injectable, Injector } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { formatIdr } from '@core/i18n/zc-formatting.pipes';
import { LanguageStore } from '@core/i18n/language.store';
import { toUserMessage } from '@core/errors/to-user-message';

export type Params = Record<string, string | number>;

const DISMISS = { closeKey: 'common.close' } as const;

/**
 * Short messages that do not need a decision. Replaces SweetAlert2's success and
 * error modals: those blocked the screen for a toast-sized message, were untranslated
 * English (about 25 titles), and once showed a success icon inside an error handler.
 *
 * Messages are translated here from keys, so no call site holds English text.
 * Success is announced politely; errors assertively, so a screen reader interrupts.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly injector = inject(Injector);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageStore);

  success(key: string, params?: Params): void {
    this.show(key, params, 4000, 'polite');
  }

  info(key: string, params?: Params): void {
    this.show(key, params, 5000, 'polite');
  }

  error(key: string, params?: Params): void {
    this.show(key, params, 8000, 'assertive');
  }

  /** Shows any thrown value as a translated message, mapped from its error code. */
  fromError(error: unknown): void {
    const locale = this.language.locale();
    const message = toUserMessage(error, (value) => formatIdr(value, locale));
    this.error(message.key, { ...message.params });
  }

  private text(key: string, params?: Params): string {
    return this.translate.instant(key, params) as string;
  }

  /**
   * The snack bar is loaded on the first message, not at startup: it drags in the whole
   * overlay system (over 100 kB), and most page views never show a notification.
   */
  private show(
    key: string,
    params: Params | undefined,
    duration: number,
    politeness: 'polite' | 'assertive',
  ): void {
    // Translate now, while the active language is the one the message was raised in.
    const message = this.text(key, params);
    const action = this.text(DISMISS.closeKey);
    void import('@angular/material/snack-bar')
      .then(({ MatSnackBar }) => {
        this.injector.get(MatSnackBar).open(message, action, {
          duration,
          politeness,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        });
      })
      .catch(() => {
        // Failing to show a message (the chunk did not load, or the app is being torn
        // down) must never become an error of its own.
      });
  }
}
