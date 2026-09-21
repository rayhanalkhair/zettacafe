import { ChangeDetectionStrategy, Component, inject, Injector } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '@core/auth/auth.service';
import { SessionStore } from '@core/auth/session.store';
import { CartStore } from '@core/cart/cart.store';
import { LanguageStore } from '@core/i18n/language.store';
import { ConfirmService } from '@core/feedback/confirm.service';
import { NotificationService } from '@core/feedback/notification.service';
import { ZcCurrencyPipe } from '@core/i18n/zc-formatting.pipes';
import { FORM_DIALOG } from '@shared/ui/dialog-focus';

/**
 * The site header: brand, the language switch, and either sign in or the person's
 * name with sign out. Navigation links are added by the feature that owns each page.
 *
 * The language button names the language it switches TO, in that language, and marks
 * it with `lang`, so a screen reader pronounces "Bahasa Indonesia" correctly.
 */
@Component({
  selector: 'zc-site-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButton, RouterLink, RouterLinkActive, TranslatePipe, ZcCurrencyPipe],
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
})
export class SiteHeader {
  protected readonly session = inject(SessionStore);
  protected readonly language = inject(LanguageStore);
  protected readonly cart = inject(CartStore);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly injector = inject(Injector);
  private readonly confirm = inject(ConfirmService);

  /**
   * Loaded on demand, dialog machinery included: most visits never open it, and a
   * static MatDialog import here would put the whole dialog and overlay code in the
   * initial bundle.
   */
  protected async openTopUp(): Promise<void> {
    const [{ TopUpDialog }, { MatDialog }] = await Promise.all([
      import('@shared/dialogs/top-up/top-up.dialog'),
      import('@angular/material/dialog'),
    ]);
    this.injector
      .get(MatDialog)
      .open(TopUpDialog, { width: 'min(28rem, calc(100vw - 2rem))', ...FORM_DIALOG });
  }

  /** Asks first (v1 rule 6), and does nothing unless the person confirmed. */
  protected async signOut(): Promise<void> {
    const confirmed = await this.confirm.ask({
      titleKey: 'shell.signOutConfirm.title',
      messageKey: 'shell.signOutConfirm.message',
      confirmKey: 'shell.signOut',
    });
    if (!confirmed) return;
    await this.auth.signOut();
    this.notifications.info('auth.signedOut');
    await this.router.navigateByUrl('/');
  }
}
