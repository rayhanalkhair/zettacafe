# Architecture decision records

Short records of decisions that shaped the project, with the reasons and what was
given up. They are written so a reader can disagree with them.

| #                                             | Decision                                                          | Status   |
| --------------------------------------------- | ----------------------------------------------------------------- | -------- |
| [0001](0001-fresh-rebuild.md)                 | Rebuild on a fresh Angular 22 scaffold, not `ng update`           | Accepted |
| [0002](0002-in-browser-graphql.md)            | Run the GraphQL API in the browser                                | Accepted |
| [0003](0003-lazy-server-and-build-defines.md) | Keep the server out of the initial bundle, by build-time `define` | Accepted |
| [0004](0004-drop-sweetalert.md)               | Replace SweetAlert2 with Material dialogs and snackbars           | Accepted |
| [0005](0005-tokens-not-selectors.md)          | Theme with tokens, never by styling another component             | Accepted |
