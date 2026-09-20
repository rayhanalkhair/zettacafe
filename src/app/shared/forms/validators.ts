import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validators the built-in set lacks. Each returns an error named like a built-in
 * (`integer`, `url`), so fieldErrorMessage maps it to a translated message, or an
 * error carrying its own `messageKey`.
 */

/** A whole number. Empty is valid: pair it with `required` when it must be present. */
export function integer(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  return value === null || value === '' || Number.isInteger(value) ? null : { integer: true };
}

/** An http or https address. Empty is valid: pair it with `required` when it must be present. */
export function httpUrl(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  if (typeof value !== 'string' || value.trim() === '') return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? null : { url: true };
  } catch {
    return { url: true };
  }
}

/**
 * For a list of rows: no two may have the same key. The error carries the message key
 * to show, since a list has no field to hang a built-in message on.
 */
export function uniqueBy<T>(key: (row: T) => string, messageKey: string): ValidatorFn {
  return (control) => {
    const rows = (control.value ?? []) as T[];
    const keys = rows.map(key).filter((k) => k !== '');
    return new Set(keys).size === keys.length ? null : { duplicate: { messageKey } };
  };
}

/** For a list of rows: there must be at least `min`. */
export function atLeast(min: number, messageKey: string): ValidatorFn {
  return (control) => {
    const rows = (control.value ?? []) as unknown[];
    return rows.length >= min ? null : { tooFew: { messageKey } };
  };
}
