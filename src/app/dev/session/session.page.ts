import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { AuthService } from '@core/auth/auth.service';
import { SessionStore } from '@core/auth/session.store';
import { CartStore } from '@core/cart/cart.store';
import { toUserMessage } from '@core/errors/to-user-message';
import { LanguageStore } from '@core/i18n/language.store';
import { ZcCurrencyPipe } from '@core/i18n/zc-formatting.pipes';

/** The public demo accounts (docs/DATA-LAYER.md). */
const DEMO = {
  customer: { email: 'customer@zettacafe.id', password: 'zettacafe123' },
  admin: { email: 'admin@zettacafe.id', password: 'zettacafe123' },
} as const;

/**
 * Phase 4 gate: the core layer working end to end, with no feature UI on top.
 * Sign in, reload the page and stay signed in, sign out, watch the cart follow the
 * user. Dev-only; compiled out of production builds (see app.routes.ts).
 */
@Component({
  selector: 'zc-session-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButton, ZcCurrencyPipe],
  templateUrl: './session.page.html',
  styleUrl: './session.page.scss',
})
export class SessionPage {
  protected readonly session = inject(SessionStore);
  protected readonly cart = inject(CartStore);
  protected readonly language = inject(LanguageStore);
  private readonly auth = inject(AuthService);

  protected readonly message = signal('');

  protected signInAs(who: keyof typeof DEMO): Promise<void> {
    return this.run(() => this.auth.signIn(DEMO[who]), `Signed in as ${who}.`);
  }

  protected signOut(): Promise<void> {
    return this.run(() => this.auth.signOut(), 'Signed out.');
  }

  protected addNasiGoreng(): Promise<void> {
    return this.run(() => this.cart.addLine('rec_nasi_goreng', 1), 'Added Nasi Goreng.');
  }

  protected removeFirstLine(): Promise<void> {
    const first = this.cart.lines()[0];
    if (!first) return Promise.resolve();
    return this.run(() => this.cart.removeLine(first.id), 'Removed the first line.');
  }

  protected checkout(): Promise<void> {
    return this.run(() => this.cart.checkout().then(() => undefined), 'Order placed.');
  }

  protected reload(): void {
    location.reload();
  }

  private async run(action: () => Promise<void>, done: string): Promise<void> {
    try {
      await action();
      this.message.set(done);
    } catch (error) {
      this.message.set(`Failed: ${toUserMessage(error).key}`);
    }
  }
}
