import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * A polite live region with a spinner. Loading and empty are separate components on
 * purpose: v1 showed "your cart is empty" while data was still arriving, because
 * both were the same condition.
 */
@Component({
  selector: 'zc-loading-pane',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressSpinner, TranslatePipe],
  template: `
    <div class="pane" role="status">
      <mat-progress-spinner mode="indeterminate" [diameter]="28" aria-hidden="true" />
      <span>{{ label() ?? ('ui.loading' | translate) }}</span>
    </div>
  `,
  styleUrl: './states.scss',
})
export class LoadingPane {
  /** Already-translated; defaults to the generic "Loading…". */
  readonly label = input<string | null>(null);
}

/** Nothing to show yet, with the next step as a projected action. */
@Component({
  selector: 'zc-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pane">
      <p class="title">{{ heading() }}</p>
      @if (message()) {
        <p class="message">{{ message() }}</p>
      }
      <div class="actions"><ng-content /></div>
    </div>
  `,
  styleUrl: './states.scss',
})
export class EmptyState {
  readonly heading = input.required<string>();
  readonly message = input<string | null>(null);
}

/** Something failed: says what, and offers a retry. Announced assertively. */
@Component({
  selector: 'zc-error-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButton, TranslatePipe],
  template: `
    <div class="pane" role="alert">
      <p class="title">{{ heading() }}</p>
      @if (message()) {
        <p class="message">{{ message() }}</p>
      }
      <div class="actions">
        <button matButton="tonal" type="button" (click)="retry.emit()">
          {{ 'ui.retry' | translate }}
        </button>
        <ng-content />
      </div>
    </div>
  `,
  styleUrl: './states.scss',
})
export class ErrorState {
  readonly heading = input.required<string>();
  readonly message = input<string | null>(null);
  readonly retry = output<void>();
}
