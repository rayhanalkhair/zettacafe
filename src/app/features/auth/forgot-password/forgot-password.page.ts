import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '@core/auth/auth.service';
import { toUserMessage, type UserMessage } from '@core/errors/to-user-message';
import { NotificationService } from '@core/feedback/notification.service';
import { focusFirstInvalid } from '@shared/forms/focus-first-invalid';
import { PasswordField } from '@shared/forms/password-field';
import { TextField } from '@shared/forms/text-field';
import { PageShell } from '@shared/ui/page-shell/page-shell';
import { SectionHeading } from '@shared/ui/section-heading/section-heading';
import { MIN_PASSWORD_LENGTH } from '../register/register.page';

type Step = 'request' | 'reset';

/**
 * Two steps on one page: ask for a code, then use it. v1 did this in a dialog, which
 * cannot be linked to or reloaded. The server has no mailer, so in demo mode the
 * code comes back in the response and is shown here (a real mailer would return
 * null, and the notice simply would not render).
 */
@Component({
  selector: 'zc-forgot-password-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButton,
    PageShell,
    PasswordField,
    ReactiveFormsModule,
    RouterLink,
    SectionHeading,
    TextField,
    TranslatePipe,
  ],
  templateUrl: './forgot-password.page.html',
  styleUrl: '../auth-form.scss',
})
export class ForgotPasswordPage {
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly step = signal<Step>('request');
  protected readonly demoCode = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly failure = signal<UserMessage | null>(null);

  protected readonly requestForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  protected readonly resetForm = new FormGroup({
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{4}$/)],
    }),
    newPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)],
    }),
  });

  protected async requestCode(): Promise<void> {
    this.failure.set(null);
    if (this.requestForm.invalid) return this.reject(this.requestForm);

    this.submitting.set(true);
    try {
      const challenge = await this.auth.requestPasswordReset(
        this.requestForm.controls.email.value.trim(),
      );
      this.demoCode.set(challenge.demoCode ?? null);
      this.step.set('reset');
    } catch (error) {
      this.failure.set(toUserMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  protected async resetPassword(): Promise<void> {
    this.failure.set(null);
    if (this.resetForm.invalid) return this.reject(this.resetForm);

    this.submitting.set(true);
    try {
      await this.auth.resetPassword({
        email: this.requestForm.controls.email.value.trim(),
        code: this.resetForm.controls.code.value.trim(),
        newPassword: this.resetForm.controls.newPassword.value,
      });
      this.notifications.success('auth.forgot.done');
      await this.router.navigateByUrl('/login');
    } catch (error) {
      this.failure.set(toUserMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  /** Back to step one, e.g. the email was wrong. */
  protected changeEmail(): void {
    this.failure.set(null);
    this.demoCode.set(null);
    this.resetForm.reset();
    this.step.set('request');
  }

  private reject(form: FormGroup): void {
    form.markAllAsTouched();
    queueMicrotask(() => focusFirstInvalid(this.host.nativeElement));
  }
}
