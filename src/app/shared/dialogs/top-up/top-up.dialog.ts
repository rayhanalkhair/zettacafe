import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '@core/auth/auth.service';
import { toUserMessage, type UserMessage } from '@core/errors/to-user-message';
import { NotificationService } from '@core/feedback/notification.service';
import { LanguageStore } from '@core/i18n/language.store';
import { focusFirstInvalid } from '@shared/forms/focus-first-invalid';
import { NumberField } from '@shared/forms/number-field';
import { DialogShell } from '@shared/ui/dialog-shell/dialog-shell';
import { formatIdr } from '@shared/ui/locale';

/** The server's limits (see topUpCredit in schema.graphql). */
export const TOP_UP_MIN_IDR = 1_000;
export const TOP_UP_MAX_IDR = 10_000_000;

const PRESETS_IDR = [25_000, 50_000, 100_000, 250_000] as const;

/**
 * Add spendable credit. Opened from the header. Quick amounts fill the field, and
 * the field stays editable, so any amount in range can be entered.
 */
@Component({
  selector: 'zc-top-up-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogShell, MatButton, NumberField, ReactiveFormsModule, TranslatePipe],
  templateUrl: './top-up.dialog.html',
  styleUrl: './top-up.dialog.scss',
})
export class TopUpDialog {
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly language = inject(LanguageStore);
  private readonly ref = inject<MatDialogRef<TopUpDialog>>(MatDialogRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly form = new FormGroup({
    amount: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(TOP_UP_MIN_IDR),
      Validators.max(TOP_UP_MAX_IDR),
    ]),
  });

  protected readonly presets = PRESETS_IDR;
  protected readonly submitting = signal(false);
  protected readonly failure = signal<UserMessage | null>(null);

  protected format(value: number): string {
    return formatIdr(value, this.language.locale());
  }

  protected choose(value: number): void {
    this.form.controls.amount.setValue(value);
    this.form.controls.amount.markAsDirty();
  }

  protected async submit(): Promise<void> {
    this.failure.set(null);
    const value = this.form.controls.amount.value;
    if (this.form.invalid || value === null) {
      this.form.markAllAsTouched();
      queueMicrotask(() => focusFirstInvalid(this.host.nativeElement));
      return;
    }

    this.submitting.set(true);
    try {
      await this.auth.topUp(value);
      this.notifications.success('auth.topUp.done', { amount: this.format(value) });
      this.ref.close(true);
    } catch (error) {
      this.failure.set(toUserMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }
}
