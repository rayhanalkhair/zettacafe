import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { toUserMessage, type UserMessage } from '@core/errors/to-user-message';
import { CartStore } from '@core/cart/cart.store';
import { NotificationService } from '@core/feedback/notification.service';
import { focusFirstInvalid } from '@shared/forms/focus-first-invalid';
import { NumberField } from '@shared/forms/number-field';
import { TextField } from '@shared/forms/text-field';
import { DialogShell } from '@shared/ui/dialog-shell/dialog-shell';

/** The server's limits (see order.resolvers.ts). */
export const QUANTITY_MAX = 99;
export const NOTE_MAX = 200;

export interface AddToCartData {
  /** `add` puts a dish in the cart; `edit` changes a line already in it. */
  readonly mode: 'add' | 'edit';
  readonly recipeId: string;
  readonly recipeName: string;
  /** Servings that can be made right now. Caps the quantity that can be asked for. */
  readonly availableServings: number;
  /** Required for `edit`: the cart line to change. */
  readonly lineId?: string;
  readonly quantity?: number;
  readonly note?: string | null;
}

/**
 * One dialog for adding a dish and for editing a cart line. v1 had two copies, and
 * the second (`cart-edit`) was an untranslated duplicate of the first. Resolves to
 * true when the cart was changed.
 */
@Component({
  selector: 'zc-add-to-cart-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogShell, MatButton, NumberField, ReactiveFormsModule, TextField, TranslatePipe],
  templateUrl: './add-to-cart.dialog.html',
  styleUrl: './add-to-cart.dialog.scss',
})
export class AddToCartDialog {
  protected readonly data = inject<AddToCartData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<AddToCartDialog, boolean>>(MatDialogRef);
  private readonly cart = inject(CartStore);
  private readonly notifications = inject(NotificationService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** No more than can be made, and never more than the server accepts. */
  protected readonly maxQuantity = Math.max(1, Math.min(QUANTITY_MAX, this.data.availableServings));

  protected readonly form = new FormGroup({
    quantity: new FormControl<number | null>(this.data.quantity ?? 1, [
      Validators.required,
      Validators.min(1),
      Validators.max(this.maxQuantity),
    ]),
    note: new FormControl(this.data.note ?? '', {
      nonNullable: true,
      validators: [Validators.maxLength(NOTE_MAX)],
    }),
  });

  /** The words for this mode. Keys, so the i18n check can see every one of them. */
  protected readonly labels =
    this.data.mode === 'edit'
      ? { titleKey: 'cartDialog.editTitle', submitKey: 'cartDialog.save' }
      : { titleKey: 'cartDialog.addTitle', submitKey: 'cartDialog.add' };

  protected readonly submitting = signal(false);
  protected readonly failure = signal<UserMessage | null>(null);

  protected async submit(): Promise<void> {
    this.failure.set(null);
    const quantity = this.form.controls.quantity.value;
    if (this.form.invalid || quantity === null) {
      this.form.markAllAsTouched();
      queueMicrotask(() => focusFirstInvalid(this.host.nativeElement));
      return;
    }

    const note = this.form.controls.note.value.trim() || null;
    this.submitting.set(true);
    try {
      if (this.data.mode === 'edit' && this.data.lineId) {
        await this.cart.updateLine(this.data.lineId, quantity, note);
        this.notifications.success('cartDialog.saved', { name: this.data.recipeName });
      } else {
        await this.cart.addLine(this.data.recipeId, quantity, note);
        this.notifications.success('cartDialog.added', { name: this.data.recipeName });
      }
      this.ref.close(true);
    } catch (error) {
      this.failure.set(toUserMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }
}
