import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A heading with a rule beneath it, and an optional slot for actions on the right.
 * `level` picks the real element (h1 to h4), so the visual size is a design choice
 * and the document outline stays correct.
 */
@Component({
  selector: 'zc-section-heading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="row">
      @switch (level()) {
        @case (1) {
          <h1 [id]="headingId()">{{ heading() }}</h1>
        }
        @case (3) {
          <h3 [id]="headingId()">{{ heading() }}</h3>
        }
        @case (4) {
          <h4 [id]="headingId()">{{ heading() }}</h4>
        }
        @default {
          <h2 [id]="headingId()">{{ heading() }}</h2>
        }
      }
      <div class="actions"><ng-content /></div>
    </div>
  `,
  styleUrl: './section-heading.scss',
})
export class SectionHeading {
  /** Already-translated text; callers pass `'key' | translate`. */
  readonly heading = input.required<string>();
  readonly level = input<1 | 2 | 3 | 4>(2);
  /** Lets a region point `aria-labelledby` at this heading. */
  readonly headingId = input<string | null>(null);
}
