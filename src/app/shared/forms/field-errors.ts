import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import type { AbstractControl, ValidationErrors } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { map, startWith, switchMap } from 'rxjs';

export interface FieldErrorMessage {
  readonly key: string;
  readonly params: Readonly<Record<string, string | number>>;
}

/** Built-in validators, in the order they are reported, with the parameter each carries. */
const RULES = [
  { name: 'required', key: 'forms.errors.required', param: null },
  { name: 'email', key: 'forms.errors.email', param: null },
  { name: 'minlength', key: 'forms.errors.minlength', param: 'requiredLength' },
  { name: 'maxlength', key: 'forms.errors.maxlength', param: 'requiredLength' },
  { name: 'min', key: 'forms.errors.min', param: 'min' },
  { name: 'max', key: 'forms.errors.max', param: 'max' },
  { name: 'pattern', key: 'forms.errors.pattern', param: null },
  { name: 'integer', key: 'forms.errors.integer', param: null },
  { name: 'url', key: 'forms.errors.url', param: null },
] as const;

/**
 * Turns a control's validation errors into one translated message. Built-in validators
 * map to `forms.errors.*`. A custom validator supplies its own text by returning an
 * error value with a `messageKey` (an i18n key) and optional `params`.
 * v1 had about twenty untranslated literal error strings.
 */
export function fieldErrorMessage(errors: ValidationErrors | null): FieldErrorMessage | null {
  if (!errors) return null;
  for (const rule of RULES) {
    if (!(rule.name in errors)) continue;
    const detail: unknown = errors[rule.name];
    const params: Record<string, string | number> = {};
    if (rule.param && typeof detail === 'object' && detail !== null) {
      const value = (detail as Record<string, unknown>)[rule.param];
      if (typeof value === 'string' || typeof value === 'number') params[rule.param] = value;
    }
    return { key: rule.key, params };
  }
  for (const detail of Object.values(errors) as unknown[]) {
    if (typeof detail !== 'object' || detail === null) continue;
    const custom = detail as { messageKey?: unknown; params?: Record<string, string | number> };
    if (typeof custom.messageKey === 'string') {
      return { key: custom.messageKey, params: custom.params ?? {} };
    }
  }
  return { key: 'forms.errors.invalid', params: {} };
}

/**
 * The message for a control, kept current as it changes. It watches the control
 * itself, so a parent that does not re-render (OnPush, zoneless) still shows the
 * right message as the user types.
 */
@Component({
  selector: 'zc-field-errors',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    @if (message(); as m) {
      {{ m.key | translate: m.params }}
    }
  `,
})
export class FieldErrors {
  readonly control = input.required<AbstractControl>();

  private readonly errors = toSignal(
    toObservable(this.control).pipe(
      switchMap((control) =>
        control.statusChanges.pipe(
          startWith(null),
          map(() => control.errors),
        ),
      ),
    ),
    { initialValue: null },
  );

  protected readonly message = computed(() => fieldErrorMessage(this.errors()));
}
