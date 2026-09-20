import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule, type FormControl } from '@angular/forms';
import { MatError, MatFormField, MatHint, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FieldErrors } from './field-errors';

/**
 * A numeric input. The value is a number or null (empty), never a string, so
 * validators like `min` and `max` compare numbers. `suffix` shows a unit such as
 * "servings" after the value.
 */
@Component({
  selector: 'zc-number-field',
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
  ],
  template: `
    <mat-form-field>
      <mat-label>{{ label() }}</mat-label>
      <input
        matInput
        type="number"
        inputmode="numeric"
        [formControl]="control()"
        [attr.min]="min()"
        [attr.max]="max()"
        [attr.step]="step()"
      />
      @if (suffix()) {
        <span matSuffix class="suffix">{{ suffix() }}</span>
      }
      @if (hint()) {
        <mat-hint>{{ hint() }}</mat-hint>
      }
      <mat-error><zc-field-errors [control]="control()" /></mat-error>
    </mat-form-field>
  `,
  styles:
    ':host { display: block; } mat-form-field { inline-size: 100%; } .suffix { padding-inline-end: 1rem; }',
})
export class NumberField {
  readonly control = input.required<FormControl<number | null>>();
  readonly label = input.required<string>();
  readonly hint = input<string | null>(null);
  readonly suffix = input<string | null>(null);
  readonly min = input<number | null>(null);
  readonly max = input<number | null>(null);
  readonly step = input<number>(1);
}
