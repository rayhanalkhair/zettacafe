# Testing

There are two layers, and they are meant to be different. Unit tests run against the
**real** server code in memory and are fast. End-to-end tests drive the **production
build** in a real browser and prove what jsdom cannot.

```
npm run test:unit      Vitest, 700+ specs
npm run e2e            Playwright against dist/, 176 runs (88 tests x 2 viewports)
npm run verify         lint, stylelint, format, i18n, contrast, codegen drift,
                       typecheck, unit tests, production build, bundle boundaries
```

CI runs all of it, in that order, and fails on the first problem.

## Unit tests (Vitest)

Run through `@angular/build:unit-test`. Setup provides fake IndexedDB, zoneless change
detection and translations.

### The real server, not mocks

`src/testing/apollo.ts` provides `provideTestApollo()`: a real Apollo client over a
`SchemaLink` to the real executable schema, over a freshly seeded in-memory database.
A component test therefore exercises the template, the store, Apollo, the resolver and
the business rules together, at unit-test speed.

This is what makes the cart tests meaningful. "Remove the second of three lines and
the other two survive" runs through the real resolver. In v1 that test would have
needed a mocked network boundary, and the bug it guards (the cart always removed its
first line) would have been mocked straight past.

### What is where

| Area                                    | What it proves                                                                                                   |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `src/server/**`                         | Resolvers against fake IndexedDB, and the pure rules (availability, pricing, pagination, validation, passwords). |
| `src/server/resolvers/security.spec.ts` | Every operation declares an access level; no output type can return a password or hash.                          |
| `src/app/core/**`                       | The stores, guards, links, error mapping, storage validation, formatting pipes.                                  |
| `src/app/shared/**`                     | Each component, with an axe assertion.                                                                           |
| `src/app/features/**`                   | Each page through the router with real guards, translations and server.                                          |
| `src/app/layout/`                       | The shell: navigation by role, language toggle, sign-out confirmation.                                           |

Coverage thresholds are 70 % (statements, branches, functions, lines) and are checked
in CI with `npm run test:coverage`.

### Helpers (`src/testing/`)

- `renderRoute(url, routes)` renders a page the way the app does.
- `fill`, `choose`, `findDish` drive forms and Material selects by label.
- `asAdmin(mutation)` changes data as another user in the same database, so a spec
  can make "someone else bought the last portions" true.
- `dialogReady(selector)` and `confirmation()`: **use these before touching a dialog.**
  Material builds a dialog's DOM and then finishes opening it; a click in between can
  be lost. On a fast machine the gap is invisible, which is why specs that skipped this
  passed locally and flaked on CI. Both wait for `mdc-dialog--open`.
- `vi.waitFor` defaults to 4 s (patched in `src/test-providers.ts`) because CI runners
  are several times slower than a laptop, and the default test timeout is 20 s.

### Rules of thumb

- Wait for the outcome, not for time: `vi.waitFor(() => expect(...))`.
- Do not assert on `document.activeElement` inside a dialog: Material moves focus
  itself a moment after opening. Test `focusFirstInvalid` directly instead. The
  end-to-end keyboard spec covers real focus with real key events.
- No `.subscribe(` in specs either; the lint rule covers features and their specs.

### What jsdom cannot do

No layout and no colour maths. So it cannot see the header pushing a page wider than a
phone, or a colour pair failing contrast. Those are the end-to-end layer's job (and
contrast is also a build gate, `npm run contrast:check`).

## End-to-end tests (Playwright)

`e2e/specs/`, configured in `playwright.config.ts`.

- **Against the production build.** `npm run build` first; `scripts/serve-dist.mjs`
  serves it with the SPA fallback. So budgets, lazy chunks and compiled-out dev pages
  all apply.
- **Two projects:** `chromium-desktop` at 1440 x 900 and `mobile-360` at 360 x 740
  with touch.
- **Isolation by fresh context.** Every test starts with empty IndexedDB and
  localStorage, and the app seeds itself. No shared state, no reset hook, and no
  test-only code in the app.
- **No network.** The coffee-list request is answered with an error (the app then uses
  its snapshot) and every other external request is aborted and recorded. A test fails
  if the app calls anywhere it did not before.

| Spec | Covers                                                                       |
| ---- | ---------------------------------------------------------------------------- |
| 01   | Guest browsing, search, filters, sign-in prompt, route guards                |
| 02   | Ordering: mid-cart removal, edit, exact payment, short balance, reload       |
| 03   | Sign in and out, return-to, roles, register, password reset                  |
| 04   | Admin: ingredient, recipe, publish, customer order, stock falls exactly      |
| 05   | Declining a confirmation changes nothing (checked after reload)              |
| 06   | Language: translation, `<html lang>`, persistence, digit grouping            |
| 07   | Keyboard: skip link, tab stops, dialog focus trap, Escape, focus return      |
| 08   | About form: validation, honest demo message, no navigation                   |
| 09   | Build hygiene: no unexpected requests, no errors, dev tools absent, chunking |
| 10   | axe on every route, per role, light and dark, with contrast                  |
| 11   | axe on every dialog and confirmation, light and dark                         |
| 12   | No horizontal scroll and no control under 24 px on every route               |

### Writing a new one

```ts
import { expect, signIn, test } from '../support/fixtures';

test('a customer can ...', async ({ page }) => {
  await signIn(page, 'customer');
  // Locate by role and accessible name, as a person or a screen reader would.
});
```

- Import `test` from `../support/fixtures`, not from Playwright: it installs the
  network rules.
- Locate by role and name. If that is awkward, the page probably has an
  accessibility problem worth fixing rather than a selector worth working around.
- Wait for the outcome. **Sign out, then wait for the "Sign in" link before going to
  `/login`:** while the session is still ending, the guest-only guard bounces you.
  This was the one flake found while writing the suite.
- Money is grouped by language (`Rp 250,000` in English, `Rp 250.000` in Indonesian),
  and some dishes are on offer, so read totals from the page (`moneyOf`) rather than
  computing them from list prices.
- Some seed data is deliberately tight: snapper allows only three Ikan Bakar. Pick
  dishes and quantities the kitchen can actually make.

### Proving the gate can fail

A check that cannot fail proves nothing. The accessibility spec plants a
low-contrast paragraph and an unlabelled button, and expects the helper to report
both. The i18n check was proved the same way, by breaking a placeholder and watching
it fail.

## Running things

```bash
npm run e2e:install    # once: downloads Chromium
npm run build
npm run e2e            # all projects
npx playwright test 02 --project=chromium-desktop   # one spec, one project
npx playwright show-report                          # after a CI-mode run
```

A failing run keeps a trace in `e2e/.results/`; open it with
`npx playwright show-trace <path>/trace.zip`.
