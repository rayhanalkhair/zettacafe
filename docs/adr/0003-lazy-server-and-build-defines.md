# 0003. Keep the server out of the initial bundle, by build-time `define`

Status: Accepted

## Context

v1's defining performance failure: feature modules were declared lazy in the router
and also imported eagerly by the root module, so lazy loading did nothing and the
main script reached 1.10 MB.

The in-browser server (ADR 0002) is a bigger version of the same hazard. GraphQL, the
schema tools, IndexedDB access, the resolvers and the seed data together are well over
100 kB. One static import of anything under `src/server` from app code would put all
of it in the first download, silently.

## Decision

Three layers, each catching what the one before can miss:

1. **An ESLint boundary.** App code may not import `src/server`, except the single
   file that does so behind a dynamic `import()`.
2. **The dynamic import.** The server is its own chunk (about 110 kB), fetched when
   the first operation runs.
3. **A check on the built files.** `scripts/check-bundle.mjs` asserts that no initial
   chunk contains server code, that a lazy chunk does (so the check cannot pass
   vacuously if the server vanished), and that no chunk contains dev tooling. Size
   budgets in `angular.json` are errors, not warnings.

Two switches are build-time `define`s, not runtime checks:

- `API_URL` selects the in-browser server or an HTTP endpoint.
- `DEV_TOOLS` gates the `/dev/*` pages.

A runtime `if` would leave the unused branch's chunk in `dist/`. Here that chunk is the
entire GraphQL server, so a `define` that removes it at parse time is the point.

## Consequences

- Good: the boundary is checked on the artifact that ships, not only on the source.
- Good: production output contains no dev tooling, which a test confirms.
- Cost: `graphql`'s executor still lands in an initial chunk (about 31 kB gzipped),
  because the bundler hoists its module graph into a shared chunk. It reproduces with
  plain esbuild and with graphql 17, so it is not fixable here; the bundle budget
  accounts for it and the note in `check-bundle.mjs` says why. The check separates
  that library code from this app's server code.
- Cost: a new server-side module must live where the check's markers can recognise it.
