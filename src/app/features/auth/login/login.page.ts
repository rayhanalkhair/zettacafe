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

@Component({
  selector: 'zc-login-page',
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
  templateUrl: './login.page.html',
  styleUrl: '../auth-form.scss',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly session = inject(SessionStore);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected readonly submitting = signal(false);
  protected readonly failure = signal<UserMessage | null>(null);

  /** Carried through the sign-in so a guest lands where they were headed. */
  protected readonly returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

  protected async submit(): Promise<void> {
    this.failure.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // Focus after Material has rendered the invalid state.
      queueMicrotask(() => focusFirstInvalid(this.host.nativeElement));
      return;
    }

    this.submitting.set(true);
    try {
      await this.auth.signIn(this.form.getRawValue());
      this.notifications.success('auth.welcome', { name: this.session.displayName() });
      await this.router.navigateByUrl(safeReturnUrl(this.returnUrl));
    } catch (error) {
      this.failure.set(toUserMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }
}
