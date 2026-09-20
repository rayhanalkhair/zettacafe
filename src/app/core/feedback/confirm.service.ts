import { inject, Injectable, Injector } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import type { ConfirmDialogData } from './confirm-dialog';

export interface ConfirmOptions {
  /** i18n key for the title. */
  titleKey: string;
  /** i18n key for the body. */
  messageKey: string;
  params?: Record<string, string | number>;
  confirmKey?: string;
  cancelKey?: string;
  /** `danger` styles the confirm button as destructive and focuses Cancel. */
  tone?: 'default' | 'danger';
}

const DEFAULTS = {
  confirmKey: 'common.confirm',
  cancelKey: 'common.cancel',
} as const;

/**
 * Asks the user to confirm. Replaces the eleven `Swal.fire({ showCancelButton })`
 * calls in v1, whose dialogs rendered outside Angular's tree (a silent re-render
 * problem under zoneless change detection), could not use the design tokens, and
 * had hardcoded English text and colours.
 *
 * Resolves to true only when the user confirmed. Dismissing (Cancel, Escape,
 * backdrop) is false. Callers must act ONLY on true:
 *
 *   if (!(await confirm.ask({ ... }))) return;
 *
 * v1's publish toggle did the opposite: its "No" branch still fired the mutation
 * with the value flipped.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly injector = inject(Injector);
  private readonly translate = inject(TranslateService);

  async ask(options: ConfirmOptions): Promise<boolean> {
    const t = (key: string): string => this.translate.instant(key, options.params) as string;
    const data: ConfirmDialogData = {
      title: t(options.titleKey),
      message: t(options.messageKey),
      confirmLabel: t(options.confirmKey ?? DEFAULTS.confirmKey),
      cancelLabel: t(options.cancelKey ?? DEFAULTS.cancelKey),
      tone: options.tone ?? 'default',
    };
    // Loaded on the first question, not at startup: the header asks before signing out,
    // and a static import would put all of the dialog code in the initial bundle.
    const [{ MatDialog }, { ConfirmDialog }] = await Promise.all([
      import('@angular/material/dialog'),
      import('./confirm-dialog'),
    ]);
    const ref = this.injector
      .get(MatDialog)
      .open<InstanceType<typeof ConfirmDialog>, ConfirmDialogData, boolean>(ConfirmDialog, {
        data,
        width: 'min(28rem, calc(100vw - 2rem))',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
      });
    return (await firstValueFrom(ref.afterClosed())) === true;
  }
}
