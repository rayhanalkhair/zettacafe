import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { SessionStore } from '@core/auth/session.store';
import { CartStore, type Cart, type PlacedOrder } from '@core/cart/cart.store';
import { ConfirmService } from '@core/feedback/confirm.service';
import { NotificationService } from '@core/feedback/notification.service';
import { LanguageStore } from '@core/i18n/language.store';
import { ZcCurrencyPipe } from '@core/i18n/zc-formatting.pipes';
import { AddToCartDialog } from '@shared/dialogs/add-to-cart/add-to-cart.dialog';
import { TopUpDialog } from '@shared/dialogs/top-up/top-up.dialog';
import { Money } from '@shared/ui/money/money';
import { PageShell } from '@shared/ui/page-shell/page-shell';
import { SectionHeading } from '@shared/ui/section-heading/section-heading';
import { EmptyState, LoadingPane } from '@shared/ui/states/states';
import { StatusPill } from '@shared/ui/status-pill/status-pill';
import { FORM_DIALOG } from '@shared/ui/dialog-focus';
import { formatIdr } from '@shared/ui/locale';

type Line = Cart['lines'][number];
type Issue = Cart['issues'][number];

/** The most a cart line can hold when the server has not said otherwise. */
const DEFAULT_MAX_QUANTITY = 99;

/**
 * The signed-in user's cart. All of its state is CartStore's; this page only draws it
 * and asks before anything destructive.
 *
 * Every action names the LINE it acts on (v1's remove always acted on the first
 * cart entry, whichever item was clicked).
 */
@Component({
  selector: 'zc-cart-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    EmptyState,
    LoadingPane,
    MatButton,
    Money,
    PageShell,
    RouterLink,
    SectionHeading,
    StatusPill,
    TranslatePipe,
    ZcCurrencyPipe,
  ],
  templateUrl: './cart.page.html',
  styleUrl: './cart.page.scss',
})
export class CartPage {
  protected readonly cart = inject(CartStore);
  protected readonly session = inject(SessionStore);
  private readonly confirm = inject(ConfirmService);
  private readonly notifications = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly language = inject(LanguageStore);

  /** Set once an order is placed, to show what was bought. */
  protected readonly placed = signal<PlacedOrder | null>(null);

  /** The problem, if any, with each line, by line id. */
  protected readonly issueByLine = computed(
    () => new Map<string, Issue>(this.cart.issues().map((issue) => [issue.line.id, issue])),
  );

  protected issueOf(line: Line): Issue | undefined {
    return this.issueByLine().get(line.id);
  }

  protected edit(line: Line): void {
    const issue = this.issueOf(line);
    this.dialog.open(AddToCartDialog, {
      width: 'min(28rem, calc(100vw - 2rem))',
      ...FORM_DIALOG,
      data: {
        mode: 'edit',
        recipeId: line.recipe?.id ?? '',
        recipeName: line.recipeName,
        availableServings: issue?.maxOrderableQuantity ?? DEFAULT_MAX_QUANTITY,
        lineId: line.id,
        quantity: line.quantity,
        note: line.note,
      },
    });
  }

  protected async remove(line: Line): Promise<void> {
    const confirmed = await this.confirm.ask({
      titleKey: 'cart.remove.title',
      messageKey: 'cart.remove.message',
      confirmKey: 'cart.remove.confirm',
      params: { name: line.recipeName },
      tone: 'danger',
    });
    if (!confirmed) return;
    await this.run(async () => {
      await this.cart.removeLine(line.id);
      this.notifications.info('cart.removed', { name: line.recipeName });
    });
  }

  /** For a line that can only be partly made: order as many as can be. */
  protected async fitToStock(line: Line, max: number): Promise<void> {
    await this.run(() => this.cart.updateLine(line.id, max, line.note));
  }

  protected async cancel(): Promise<void> {
    const confirmed = await this.confirm.ask({
      titleKey: 'cart.cancel.title',
      messageKey: 'cart.cancel.message',
      confirmKey: 'cart.cancel.confirm',
      tone: 'danger',
    });
    if (!confirmed) return;
    await this.run(async () => {
      await this.cart.cancel();
      this.notifications.info('cart.cancelled');
    });
  }

  protected async checkout(): Promise<void> {
    if (!this.cart.canCheckout()) return;
    const total = formatIdr(this.cart.totalIdr(), this.language.locale());
    const confirmed = await this.confirm.ask({
      titleKey: 'cart.checkout.title',
      messageKey: 'cart.checkout.message',
      confirmKey: 'cart.checkout.confirm',
      params: { total },
    });
    if (!confirmed) return;

    await this.run(async () => {
      this.placed.set(await this.cart.checkout());
    });
  }

  protected openTopUp(): void {
    this.dialog.open(TopUpDialog, {
      width: 'min(28rem, calc(100vw - 2rem))',
      ...FORM_DIALOG,
    });
  }

  protected startAgain(): void {
    this.placed.set(null);
  }

  /**
   * Runs an action and shows a failure as a translated message. The store reloads the
   * cart after a refused checkout, so what is on screen is the server's current state.
   */
  private async run(action: () => Promise<void>): Promise<void> {
    try {
      await action();
    } catch (error) {
      this.notifications.fromError(error);
    }
  }
}
