import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type PillTone = 'positive' | 'neutral' | 'warning' | 'danger';

/**
 * A short status. Meaning is carried by the word AND a distinct shape, never by
 * colour alone (WCAG 1.4.1). v1 showed publish state as a green or red icon
 * ligature and nothing else.
 */
@Component({
  selector: 'zc-status-pill',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="pill" [attr.data-tone]="tone()">
      <span class="shape" aria-hidden="true"></span>
      {{ label() }}
    </span>
  `,
  styleUrl: './status-pill.scss',
})
export class StatusPill {
  /** Already-translated text. */
  readonly label = input.required<string>();
  readonly tone = input<PillTone>('neutral');
}
