import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
  type ValidationErrors,
} from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { toUserMessage, type UserMessage } from '@core/errors/to-user-message';
import { NotificationService } from '@core/feedback/notification.service';
import { focusFirstInvalid } from '@shared/forms/focus-first-invalid';
import { NumberField } from '@shared/forms/number-field';
import { TextField } from '@shared/forms/text-field';
import { DialogShell } from '@shared/ui/dialog-shell/dialog-shell';
import { IngredientsService, type Ingredient } from './ingredients.service';

/** The server's limits (see ingredient.resolvers.ts). */
export const NAME_MAX = 80;
export const UNIT_MAX = 16;
export const STOCK_MAX = 1_000_000;

export interface IngredientFormData {
  /** `create` adds an ingredient; `edit` changes the one given. */
  readonly mode: 'create' | 'edit';
  readonly ingredient?: Ingredient;
}

/** A whole number. Stock is counted in whole grams, millilitres or pieces. */
function integer(control: AbstractControl<number | null>): ValidationErrors | null {
  const value = control.value;
  return value === null || Number.isInteger(value)
    ? null
    : { integer: { messageKey: 'ingredients.form.integer' } };
}

/**
 * One dialog for adding and editing an ingredient. v1 had two copies that differed
 * by a single line (and that line was itself a lost translation). Resolves to true
 * when something was saved.
 */
@Component({
  selector: 'zc-ingredient-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogShell, MatButton, NumberField, ReactiveFormsModule, TextField, TranslatePipe],
  templateUrl: './ingredient-form.dialog.html',
  styleUrl: './ingredient-form.dialog.scss',
})
export class IngredientFormDialog {
  protected readonly data = inject<IngredientFormData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<IngredientFormDialog, boolean>>(MatDialogRef);
  private readonly ingredients = inject(IngredientsService);
  private readonly notifications = inject(NotificationService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly form = new FormGroup({
    name: new FormControl(this.data.ingredient?.name ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(NAME_MAX)],
    }),
    stockQty: new FormControl<number | null>(this.data.ingredient?.stockQty ?? 0, [
      Validators.required,
      Validators.min(0),
      Validators.max(STOCK_MAX),
      integer,
    ]),
    unit: new FormControl(this.data.ingredient?.unit ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(UNIT_MAX)],
    }),
  });

  /** The words for this mode. Keys, so the i18n check can see every one of them. */
  protected readonly labels =
    this.data.mode === 'edit'
      ? { titleKey: 'ingredients.form.editTitle', submitKey: 'ingredients.form.save' }
      : { titleKey: 'ingredients.form.createTitle', submitKey: 'ingredients.form.create' };

  protected readonly submitting = signal(false);
  protected readonly failure = signal<UserMessage | null>(null);

  protected async submit(): Promise<void> {
    this.failure.set(null);
    const { name, stockQty, unit } = this.form.getRawValue();
    if (this.form.invalid || stockQty === null) {
      this.form.markAllAsTouched();
      queueMicrotask(() => focusFirstInvalid(this.host.nativeElement));
      return;
    }

    const input = { name: name.trim(), stockQty, unit: unit.trim() };
    this.submitting.set(true);
    try {
      if (this.data.mode === 'edit' && this.data.ingredient) {
        await this.ingredients.update(this.data.ingredient.id, input);
        this.notifications.success('ingredients.form.saved', { name: input.name });
      } else {
        await this.ingredients.create(input);
        this.notifications.success('ingredients.form.created', { name: input.name });
      }
      this.ref.close(true);
    } catch (error) {
      this.failure.set(toUserMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }
}
