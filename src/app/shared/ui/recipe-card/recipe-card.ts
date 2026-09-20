import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import type { MenuItem } from '../menu-item';
import { Money } from '../money/money';
import { StatusPill } from '../status-pill/status-pill';

/**
 * A dish as a card, for the places where card-ness is earned: the home page's
 * featured and discounted dishes. The menu itself is a board (MenuBoardRow).
 *
 * Purely presentational. v1's card computed its state in ngOnInit and the home page
 * re-implemented the same card inline in 32 lines of template; both now use this.
 */
@Component({
  selector: 'zc-recipe-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Money, StatusPill, TranslatePipe],
  template: `
    <article class="card">
      @if (item().imageUrl; as src) {
        <img class="photo" [src]="src" alt="" width="320" height="240" loading="lazy" />
      } @else {
        <div class="photo placeholder" aria-hidden="true"></div>
      }
      <div class="body">
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
          }
          @if (item().discountPercent > 0) {
            <zc-status-pill
              tone="positive"
              [label]="'ui.money.discount' | translate: { percent: item().discountPercent }"
            />
          }
        </div>
        <div class="foot">
          <zc-money [value]="item().discountedPriceIdr" [listPrice]="item().priceIdr" />
          <ng-content select="[zcCardAction]" />
        </div>
      </div>
    </article>
  `,
  styleUrl: './recipe-card.scss',
})
export class RecipeCard {
  readonly item = input.required<MenuItem>();
  /** Match the page: a dish is one level below the heading it sits under. */
  readonly headingLevel = input<2 | 3 | 4>(3);
}
