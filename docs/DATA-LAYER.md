# Data layer

ZettaCafe has no backend to host. The GraphQL API runs **in the browser**: an
executable schema, resolvers that persist to IndexedDB, and Apollo Client talking
to it through a `SchemaLink`. The schema is written and enforced as if it were a
real service, so pointing the app at an HTTP endpoint later is a build setting and
nothing else.

```
  Components and stores  (unchanged either way)
            |
     Apollo Client           gql documents, identical for both backends
            |
   provideZcApollo()          picks the terminating link at BUILD time (API_URL)
      |            |
  SchemaLink     HttpLink
      |          (a real endpoint)
  src/server/
   |- schema.graphql          the contract
   |- resolvers/              auth, recipe, ingredient, order, finance
   |- lib/                    pure business rules (stock, pricing, cart, validation)
   |- db/                     IndexedDB handle, migrations
   `- seed/                   authored menu + live coffee API, idempotent
```

`src/server/` contains no Angular. Its tests need no `TestBed`, and if a real
backend is ever written the directory lifts into a Node package unchanged.

## Demo accounts

| Role     | Email                   | Password       | Credit     |
| -------- | ----------------------- | -------------- | ---------- |
| Admin    | `admin@zettacafe.id`    | `zettacafe123` | Rp 500.000 |
| Customer | `customer@zettacafe.id` | `zettacafe123` | Rp 250.000 |

The password is public by design. It protects a browser-local demo and nothing
else, and is hashed with PBKDF2-SHA-256 like any real one.

## Try it

`npm start`, then open `/dev/graphql`. The console runs any operation against the
live schema through the same Apollo client the app uses. Presets cover the menu,
cart, checkout, history, finance and stock. Data lives in this browser's IndexedDB
(database `zettacafe`); clear site data to start over.

## Schema decisions

The schema was reviewed by an independent GraphQL architect before being frozen.
The decisions below survived that review; the changes it forced are listed after.

- **Errors are GraphQL errors with a stable `extensions.code`**, catalogued in the
  header of `schema.graphql`. The client maps codes to translated messages. The
  one payload that deserves a type, what will stop a cart checking out, is exposed
  as data before submitting (`Order.issues`) instead of being parsed out of an
  error.
- **Offset pagination.** The UI is a numbered page control, the data set is small
  and there is a single writer, so cursors would add cost for no benefit.
- **`Recipe.availableServings` is computed server-side**, as the minimum over
  ingredients of `floor(stock / quantity)`. It has exactly one implementation
  (`lib/availability.ts`); the menu card, the cart and checkout all use it. v1
  implemented the rule twice and the copies could disagree.
- **Money is integer rupiah** (`...Idr` fields). Never floats.
- **Nothing returns a password or a hash.** There is no such field to select.
  A test walks every output type in the schema to prove it stays that way.
- **Authorization lives in the resolvers**, not only in route guards. A test
  enumerates every operation in the schema and fails if one has no declared
  access level, so an unguarded endpoint cannot be added by omission.

### What the review changed

| Finding                                                                                               | Change                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A guest could read stock levels through `recipes { ingredients { ingredient { stockQty } } }`         | `Recipe.ingredients` is admin-only and returns `null` (not an error) for everyone else. The public `ingredientNames` replaces what the menu needs.                |
| One dangling recipe would null out an entire history page (`OrderLine.recipe: Recipe!`)               | `recipe` is nullable, and the line freezes `recipeName`, image, list price, discount and unit price at checkout.                                                  |
| `updateRecipe` with defaults on `status` and `discountPercent` would silently unpublish a live recipe | Separate `Create...Input` (defaults) and `Update...Input` (all optional; omitted means unchanged). Status and featured have their own mutations.                  |
| Checkout failures could only be discovered by attempting checkout                                     | `Order.issues` reports `OUT_OF_STOCK`, `PARTIALLY_AVAILABLE` (with `maxOrderableQuantity`) and `UNPUBLISHED` up front, accounting for stock shared between lines. |
| Boolean-returning mutations force manual cache eviction                                               | `cancelCart`, `deleteRecipe`, `deleteIngredient` return the affected object.                                                                                      |
| `null` meant both "guest" and "empty cart"                                                            | A signed-in user always has a cart. Its id is deterministic (`cart_<userId>`), so an empty cart and a persisted one are one cache entity.                         |
| Checkout could charge a total the user never saw                                                      | `checkout(expectedTotalIdr)` fails with `PRICE_CHANGED`.                                                                                                          |
| `PasswordResetChallenge.message` was the v1 envelope surviving                                        | Removed; `demoCode` is nullable and dies with the mailer.                                                                                                         |
| Defaults on non-null inputs generate required TypeScript fields                                       | Defaults moved to nullable arguments (`Int = 0`).                                                                                                                 |

## Storage

IndexedDB via `idb`. Indexes exist only where a query needs one (`users.byEmail`
unique, `sessions.byUser`, `orders.byUser`, `orders.byCreatedAt`). Migrations are
versioned in `db/migrations.ts`; never edit an old block and never "migrate" by
wiping, since a returning user may have a cart, history and a credit balance.

**Checkout is one read-write transaction across recipes, ingredients, users and
orders.** Every check that can fail runs before the first write, and any error
aborts the transaction, so a failure changes nothing. Two independent layers
protect this, and both are tested: the ordering, and the rollback.

Recipes and ingredients are **archived, never removed** (`deletedAt`), so orders
and carts that reference them keep working.

## Seeding

Idempotent and never destructive: it only _adds_ rows that are missing, gated on
`meta.seedVersion`. Bumping the version cannot reset a returning user's stock,
credit, cart or edited recipes; a test re-seeds over modified data to prove it.

- **Food**: twenty authored Indonesian dishes with English and Indonesian
  descriptions, over a 47-item pantry. Two are deliberate demo states so the
  sold-out and low-stock paths are exercised on first load: _kluwek_ is out of
  stock (Rawon is sold out) and snapper allows only three portions of Ikan Bakar.
  No photographs are shipped; hotlinking third-party food photos is unreliable and
  often unlicensed, so `imageUrl` is null and the UI draws a typographic
  placeholder. Admins can set any image URL.
- **Drinks**: fetched from the public SampleAPIs coffee endpoints at seed time and
  merged into the same recipe store, so they are paginated, searchable,
  publishable, orderable and stock-tracked like food. If a request fails or takes
  over three seconds, the committed snapshot (`drinks.fallback.json`) is used.

**The coffee API contains junk.** It is a public sandbox that anyone can write to.
When this was built it held records titled `test` (twice), `string` and `Robert`,
with an image of `"string"` and ingredients given as a sentence. Every record is
validated and bad ones are dropped, and the snapshot was captured with the same
rules (26 clean drinks kept, 4 junk records dropped). The real fetch and the
fallback path are both tested.

## Swapping in a real backend

Set `API_URL` in `angular.json` (`define`, under `build.options` and the
production configuration). With a URL, the in-browser branch, its dynamic import
and the whole server chunk are removed from the build at parse time.

It is a `define` and not a runtime check on purpose. A runtime branch leaves the
unused chunk in `dist/`, and here that chunk is the entire GraphQL server. The
same reasoning is why dev tooling uses `DEV_TOOLS`.

## Things worth knowing

- **The server is its own lazy chunk (about 110 kB), loaded on the first
  operation.** `scripts/check-bundle.mjs` asserts that no server code is in an
  initial chunk and that the server chunk exists.
- **graphql's executor is in the initial bundle anyway (about 31 kB gzipped).**
  esbuild hoists graphql's whole module graph into a shared chunk because the main
  bundle reaches graphql's barrel file. It reproduces with plain esbuild and with
  graphql 17, so it is not fixable from here. The budget for the initial bundle
  reflects it; see the note in `check-bundle.mjs`.
- **`graphql` is loaded twice in the test runner** unless told otherwise. It ships
  both a CommonJS and an ES-module entry with no `exports` map, and the unit-test
  build leaves it external. `vitest-base.config.mjs` inlines and de-duplicates it.
  Symptom: "Cannot use GraphQLSchema from another module or realm".
- **Cold start is about 1.4 s once**, mostly the two coffee API requests (about
  0.8 s in parallel). Every later load is about 0.5 s, and a warm query about
  15 ms. PBKDF2 at 120,000 iterations costs about 31 ms per hash.
- **The token is not persisted by the server layer.** Persisting the session is
  the client's job (Phase 4); the server only validates bearer tokens.
