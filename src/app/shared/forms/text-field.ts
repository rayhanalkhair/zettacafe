import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule, type FormControl } from '@angular/forms';
import { MatFormField, MatHint, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FieldErrors } from './field-errors';

/**
 * A labelled text input bound to a typed FormControl, with its validation message.
 * Every field in the app goes through this or its siblings, so labels, errors and
 * autocomplete hints are consistent and none can be forgotten.
 */
@Component({
  selector: 'zc-text-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FieldErrors, MatError, MatFormField, MatHint, MatInput, MatLabel, ReactiveFormsModule],
  template: `
    <mat-form-field>
      <mat-label>{{ label() }}</mat-label>
      <input
        matInput
        [type]="type()"
        [formControl]="control()"
        [attr.autocomplete]="autocomplete()"
        [attr.inputmode]="inputmode()"
      />
      @if (hint()) {
        <mat-hint>{{ hint() }}</mat-hint>
      }
      <mat-error><zc-field-errors [control]="control()" /></mat-error>
    </mat-form-field>
  `,
  styles: ':host { display: block; } mat-form-field { inline-size: 100%; }',
})
export class TextField {
  readonly control = input.required<FormControl<string>>();
  /** Already translated. */
  readonly label = input.required<string>();
  readonly hint = input<string | null>(null);
  readonly type = input<'text' | 'email' | 'tel' | 'url'>('text');
  /** An HTML autocomplete token, e.g. `email`, `given-name`, `off`. */
  readonly autocomplete = input<string | null>(null);
  readonly inputmode = input<string | null>(null);
}
