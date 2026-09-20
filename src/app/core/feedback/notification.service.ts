import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
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
  private readonly snackBar = inject(MatSnackBar);
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

  private show(
    key: string,
    params: Params | undefined,
    duration: number,
    politeness: 'polite' | 'assertive',
  ): void {
    this.snackBar.open(this.text(key, params), this.text(DISMISS.closeKey), {
      duration,
      politeness,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }
}
