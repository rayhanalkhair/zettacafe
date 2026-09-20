import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { from } from 'rxjs';
import { toUserMessage, type UserMessage } from '@core/errors/to-user-message';
import { NotificationService } from '@core/feedback/notification.service';
import { focusFirstInvalid } from '@shared/forms/focus-first-invalid';
import { NumberField } from '@shared/forms/number-field';
import { SelectField, type SelectOption } from '@shared/forms/select-field';
import { TextField } from '@shared/forms/text-field';
import { TextareaField } from '@shared/forms/textarea-field';
import { atLeast, httpUrl, integer, uniqueBy } from '@shared/forms/validators';
import { DialogShell } from '@shared/ui/dialog-shell/dialog-shell';
import { RecipesService, type AdminRecipe, type Category } from './recipes.service';

/** The server's limits (see recipe.resolvers.ts). */
export const NAME_MAX = 120;
export const DESCRIPTION_MAX = 500;
export const PRICE_MIN = 1_000;
export const PRICE_MAX = 10_000_000;
export const PER_SERVING_MAX = 100_000;

export interface RecipeFormData {
  /** `create` adds a recipe (as a draft); `edit` changes the one given. */
  readonly mode: 'create' | 'edit';
  readonly recipe?: AdminRecipe;
}

function ingredientRow(ingredientId = '', quantity: number | null = null) {
  return new FormGroup({
    ingredientId: new FormControl(ingredientId, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    quantity: new FormControl<number | null>(quantity, [
      Validators.required,
      Validators.min(1),
      Validators.max(PER_SERVING_MAX),
      integer,
    ]),
  });
}

type IngredientRow = ReturnType<typeof ingredientRow>;

/**
 * One dialog for adding and editing a recipe. v1 had two copies of a 139-line template
 * that differed by one line. Status has its own action (an edit can never publish by
 * accident), so a new recipe starts as a draft.
 *
 * The ingredient rows are a FormArray: choose an ingredient and how much one serving
 * uses, at least one, none repeated.
 */
@Component({
  selector: 'zc-recipe-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DialogShell,
    MatButton,
    MatCheckbox,
    NumberField,
    ReactiveFormsModule,
    SelectField,
    TextField,
    TextareaField,
    TranslatePipe,
  ],
  templateUrl: './recipe-form.dialog.html',
  styleUrl: './recipe-form.dialog.scss',
})
export class RecipeFormDialog {
  protected readonly data = inject<RecipeFormData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<RecipeFormDialog, boolean>>(MatDialogRef);
  private readonly recipes = inject(RecipesService);
  private readonly notifications = inject(NotificationService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly recipe = this.data.recipe;

  /** Every ingredient a recipe can use. */
  protected readonly ingredientOptions = rxResource({
    stream: () => from(this.recipes.ingredientOptions()),
  });

  protected readonly options = computed<SelectOption[]>(() =>
    (this.ingredientOptions.value() ?? []).map((i) => ({
      value: i.id,
      label: `${i.name} (${i.unit})`,
    })),
  );

  protected readonly categoryChoices: readonly SelectOption[] = [
    { value: 'FOOD', labelKey: 'recipes.category.food' },
    { value: 'DRINK', labelKey: 'recipes.category.drink' },
  ];

  protected readonly form = new FormGroup({
    name: new FormControl(this.recipe?.name ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(NAME_MAX)],
    }),
    category: new FormControl<string>(this.recipe?.category ?? 'FOOD', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    priceIdr: new FormControl<number | null>(this.recipe?.priceIdr ?? null, [
      Validators.required,
      Validators.min(PRICE_MIN),
      Validators.max(PRICE_MAX),
      integer,
    ]),
    discountPercent: new FormControl<number | null>(this.recipe?.discountPercent ?? 0, [
      Validators.required,
      Validators.min(0),
      Validators.max(100),
      integer,
    ]),
    imageUrl: new FormControl(this.recipe?.imageUrl ?? '', {
      nonNullable: true,
      validators: [httpUrl],
    }),
    descriptionEn: new FormControl(this.recipe?.descriptionEn ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(DESCRIPTION_MAX)],
    }),
    // The server falls back to English, so an untranslated recipe reads back as English.
    // Only a description that differs is a real translation worth showing for editing.
    descriptionId: new FormControl(
      this.recipe && this.recipe.descriptionId !== this.recipe.descriptionEn
        ? (this.recipe.descriptionId ?? '')
        : '',
      { nonNullable: true, validators: [Validators.maxLength(DESCRIPTION_MAX)] },
    ),
    isFeatured: new FormControl(this.recipe?.isFeatured ?? false, { nonNullable: true }),
    ingredients: new FormArray<IngredientRow>(
      this.recipe?.ingredients?.map((i) => ingredientRow(i.ingredient.id, i.quantity)) ?? [
        ingredientRow(),
      ],
      [
        atLeast(1, 'recipes.form.noIngredients'),
        uniqueBy<{ ingredientId: string }>((row) => row.ingredientId, 'recipes.form.duplicate'),
      ],
    ),
  });

  /** The words for this mode. Keys, so the i18n check can see every one of them. */
  protected readonly labels =
    this.data.mode === 'edit'
      ? {
          titleKey: 'recipes.form.editTitle',
          submitKey: 'recipes.form.save',
          doneKey: 'recipes.form.saved',
        }
      : {
          titleKey: 'recipes.form.createTitle',
          submitKey: 'recipes.form.create',
          doneKey: 'recipes.form.created',
        };

  protected readonly submitting = signal(false);
  protected readonly failure = signal<UserMessage | null>(null);

  protected get rows(): FormArray<IngredientRow> {
    return this.form.controls.ingredients;
  }

  /** The unit of the ingredient chosen in a row, shown beside its quantity. */
  protected unitOf(row: IngredientRow): string | null {
    const id = row.controls.ingredientId.value;
    return this.ingredientOptions.value()?.find((i) => i.id === id)?.unit ?? null;
  }

  protected addRow(): void {
    this.rows.push(ingredientRow());
  }

  protected removeRow(index: number): void {
    this.rows.removeAt(index);
  }

  protected async submit(): Promise<void> {
    this.failure.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      queueMicrotask(() => focusFirstInvalid(this.host.nativeElement));
      return;
    }

    const value = this.form.getRawValue();
    const input = {
      name: value.name.trim(),
      category: value.category as Category,
      priceIdr: value.priceIdr ?? 0,
      discountPercent: value.discountPercent ?? 0,
      imageUrl: value.imageUrl.trim() || null,
      description: { en: value.descriptionEn.trim(), id: value.descriptionId.trim() || null },
      ingredients: value.ingredients.map((row) => ({
        ingredientId: row.ingredientId,
        quantity: row.quantity ?? 0,
      })),
    };

    this.submitting.set(true);
    try {
      const saved =
        this.data.mode === 'edit' && this.recipe
          ? await this.recipes.update(this.recipe.id, input)
          : await this.recipes.create(input);
      // Featured has its own mutation, so an edit can never change it by accident.
      if (value.isFeatured !== saved.isFeatured) {
        await this.recipes.setFeatured(saved.id, value.isFeatured);
      }
      this.notifications.success(this.labels.doneKey, { name: input.name });
      this.ref.close(true);
    } catch (error) {
      this.failure.set(toUserMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }
}
