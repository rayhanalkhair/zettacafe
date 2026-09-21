/**
 * Options every dialog here shares. Plain data with no imports, so the header can use it
 * without pulling the dialog components (or Material's dialog) into the initial bundle.
 * That is also why this is not a global MAT_DIALOG_DEFAULT_OPTIONS provider: importing
 * that token statically adds the whole dialog module to the initial load.
 */

/**
 * Every dialog is modal, with a backdrop. Material reports aria-modal="false" by
 * default, so a screen reader may still read the page behind it.
 */
export const MODAL_DIALOG = { ariaModal: true } as const;

/**
 * A dialog with a form: modal, and keyboard focus starts in the first field.
 *
 * Material's default is the first tabbable element, which in a dialog is the Close
 * button in the header, so every keyboard user had to Tab past it to reach the form.
 * A confirmation does not use this: it focuses Cancel, the safe choice.
 */
export const FORM_DIALOG = {
  ...MODAL_DIALOG,
  autoFocus:
    'mat-dialog-content input:not([type="hidden"]), mat-dialog-content textarea, mat-dialog-content [role="combobox"]',
} as const;
