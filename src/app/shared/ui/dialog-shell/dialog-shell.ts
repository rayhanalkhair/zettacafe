import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * The frame every dialog shares: a titled header with a close button, the body, and
 * an actions row. v1 copied a six-line header and nine-line footer into each dialog
 * and closed them with `<a (click)>`, which no keyboard can reach.
 *
 * `mat-dialog-title` names the dialog for assistive technology; Material traps focus,
 * closes on Escape and returns focus to the opener. Put the buttons in an element
 * marked `zcDialogActions`.
 */
@Component({
  selector: 'zc-dialog-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle, TranslatePipe],
  template: `
    <header class="head">
      <h2 mat-dialog-title>{{ heading() }}</h2>
      <button
        type="button"
        class="close"
        [mat-dialog-close]="undefined"
        [aria-label]="'ui.close' | translate"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
          <path d="M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" stroke-width="2" />
        </svg>
      </button>
    </header>
    <mat-dialog-content
      [attr.tabindex]="readOnly() ? 0 : null"
      [attr.role]="readOnly() ? 'region' : null"
      [attr.aria-label]="readOnly() ? heading() : null"
    >
      <ng-content />
    </mat-dialog-content>
    <mat-dialog-actions align="end"><ng-content select="[zcDialogActions]" /></mat-dialog-actions>
  `,
  styleUrl: './dialog-shell.scss',
})
export class DialogShell {
  /** Already-translated title. */
  readonly heading = input.required<string>();
  /**
   * True for a dialog with nothing to interact with in its body (a detail view). Its
   * scrolling body then takes a tab stop, and a name, so a keyboard user can scroll it
   * (WCAG 2.1.1). A form needs no such stop: its fields are already focusable.
   */
  readonly readOnly = input(false);
}
