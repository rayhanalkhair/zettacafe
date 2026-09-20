import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { EmptyState, ErrorState, LoadingPane } from '../states/states';

export type TableState = 'loading' | 'error' | 'empty' | 'ready';

/**
 * Owns the four states of any data table so a page cannot mix them up: loading,
 * error (with retry), empty, or the table itself. They are mutually exclusive,
 * which is what fixes v1's empty-state flash while data was still arriving.
 *
 * The column definitions stay in the feature's own template, so `strictTemplates`
 * can check them against the row type. On a narrow screen the table scrolls inside
 * its own container and the page never scrolls sideways.
 */
@Component({
  selector: 'zc-table-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyState, ErrorState, LoadingPane],
  template: `
    <div [attr.aria-busy]="state() === 'loading'">
      @switch (state()) {
        @case ('loading') {
          <zc-loading-pane />
        }
        @case ('error') {
          <zc-error-state
            [heading]="errorHeading()"
            [message]="errorMessage()"
            (retry)="retry.emit()"
          />
        }
        @case ('empty') {
          <zc-empty-state [heading]="emptyHeading()" [message]="emptyMessage()">
            <ng-content select="[zcEmptyAction]" />
          </zc-empty-state>
        }
        @default {
          <div class="scroll" tabindex="0" role="region" [attr.aria-label]="label()">
            <ng-content />
          </div>
        }
      }
    </div>
  `,
  styleUrl: './table-shell.scss',
})
export class TableShell {
  readonly state = input.required<TableState>();
  /** Accessible name for the scrollable table region. Already translated. */
  readonly label = input.required<string>();
  readonly emptyHeading = input.required<string>();
  readonly emptyMessage = input<string | null>(null);
  readonly errorHeading = input.required<string>();
  readonly errorMessage = input<string | null>(null);

  readonly retry = output<void>();
}
