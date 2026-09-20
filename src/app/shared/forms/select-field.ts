import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule, type FormControl } from '@angular/forms';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatSelect, MatOption } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { FieldErrors } from './field-errors';

export interface SelectOption {
  readonly value: string;
  /** Already translated. Use this for data (a name from the server). */
  readonly label?: string;
  /** An i18n key. Use this for fixed choices, so they follow the language. */
  readonly labelKey?: string;
}

/**
 * A labelled choice from a list, bound to a typed FormControl. Uses Material's select,
 * which is a real `combobox` with a listbox, so it is keyboard and screen reader
 * operable, and validates and shows its error like every other field.
 */
@Component({
  selector: 'zc-select-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FieldErrors,
    MatError,
    MatFormField,
    MatHint,
    MatLabel,
    MatOption,
    MatSelect,
    ReactiveFormsModule,
    TranslatePipe,
  ],
  template: `
    <mat-form-field>
      <mat-label>{{ label() }}</mat-label>
      <mat-select [formControl]="control()">
        @for (option of options(); track option.value) {
          <mat-option [value]="option.value">{{
            option.labelKey ? (option.labelKey | translate) : option.label
          }}</mat-option>
        }
      </mat-select>
      @if (hint()) {
        <mat-hint>{{ hint() }}</mat-hint>
      }
      <mat-error><zc-field-errors [control]="control()" /></mat-error>
    </mat-form-field>
  `,
  styles: ':host { display: block; } mat-form-field { inline-size: 100%; }',
})
export class SelectField {
  readonly control = input.required<FormControl<string>>();
  /** Already translated. */
  readonly label = input.required<string>();
  readonly hint = input<string | null>(null);
  readonly options = input.required<readonly SelectOption[]>();
}
