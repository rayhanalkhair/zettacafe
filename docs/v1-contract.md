# ZettaCafe v1 Contract

The acceptance checklist for v2. v1 had no tests, so this document stands in for them: every row here must be either **rebuilt** or **consciously merged/dropped** (with a reason) before v2 ships.

Captured from tag [`v1.0.0`](https://github.com/rayhanalkhair/zettacafe/releases/tag/v1.0.0) (`4eb4c73`, Angular 14.2).

## 1. Inventory

v1 has **21 components**. Only 7 are distinct pages; the rest are a shell, dialogs and sub-components.

| Kind           | Count | Members                                                                                                                                         |
| -------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell          | 1     | `app`                                                                                                                                           |
| Routed pages   | 7     | home, menu, about (also mounted at `/profile`), cart, login, stock-management, menu-management                                                  |
| Dialogs        | 11    | history, top-up, register, forget-password, cart-edit, add-to-cart, menu-detail, recipe-create, recipe-edit, ingredient-create, ingredient-edit |
| Sub-components | 2     | list-menu, card-menu                                                                                                                            |

## 2. Routes and access

| Route                | Component                    | Guard                                              | Who        |
| -------------------- | ---------------------------- | -------------------------------------------------- | ---------- |
| `/`                  | redirect to `/home`          | none                                               | anyone     |
| `/home`              | homepage                     | none                                               | anyone     |
| `/menu`              | menu → list-menu → card-menu | none                                               | anyone     |
| `/about`, `/profile` | about (same module twice)    | none                                               | anyone     |
| `/login`             | login                        | `LoginGuard`: redirects **away** if a token exists | guest only |
| `/cart`              | cart                         | `CartGuard`: token present                         | signed in  |
| `/stock-management`  | stock-management             | `StockManagementGuard`: token + role `Admin`       | admin      |
| `/menu-management`   | menu-management              | `MenuManagementGuard`: token + role `Admin`        | admin      |
| `**`                 | redirect to `/home`          | none                                               | anyone     |

**Known v1 weakness:** every guard reads `localStorage` directly, and admin protection is client-side only. v2 must enforce authorization in the resolvers as well.

## 3. Role matrix

| Capability                                          | Guest  | Customer | Admin |
| --------------------------------------------------- | :----: | :------: | :---: |
| Browse home, menu, about                            |   ✅   |    ✅    |  ✅   |
| Switch language (EN/ID)                             |   ✅   |    ✅    |  ✅   |
| Register, sign in, reset password                   |   ✅   |   n/a    |  n/a  |
| Add to cart (guests are prompted to sign in)        | prompt |    ✅    |  ✅   |
| Edit / remove cart lines, checkout, cancel          |   ❌   |    ✅    |  ✅   |
| View own transaction history                        |   ❌   |    ✅    |  ✅   |
| Top up credit                                       |   ❌   |    ✅    |  ✅   |
| See finance balance in history                      |   ❌   |    ❌    |  ✅   |
| Recipe management (CRUD, publish/unpublish, detail) |   ❌   |    ❌    |  ✅   |
| Stock management (CRUD, filter, sort)               |   ❌   |    ❌    |  ✅   |

## 4. Screen checklist

Status column: `todo` → `rebuilt` | `merged into X` | `dropped (reason)`.

### Pages

| #   | v1 component         | What it does                                                                                 | v2 target                                            | Status |
| --- | -------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------ |
| 1   | `homepage`           | Hero, "menu highlight" (one random item), discounted-offer strip, Order Now / View Menu CTAs | `features/home`                                      | done   |
| 2   | `menu` + `list-menu` | Published recipes, 10 per page, prev/next                                                    | `features/menu` (menu board)                         | done   |
| 3   | `card-menu`          | Recipe card: image, discounted price, remaining servings, sold-out state, add-to-cart        | `shared/ui/recipe-card` + `menu-board-row`           | done   |
| 4   | `about`              | Contact copy, live-chat link, contact form                                                   | `features/about` (real form; v1's is non-functional) | done   |
| 5   | `cart`               | Draft transaction(s): lines, per-line edit/remove, total, checkout, cancel, empty state      | `features/cart`                                      | done   |
| 6   | `login`              | Email + password, show-password, links to register / forgot password                         | `features/auth/login`                                | done   |
| 7   | `menu-management`    | Recipe table: name filter, publish filter, paging, publish toggle, add/edit/detail/delete    | `features/admin/recipes`                             | done   |
| 8   | `stock-management`   | Ingredient table: name filter, availability filter, name sort, paging, add/edit/delete       | `features/admin/ingredients`                         | done   |

### Dialogs

| #   | v1 component                | Purpose                                                           | v2 target                                                            | Status |
| --- | --------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------- | ------ |
| 9   | `history-transaction`       | Paged order history (3/page); admins also see finance balance     | `features/cart/orders` (routed page)                                 | done   |
| 10  | `topup`                     | Enter credit amount                                               | `features/auth/top-up/top-up.dialog`                                 | done   |
| 11  | `register`                  | First/last name, email, password (min 8)                          | `features/auth/register` (routed page, not a dialog)                 | done   |
| 12  | `forget-password`           | Two-step: request 4-digit code by email, then code + new password | `features/auth/forgot-password` (routed page, not a dialog)          | done   |
| 13  | `menu/menu-form`            | Add to cart: amount + note                                        | `features/menu/add-to-cart-dialog` (`mode: add`)                     | done   |
| 14  | `cart/cart-edit`            | Edit line: amount + note                                          | merged into add-to-cart-dialog (`mode: edit`)                        | done   |
| 15  | `menu-detail`               | Read-only ingredient list of a recipe                             | `features/admin/recipes/recipe-detail-dialog`                        | done   |
| 16  | `menu-management/menu-form` | Create recipe: name, price, discount, image link, ingredient rows | `features/admin/recipes/recipe-form-dialog` (`mode: create`)         | done   |
| 17  | `menu-edit`                 | Edit recipe (differs from #16 by **1 line of 139**)               | merged into recipe-form-dialog (`mode: edit`)                        | done   |
| 18  | `stock-form`                | Create ingredient: name, stock                                    | `features/admin/ingredients/ingredient-form-dialog` (`mode: create`) | done   |
| 19  | `stock-edit`                | Edit ingredient (differs from #18 by **1 line of 43**)            | merged into ingredient-form-dialog (`mode: edit`)                    | done   |

### Shell

| #   | v1 component | Does                                                                                  | v2 target                                        | Status |
| --- | ------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------ | ------ |
| 20  | `app`        | Toolbar nav, role-gated menus, credit display, top-up/history/logout, language toggle | `app.ts` (pure shell; state from `SessionStore`) | todo   |

> **Row count vs. component count:** the 20 rows cover 21 components because row 2 covers two (`menu` and `list-menu`, a pass-through wrapper plus the list). v2 collapses these to ~12 feature components plus ~18 shared.

## 5. GraphQL operation inventory

Every operation v1 issues, grouped by v1 service. The v2 schema **redesigns** these rather than porting them (see plan §2.4), so the "v2" column is the intended replacement.

### `AppService` / `LoginService`

| v1 operation              | Kind     | Notes                                      | v2                        |
| ------------------------- | -------- | ------------------------------------------ | ------------------------- |
| `GetOneUser($id)`         | query    | requests `credite`, `email`, names, `role` | `me`                      |
| `TopUp($credite)`         | mutation | **requests `password` in response**        | `topUpCredit(amountIdr)`  |
| `Login($value)`           | mutation | returns `token` + user + `usertype[]`      | `signIn` → `AuthPayload!` |
| `SaveVerification($data)` | mutation | sends reset code                           | `requestPasswordReset`    |
| `ForgetPassword($data)`   | mutation | **requests `password` in response**        | `resetPassword`           |
| `CreateUser($data)`       | mutation | **requests `password` in response**        | `signUp`                  |

### `HomeService` / `MenuService`

| v1 operation                | Kind     | Notes                                                             | v2                                           |
| --------------------------- | -------- | ----------------------------------------------------------------- | -------------------------------------------- |
| `MenuHighlight`             | query    | `MenuOffers.menuHighlight`. **Named-swapped** with `SpecialOffer` | `featuredRecipes`                            |
| `SpecialOffer`              | query    | `MenuOffers.specialOffer`. **Named-swapped**                      | `discountedRecipes`                          |
| `GetAllrecipes` (published) | query    | `page`, `limit=10`, `info_page[0].count`                          | `recipes(filter: {status: PUBLISHED}, page)` |
| `CreateTransaction($menu)`  | mutation | add-to-cart                                                       | `addCartLine`                                |

### `CartService`

| v1 operation                     | Kind     | Notes                                                                                | v2                                               |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `GetAllTransaction` (Draft)      | query    | the cart                                                                             | `cart`                                           |
| `GetAllTransaction` (Checkout)   | query    | history, paged                                                                       | `orderHistory(page)`                             |
| `FinanceManagement`              | query    | admin balance                                                                        | `finance` (**ADMIN only, enforced server-side**) |
| `UpdateTransaction` (checkout)   | mutation | `typetr: "Checkout"`; failure is parsed by string-matching `"Transaction is Failed"` | `checkout` + typed `INSUFFICIENT_*` errors       |
| `DeleteTransaction`              | mutation | cancel whole cart                                                                    | `cancelCart`                                     |
| `UpdateTransaction` (removeItem) | mutation | keyed by `recipe_id`                                                                 | `removeCartLine(lineId)`                         |
| `UpdateTransaction` (update)     | mutation | amount + note                                                                        | `updateCartLine`                                 |

### `StockManagementService`

| v1 operation                                  | Kind     | v2                                                 |
| --------------------------------------------- | -------- | -------------------------------------------------- |
| `GetAllIngredients` (unpaged)                 | query    | `ingredients`                                      |
| `GetAllIngredients` (paged, filtered, sorted) | query    | `ingredients(filter, page, sort)`                  |
| `GetOneIngredient`                            | query    | (fold into `ingredients`)                          |
| `CreateIngredient`                            | mutation | `createIngredient`                                 |
| `UpdateIngredient`                            | mutation | `updateIngredient`                                 |
| `DeleteIngredient`                            | mutation | `deleteIngredient` (v2 adds `RECIPE_IN_USE` guard) |

### `MenuManagementService`

| v1 operation                        | Kind     | v2                            |
| ----------------------------------- | -------- | ----------------------------- |
| `GetAllIngredients`                 | query    | `ingredients`                 |
| `GetAllrecipes` (paged)             | query    | `recipes(filter, page, sort)` |
| `GetAllrecipes` (published filter)  | query    | `recipes(filter)`             |
| `GetAllrecipes` (all)               | query    | `recipes`                     |
| `GetOneRecipe`                      | query    | `recipe(id)`                  |
| `UpdateRecipe` (drop an ingredient) | mutation | `updateRecipe`                |
| `CreateRecipe`                      | mutation | `createRecipe`                |
| `UpdateRecipe` (full edit)          | mutation | `updateRecipe`                |
| `UpdateRecipe` (published flag)     | mutation | `setRecipeStatus`             |
| `DeleteRecipe`                      | mutation | `deleteRecipe`                |

**Count:** 33 operations across 7 services, collapsing to 9 queries + 17 mutations in the v2 schema.

## 6. Behaviours v2 must preserve

Derived from reading the v1 code. These are the "don't lose this" rules.

1. **Servings remaining** = `min(floor(ingredient.stock / stock_used))` across a recipe's ingredients. A recipe is unavailable if any ingredient is unavailable.
2. **Discount price** = `price − price × discount / 100`.
3. **Guests can browse but not order.** Add-to-cart while signed out prompts "Do you have an account?" and offers to go to login.
4. **Checkout is atomic from the user's view.** On failure the cart must be intact and the reason readable.
5. **Credit balance updates in the header after checkout and top-up**, without a reload.
6. **Logout** requires confirmation, clears all session state, and returns to home.
7. **Language** toggles EN/ID for the whole UI.
8. **Publish toggle** requires confirmation.
9. **Pagination:** menu 10/page; history 3/page; admin tables 10/page.

## 7. Known v1 defects (must not be carried over)

Each is pinned by a named v2 test. See plan §5 for where each dies.

| Defect                                                                                       | Location                               |
| -------------------------------------------------------------------------------------------- | -------------------------------------- |
| `onRemove()` always targets `this.cart[0]`                                                   | `cart.component.ts:192`                |
| Failed login stores the string `"undefined"` (truthy), guards then pass                      | `login.component.ts:72-77`             |
| Declining the publish confirm still fires the mutation                                       | `menu-management.component.ts:140-148` |
| Swapped highlight / special-offer queries                                                    | `home.service.ts`                      |
| Dead inner condition `isToken === null`                                                      | `homepage.component.ts:100`            |
| Error handler shows a success icon                                                           | `cart.component.ts:220`                |
| Three operations request `password` in the response                                          | `login.service.ts`, `app.service.ts`   |
| Admin tables leak subscriptions; a query fires per keystroke                                 | `menu-management` / `stock-management` |
| Only spinner in the app can never render; empty state flashes on load                        | `cart.component.ts:19`                 |
| Contact form has no `formGroup`; Submit reloads the SPA                                      | `about.component.html:28-43`           |
| `[formControl]` + `[(ngModel)]` on one input (removed in Angular 17)                         | both admin tables                      |
| Two keyboard-unreachable admin "Add" buttons; ~19 icon-only controls with no accessible name | admin tables, toolbar                  |
