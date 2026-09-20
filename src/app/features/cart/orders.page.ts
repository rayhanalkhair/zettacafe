import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { from } from 'rxjs';
import { SessionStore } from '@core/auth/session.store';
import { ZcCurrencyPipe, ZcDatePipe } from '@core/i18n/zc-formatting.pipes';
import { PageShell } from '@shared/ui/page-shell/page-shell';
import { Pager } from '@shared/ui/pager/pager';
import { SectionHeading } from '@shared/ui/section-heading/section-heading';
import { EmptyState, ErrorState, LoadingPane } from '@shared/ui/states/states';
import { ORDERS_PAGE_SIZE, OrdersService } from './orders.service';

type View = 'loading' | 'error' | 'empty' | 'ready';

/**
 * Placed orders, newest first, three to a page. The page number is in the URL. An
 * admin also sees the finance summary (the server refuses it to anyone else, so it is
 * only asked for when the role says so).
 */
@Component({
  selector: 'zc-orders-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    EmptyState,
    ErrorState,
    LoadingPane,
    MatButton,
    PageShell,
    Pager,
    RouterLink,
    SectionHeading,
    TranslatePipe,
    ZcCurrencyPipe,
    ZcDatePipe,
  ],
  templateUrl: './orders.page.html',
  styleUrl: './orders.page.scss',
})
export class OrdersPage {
  /** The `page` query parameter, bound by the router. */
  readonly page = input<string | undefined>();

  protected readonly session = inject(SessionStore);
  private readonly orders = inject(OrdersService);
  private readonly router = inject(Router);

  protected readonly pageSize = ORDERS_PAGE_SIZE;
  protected readonly pageNumber = computed(() =>
    Math.max(1, Number.parseInt(this.page() ?? '1', 10) || 1),
  );
  protected readonly offset = computed(() => (this.pageNumber() - 1) * ORDERS_PAGE_SIZE);

  protected readonly history = rxResource({
    params: () => ({ offset: this.offset() }),
    stream: ({ params }) => from(this.orders.load(params.offset)),
  });

  /** Idle (no request) unless the signed-in user is an admin. */
  protected readonly finance = rxResource({
    params: () => (this.session.isAdmin() ? true : undefined),
    stream: () => from(this.orders.finance()),
  });

  protected readonly items = computed(() => this.history.value()?.items ?? []);
  protected readonly total = computed(() => this.history.value()?.totalCount ?? 0);

  protected readonly view = computed<View>(() => {
    if (this.history.error()) return 'error';
    if (!this.history.hasValue()) return 'loading';
    return this.items().length === 0 ? 'empty' : 'ready';
  });

  protected setOffset(offset: number): void {
    const page = offset / ORDERS_PAGE_SIZE + 1;
    void this.router.navigate([], {
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
  }
}
