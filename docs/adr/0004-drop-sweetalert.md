# 0004. Replace SweetAlert2 with Material dialogs and snackbars

Status: Accepted

## Context

v1 used SweetAlert (an old version) for confirmations and messages. Its costs showed
up in three ways:

- **It renders outside Angular's tree.** Under zoneless change detection, state set
  from a callback after such a dialog closes does not re-render unless it is a signal
  write. That is an intermittent bug class, the hardest kind to diagnose.
- **It cannot be themed from the design tokens** without `!important`, which the
  styling rules ban and which would undo the point of having tokens.
- **It had its own bug family in v1**: a success icon on an error handler, colours
  hard-coded in all 11 confirmations, and about 25 English-only titles.

## Decision

Two small services in `core/feedback/`:

- `ConfirmService.ask(...)` opens a Material dialog with a translated title, message
  and confirm label, and resolves to a boolean. Cancel is the initial focus, so an
  accidental Enter is the safe choice. Destructive confirmations use the danger tone.
- `NotificationService` shows translated snackbars and announces them to screen
  readers.

The guard `if (!(await confirm.ask(...))) return;` is the shape a confirmation
takes, so the v1 bug where the "No" branch still fired the mutation cannot be written
by accident. An end-to-end spec declines each confirmation and checks the stored state
after a reload.

Material's dialog and snackbar code is loaded by dynamic `import()` on first use, so
neither is in the initial bundle.

## Consequences

- Good: dialogs share the app's theme, focus handling, `aria-modal`, translations and
  test helpers.
- Good: one less dependency, and none of its old peer constraints.
- Cost: a little more code than calling a library function. Two services and one dialog
  component, all small and tested.
