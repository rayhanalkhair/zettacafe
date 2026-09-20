/**
 * Moves focus to the first invalid field in `root`, so a keyboard or screen reader
 * user who submits a form with mistakes lands on the first one to fix instead of
 * nowhere. Material marks a touched invalid control with `.ng-invalid`.
 *
 * Returns whether something was focused.
 */
export function focusFirstInvalid(root: HTMLElement): boolean {
  const field = root.querySelector<HTMLElement>(
    'input.ng-invalid, textarea.ng-invalid, select.ng-invalid',
  );
  field?.focus();
  return field !== null;
}
