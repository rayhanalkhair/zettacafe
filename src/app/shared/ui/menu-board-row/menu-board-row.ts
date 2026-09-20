import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LOW_STOCK_THRESHOLD, type MenuItem } from '../menu-item';
import { Money } from '../money/money';
import { StatusPill } from '../status-pill/status-pill';

/**
 * One dish on the menu board: the name, a rule, the price on the right, the way a
 * warung menu is written. It replaces v1's grid of identical 200x220 cards whose
 * circular images were pulled out by hand-tuned pixel offsets, which broke at any
 * other width. The action (add to cart) is projected so this stays presentational.
 */
@Component({
  selector: 'zc-menu-board-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Money, StatusPill, TranslatePipe],
  template: `
    <article class="row" [class.sold-out]="!item().isAvailable">
      @if (item().imageUrl; as src) {
        <img class="photo" [src]="src" alt="" width="72" height="72" loading="lazy" />
      }
      <div class="text">
        @switch (headingLevel()) {
          @case (2) {
            <h2 class="name">{{ item().name }}</h2>
          }
          @case (4) {
            <h4 class="name">{{ item().name }}</h4>
          }
          @default {
            <h3 class="name">{{ item().name }}</h3>
          }
        }
        <p class="description">{{ item().description }}</p>
        <div class="flags">
          @if (!item().isAvailable) {
            <zc-status-pill tone="danger" [label]="'ui.status.soldOut' | translate" />
          } @else if (low()) {
            <zc-status-pill
              tone="warning"
              [label]="'ui.status.lowStock' | translate: { count: item().availableServings }"
            />
          }
          @if (item().discountPercent > 0) {
            <zc-status-pill
              tone="positive"
              [label]="'ui.money.discount' | translate: { percent: item().discountPercent }"
            />
          }
        </div>
      </div>
      <div class="price">
        <zc-money [value]="item().discountedPriceIdr" [listPrice]="item().priceIdr" />
      </div>
      <div class="action"><ng-content select="[zcRowAction]" /></div>
    </article>
  `,
  styleUrl: './menu-board-row.scss',
})
export class MenuBoardRow {
  readonly item = input.required<MenuItem>();
  /** Match the page: a dish is one level below the heading it sits under. */
  readonly headingLevel = input<2 | 3 | 4>(3);

  protected readonly low = computed(
    () => this.item().isAvailable && this.item().availableServings <= LOW_STOCK_THRESHOLD,
  );
}
