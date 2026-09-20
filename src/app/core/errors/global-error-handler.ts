import type { ErrorHandler } from '@angular/core';
import { inject, Injectable } from '@angular/core';
import { NotificationService } from '@core/feedback/notification.service';

/** At most one notice per window, so a render loop cannot bury the screen in toasts. */
const MIN_INTERVAL_MS = 5000;

/**
 * Catches errors nothing else handled (a bug in a template or a stray rejected
 * promise). Errors a caller expects, such as a failed checkout, are handled at the
 * call site with a specific message and never reach here.
 *
 * It logs the real error for the developer and shows the person a plain, translated
 * message. It never shows the error's own text, which may be technical or leak
 * internals.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly notifications = inject(NotificationService);
  private lastShown = 0;

  handleError(error: unknown): void {
    console.error(error);
    const now = Date.now();
    if (now - this.lastShown < MIN_INTERVAL_MS) return;
    this.lastShown = now;
    try {
      this.notifications.error('errors.UNKNOWN');
    } catch {
      // Reporting an error must never raise another one.
    }
  }
}
