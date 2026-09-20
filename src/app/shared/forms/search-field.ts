import { ChangeDetectionStrategy, Component, effect, input } from '@angular/core';
import { outputFromObservable } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';

/** How long typing must pause before a search is emitted. */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * A search box that emits the term once typing pauses. v1's admin tables queried the
 * server on every keystroke and bound the input twice (`[formControl]` and
 * `[(ngModel)]` together), which Angular 17 removed. It owns one FormControl, and the
 * debounce is built in so no caller can forget it.
 */
@Component({
  selector: 'zc-search-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatFormField, MatInput, MatLabel, ReactiveFormsModule],
  template: `
    <div role="search">
      <mat-form-field>
        <mat-label>{{ label() }}</mat-label>
        <input matInput type="search" autocomplete="off" [formControl]="control" />
      </mat-form-field>
    </div>
  `,
  styles: ':host { display: block; } mat-form-field { inline-size: 100%; }',
})
export class SearchField {
  /** Already translated. */
  readonly label = input.required<string>();
  /** Sets the box, e.g. to restore a term from the URL. Does not emit. */
  readonly value = input('');

  protected readonly control = new FormControl('', { nonNullable: true });

  /** The trimmed term, after typing pauses and only when it changed. */
  readonly search = outputFromObservable(
    this.control.valueChanges.pipe(
      map((term) => term.trim()),
      debounceTime(SEARCH_DEBOUNCE_MS),
      distinctUntilChanged(),
    ),
  );

  constructor() {
    effect(() => {
      const value = this.value();
      if (this.control.value !== value) this.control.setValue(value, { emitEvent: false });
    });
  }
}
