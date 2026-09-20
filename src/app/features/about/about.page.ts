import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { focusFirstInvalid } from '@shared/forms/focus-first-invalid';
import { TextField } from '@shared/forms/text-field';
import { TextareaField } from '@shared/forms/textarea-field';
import { PageShell } from '@shared/ui/page-shell/page-shell';
import { SectionHeading } from '@shared/ui/section-heading/section-heading';

/** The most a message may be. The form says so before the person writes a novel. */
export const MESSAGE_MAX = 1000;
export const NAME_MAX = 80;

/**
 * Who we are, when we are open, and a way to write to us.
 *
 * v1's contact form had no FormGroup and no submit handler, so pressing Submit was a
 * native GET that reloaded the whole single-page app and discarded what was typed.
 * This one is a real form with validation, and it confirms on the page.
 *
 * ZettaCafe is a portfolio project with no mail service behind it, so the message is
 * not sent anywhere, and the page says so rather than implying otherwise.
 */
@Component({
  selector: 'zc-about-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButton,
    PageShell,
    ReactiveFormsModule,
    SectionHeading,
    TextField,
    TextareaField,
    TranslatePipe,
  ],
  templateUrl: './about.page.html',
  styleUrl: './about.page.scss',
})
export class AboutPage {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(NAME_MAX)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    message: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(MESSAGE_MAX)],
    }),
  });

  /** The first name of whoever just wrote, once the form has been "sent". */
  protected readonly sentTo = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      queueMicrotask(() => focusFirstInvalid(this.host.nativeElement));
      return;
    }
    this.sentTo.set(this.form.controls.name.value.trim());
    this.form.reset();
  }

  protected writeAgain(): void {
    this.sentTo.set(null);
  }
}
