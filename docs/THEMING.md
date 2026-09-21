# Theming

The look is one idea, applied consistently: an Indonesian warung menu board. Warm
paper, dark brown ink, and three accents taken from the kitchen (palm sugar,
pandan, turmeric), with a serif display face for the dish names and prices.

## The single rule

**Components consume `--zc-*` and `--mat-sys-*` tokens. They never style another
component's internals.**

Where Angular Material needs adjusting, the change goes in
[`src/styles/_theme.scss`](../src/styles/_theme.scss) as a token override, never as
a selector in a component. Stylelint enforces it: no `::ng-deep`, no `/deep/`, no
`>>>`, no `!important`, no hex or named colours outside the token file, and custom
properties must be named `--zc-*` or `--mat-*`.

The reason is v1. It had 35 lines styling `mat-menu` content, which renders in an
overlay outside the component's encapsulation scope, so none of them ever matched.
It also had about 18 ad-hoc colours and 1,350 lines of CSS with roughly a third of it
duplicated. A rule that the compiler-adjacent tooling checks does not decay the way
a convention does.

## Files

| File                            | Owns                                                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| `src/styles/_tokens.scss`       | The only place a literal colour may appear. Each token is one `light-dark(a, b)` value. |
| `src/styles/_scale.scss`        | Spacing (`--zc-space-1..9`), radii, shadows, type sizes.                                |
| `src/styles/_typography.scss`   | Font stacks and the type scale.                                                         |
| `src/styles/_theme.scss`        | The Material 22 bridge: pins every Material colour role to a `--zc-*` token.            |
| `src/styles/_theme-colors.scss` | Generated tonal palettes. They only supply the ranges Material derives states from.     |
| `src/styles/_breakpoints.scss`  | Mobile-first breakpoints (`sm` 36rem, `md` 48rem, `lg` 64rem, `xl` 80rem).              |
| `src/styles/_a11y.scss`         | Visible focus, `.visually-hidden`, skip link, reduced motion.                           |

## Colour

| Token           | Light     | Dark      | Role                                  |
| --------------- | --------- | --------- | ------------------------------------- |
| `--zc-paper`    | `#f5efe1` | `#17120e` | The page. Waxed brown wrapping paper. |
| `--zc-surface`  | `#fffcf5` | `#211a15` | Raised surfaces: dialogs, cards.      |
| `--zc-ink`      | `#241c16` | `#f2eadd` | Body text. Brown-black, not grey.     |
| `--zc-ink-soft` | `#6b5b4e` | `#b8a897` | Secondary text.                       |
| `--zc-aren`     | `#9a541d` | `#d98a46` | Primary. Palm sugar.                  |
| `--zc-pandan`   | `#2d6a4a` | `#5da37d` | Secondary and success. Pandan leaf.   |
| `--zc-kunyit`   | `#d9a016` | `#e8b93d` | Highlight and discounts. Turmeric.    |
| `--zc-sambal`   | `#a32f1d` | `#d6634e` | Destructive actions and errors only.  |
| `--zc-focus`    | `#1f4d36` | `#8fd0a9` | The focus ring.                       |

The palette deliberately avoids the cream-and-terracotta pairing that most generated
"warm editorial" designs land on. The differentiating choice is pandan green as the
second colour.

### Light and dark

One declaration serves both: `color-scheme: light dark` plus CSS `light-dark()`. The
app follows the operating system, with no class toggling and no script, so there is no
flash of the wrong theme on load. The end-to-end tests emulate both schemes.

### Contrast is a build gate

`npm run contrast:check` reads the tokens and asserts every text and UI pairing in
both themes: 4.5:1 for text (WCAG 1.4.3) and 3:1 for UI boundaries and the focus ring
(1.4.11). It runs in CI, so a colour change that fails contrast cannot merge. Add a
pair to `PAIRS` in the script whenever a token starts being used as a text or UI
colour on a new surface.

jsdom cannot compute contrast, so the unit-test axe runs skip that rule. The
end-to-end accessibility specs run axe in a real browser in both colour schemes, and
one of them plants a low-contrast element to prove the check can fail.

## Type

- **Display: Playfair Display**, 600 and 700. Dish names, prices and page titles.
- **Body: Work Sans**, 400 to 600. Humanist and warm, and it does not compete with
  the serif.

Both are self-hosted (`@fontsource`), replacing v1's seven render-blocking CDN links.
Components never declare `font-family`; the two families reach Material through
`mat.theme()` as its brand and plain families. Body copy is kept to a readable
line length.

## Layout and motion

- **Mobile first.** Base styles target 360 px and every `@media` is a `min-width`
  taken from the breakpoint map.
- **The menu is a board, not a card grid**: a dish, a rule, the price on the right,
  which scans well, collapses to a phone without effort and lets the serif carry the
  page. Cards appear only where they are earned: the home page and the cart lines.
- **Motion.** Kept to what answers an action, such as a dialog opening. Nothing
  animates on load, and hover only changes colour. Durations are tokens
  (`--zc-duration-*`); under `prefers-reduced-motion` they collapse to almost
  nothing and smooth scrolling is turned off, so anything that uses them follows the
  preference without `!important`.
- **Targets.** Interactive controls are at least 24 px (WCAG 2.5.8); the header
  navigation links are 44 px. An end-to-end spec measures every route.

## Changing the theme

1. Edit the value in `_tokens.scss`. Keep both halves of `light-dark()`.
2. If it is a new text or UI colour, add its pairing to `scripts/check-contrast.mjs`.
3. `npm run contrast:check && npm run stylelint`.
4. Look at `/dev/tokens` in `npm start`: it renders every swatch and type step in
   both themes.
