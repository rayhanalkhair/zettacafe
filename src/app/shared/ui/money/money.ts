import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { formatIdr, injectLocale } from '../locale';

/**
 * A price. With a `listPrice` above the price it shows the old amount struck through
 * and says so in words for screen readers ("Was Rp 52.000, now Rp 41.600"), because
 * strikethrough alone is not announced.
 */
@Component({
  selector: 'zc-money',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    @if (discounted()) {
      <del class="was">
        <span class="visually-hidden">{{ 'ui.money.was' | translate: { price: listText() } }}</span>
        <span aria-hidden="true">{{ listText() }}</span>
      </del>
      <span class="now">
        <span class="visually-hidden">{{ 'ui.money.now' | translate: { price: text() } }}</span>
        <span aria-hidden="true">{{ text() }}</span>
      </span>
    } @else {
      <span class="now">{{ text() }}</span>
    }
  `,
  styleUrl: './money.scss',
})
export class Money {
  readonly value = input.required<number>();
  /** The undiscounted price, when there is a discount. */
  readonly listPrice = input<number | null>(null);

  private readonly locale = injectLocale();

  protected readonly text = computed(() => formatIdr(this.value(), this.locale()));
  protected readonly listText = computed(() => formatIdr(this.listPrice() ?? 0, this.locale()));
  protected readonly discounted = computed(() => {
    const list = this.listPrice();
    return list !== null && list > this.value();
  });
}
