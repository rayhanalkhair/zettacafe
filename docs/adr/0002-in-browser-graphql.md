# 0002. Run the GraphQL API in the browser

Status: Accepted

## Context

v1's GraphQL backend was hosted on a free service that has since shut down, so every
screen that needed data failed and the demo could not be shown. The project is a
portfolio piece: its worth depends on a reviewer being able to open it and use it,
today and later, without anything else being kept alive.

Options considered:

1. **Host a new backend.** Restores the shape of v1, but it is another thing to pay
   for, keep running and eventually watch die in the same way.
2. **Mock the API** with canned responses. Nothing would be real: no stock, no
   checkout rules, no persistence.
3. **Run the server in the browser**: an executable GraphQL schema and resolvers over
   IndexedDB, with Apollo Client connected by a `SchemaLink`.

## Decision

Option 3. The schema is designed and enforced as if it were a real service: typed
errors with stable codes, authorization in the resolvers (not only in route guards),
integer money, and checkout as a single transaction that either does everything or
changes nothing.

The link is chosen at build time. Pointing the app at a real endpoint is one setting
(`API_URL`), and the in-browser server drops out of the build.

## Consequences

- Good: nothing to host, nothing to expire, and the demo works offline after the first
  visit.
- Good: component tests can run against the real resolvers instead of mocks (see
  `docs/TESTING.md`), which is how the v1 cart bug is guarded properly.
- Good: because it is written as a real service, the client is not shaped by
  shortcuts. Swapping in HTTP changes no component.
- Cost: data lives in one browser. Clearing site data resets it, and two devices do
  not share a cart. Fine for a demo, wrong for a shop.
- Cost: the "server" code ships to the client (as a lazy chunk, see 0003), so nothing
  in it can be secret. The demo password is public by design and says so.
- Cost: the client must not trust itself for real security. Everything security-shaped
  is written as if a real server were behind it, so the design carries over.
