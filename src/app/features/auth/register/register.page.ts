import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '@core/auth/auth.service';
import { SessionStore } from '@core/auth/session.store';
import { toUserMessage, type UserMessage } from '@core/errors/to-user-message';
import { NotificationService } from '@core/feedback/notification.service';
import { focusFirstInvalid } from '@shared/forms/focus-first-invalid';
import { PasswordField } from '@shared/forms/password-field';
import { TextField } from '@shared/forms/text-field';
import { PageShell } from '@shared/ui/page-shell/page-shell';
import { SectionHeading } from '@shared/ui/section-heading/section-heading';
import { safeReturnUrl } from '../return-url';

/** The server enforces the same minimum; this just tells the person before they submit. */
export const MIN_PASSWORD_LENGTH = 8;

@Component({
  selector: 'zc-register-page',
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
  templateUrl: './register.page.html',
  styleUrl: '../auth-form.scss',
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly session = inject(SessionStore);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly form = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)],
    }),
  });

  protected readonly submitting = signal(false);
  protected readonly failure = signal<UserMessage | null>(null);
  protected readonly returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

  protected async submit(): Promise<void> {
    this.failure.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      queueMicrotask(() => focusFirstInvalid(this.host.nativeElement));
      return;
    }

    this.submitting.set(true);
    try {
      const { firstName, lastName, email, password } = this.form.getRawValue();
      await this.auth.signUp({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
      });
      this.notifications.success('auth.registered', { name: this.session.displayName() });
      await this.router.navigateByUrl(safeReturnUrl(this.returnUrl));
    } catch (error) {
      this.failure.set(toUserMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }
}
