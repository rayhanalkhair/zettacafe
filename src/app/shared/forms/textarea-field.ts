import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule, type FormControl } from '@angular/forms';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FieldErrors } from './field-errors';

/** A labelled multi-line text field bound to a typed FormControl. */
@Component({
  selector: 'zc-textarea-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FieldErrors, MatError, MatFormField, MatHint, MatInput, MatLabel, ReactiveFormsModule],
  template: `
    <mat-form-field>
      <mat-label>{{ label() }}</mat-label>
      <textarea matInput [rows]="rows()" [formControl]="control()"></textarea>
      @if (hint()) {
        <mat-hint>{{ hint() }}</mat-hint>
      }
      <mat-error><zc-field-errors [control]="control()" /></mat-error>
    </mat-form-field>
  `,
  styles: ':host { display: block; } mat-form-field { inline-size: 100%; }',
})
export class TextareaField {
  readonly control = input.required<FormControl<string>>();
  /** Already translated. */
  readonly label = input.required<string>();
  readonly hint = input<string | null>(null);
  readonly rows = input(3);
}
