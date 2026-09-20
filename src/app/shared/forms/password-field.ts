import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { ReactiveFormsModule, type FormControl } from '@angular/forms';
import { MatError, MatFormField, MatHint, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { FieldErrors } from './field-errors';

/**
 * A password input with a show toggle. v1 copied `onShowPassword()` into three
 * components, each reaching into the DOM with `getElementById` and rewriting the
 * input's type. Here it is one signal and a toggle button that says whether it is
 * pressed (`aria-pressed`), so a screen reader hears the state.
 */
@Component({
  selector: 'zc-password-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FieldErrors,
    MatError,
    MatFormField,
    MatHint,
    MatInput,
    MatLabel,
    MatSuffix,
    ReactiveFormsModule,
    TranslatePipe,
  ],
  template: `
    <mat-form-field>
      <mat-label>{{ label() }}</mat-label>
      <input
        matInput
        [type]="visible() ? 'text' : 'password'"
        [formControl]="control()"
        [attr.autocomplete]="autocomplete()"
      />
      <button
        matSuffix
        type="button"
        class="toggle"
        [attr.aria-pressed]="visible()"
        (click)="visible.set(!visible())"
      >
        {{ 'ui.password.show' | translate }}
      </button>
      @if (hint()) {
        <mat-hint>{{ hint() }}</mat-hint>
      }
      <mat-error><zc-field-errors [control]="control()" /></mat-error>
    </mat-form-field>
  `,
  styleUrl: './password-field.scss',
})
export class PasswordField {
  readonly control = input.required<FormControl<string>>();
  readonly label = input.required<string>();
  readonly hint = input<string | null>(null);
  /** `current-password` when signing in, `new-password` when choosing one. */
  readonly autocomplete = input<'current-password' | 'new-password'>('current-password');

  protected readonly visible = signal(false);
}
