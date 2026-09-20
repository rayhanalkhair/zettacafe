import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Previous and next with "Page x of y". It speaks the server's paging (offset and
 * limit) so a feature can bind it straight to a query, and renders nothing when
 * everything fits on one page.
 */
@Component({
  selector: 'zc-pager',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButton, TranslatePipe],
  template: `
    @if (pages() > 1) {
      <nav class="pager" [attr.aria-label]="'ui.page.label' | translate">
        <button
          matButton="outlined"
          type="button"
          [disabled]="page() <= 1"
          (click)="go(page() - 1)"
        >
          {{ 'ui.page.previous' | translate }}
        </button>
        <span class="status" role="status">
          {{ 'ui.page.status' | translate: { page: page(), pages: pages() } }}
        </span>
        <button
          matButton="outlined"
          type="button"
          [disabled]="page() >= pages()"
          (click)="go(page() + 1)"
        >
          {{ 'ui.page.next' | translate }}
        </button>
      </nav>
    }
  `,
  styleUrl: './pager.scss',
})
export class Pager {
  readonly offset = input.required<number>();
  readonly limit = input.required<number>();
  readonly total = input.required<number>();

  /** The new offset. */
  readonly offsetChange = output<number>();

  /** 1-based. */
  protected readonly page = computed(() => Math.floor(this.offset() / this.limit()) + 1);
  protected readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit())));

  protected go(page: number): void {
    const clamped = Math.min(Math.max(page, 1), this.pages());
    this.offsetChange.emit((clamped - 1) * this.limit());
  }
}
