import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';

export interface ConfirmDialogData {
  /** Already translated: the service translates so this component stays presentational. */
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly tone: 'default' | 'danger';
}

/**
 * The dialog behind ConfirmService. Uses Material's dialog directives so it is
 * named for assistive technology (`mat-dialog-title` wires aria-labelledby), traps
 * focus, closes on Escape, and returns focus to whatever opened it.
 *
 * For a destructive action the safe button, Cancel, takes initial focus, so a
 * reflexive Enter does not delete anything.
 */
@Component({
  selector: 'zc-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButton, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" matButton="text" [mat-dialog-close]="false" cdkFocusInitial>
        {{ data.cancelLabel }}
      </button>
      <button
        type="button"
        matButton="filled"
        [mat-dialog-close]="true"
        [class.danger]="data.tone === 'danger'"
      >
        {{ data.confirmLabel }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .danger {
      --mat-button-filled-container-color: var(--zc-sambal);
      --mat-button-filled-label-text-color: var(--zc-on-sambal);
    }
  `,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}
