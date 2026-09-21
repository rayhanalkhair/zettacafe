# 0005. Theme with tokens, never by styling another component

Status: Accepted

## Context

v1's styling had no shared vocabulary: no CSS variables, no media queries, about 18
ad-hoc colours, and roughly 1,350 lines of CSS of which about a third was duplicated.
Its most instructive failure was 35 lines targeting the inside of `mat-menu`. The menu
renders in an overlay outside the component's encapsulation scope, so none of those
selectors ever matched.

The usual escape hatches (`::ng-deep`, `!important`, attribute selectors into a
library's markup) are how a design system slowly stops being one. They also break
whenever the library changes its markup.

## Decision

- Colours exist in one file, `_tokens.scss`, as `light-dark()` pairs. Everything else
  uses `var(--zc-*)` or a Material `--mat-sys-*` role.
- Material is adjusted only through its token overrides in `_theme.scss`, which pin
  every colour role to a `--zc-*` token.
- Stylelint enforces the rule: no hex or named colours outside the token file, no
  `::ng-deep`, `/deep/` or `>>>`, no `!important`, and custom properties must be named
  `--zc-*` or `--mat-*`.
- Colour pairs are checked for WCAG AA in both themes by `npm run contrast:check`,
  which runs at token-definition time, before a component uses the colour.
- Light and dark come from `color-scheme` and `light-dark()`, following the operating
  system, with no class toggling and no script.

## Consequences

- Good: a redesign is a change to one file, and dark mode costs nothing per component.
- Good: the rules are checked by tools, so they hold as the code grows.
- Good: an upgrade of Angular Material changes token names at worst, not markup.
- Cost: something Material's tokens do not expose cannot be tweaked with a quick
  selector. It needs a new component or a token, which is slower for the first
  instance and better for the tenth.
- Cost: there is no user-facing theme switch, only the operating system's setting.
  That was chosen on purpose; adding one later means a small store and an attribute on
  `<html>`, and no component changes.
