# 0001. Rebuild on a fresh Angular 22 scaffold, not `ng update`

Status: Accepted

## Context

ZettaCafe v1 was built in 2022 on Angular 14. Getting to Angular 22 is eight major
versions. v1 had no tests, so nothing would confirm that any hop had kept the app
working, and every hop would have been checked by hand across 21 screens.

Other facts about v1 at the time of the decision:

- `[formControl]` and `[(ngModel)]` on the same input, in both admin tables. That
  combination was removed in Angular 17, so both screens had to be rewritten just to
  reach version 17, part-way through the chain.
- Eight dependencies were unused and pinned to Angular-14-era peer ranges
  (`@coreui/angular`, `@ng-select/ng-select`, `aos`, `font-awesome@4`, `sweetalert@1`,
  `primeflex`, `dotenv`, `chart.js`). Each hop would have fought them.
- About 200 lines of roughly 6,900 would survive unchanged (the translation files).
  Templates and styles were not portable, and components would change from NgModules
  to standalone, from constructor injection to `inject()`, and from fields to signals.
- The GraphQL backend was gone, so the data layer had to be written anyway.

## Decision

Start a fresh Angular 22 project in the same repository. Tag v1 (`v1.0.0`) so it stays
browsable, keep its sources in `legacy-src/` while porting so the old code could be
read beside the new, exclude that folder from every tool, and delete it in the final
change.

## Consequences

- Good: no time spent carrying dead dependencies through eight migrations, and every
  line is written for Angular 22 rather than adapted.
- Good: the growth since 2022 is visible in one repository, between a tag and a branch.
- Cost: nothing pins the old behaviour. `docs/v1-contract.md` (a 21-screen checklist
  and the role matrix) stood in for the tests v1 never had, and each feature was
  checked against it.
- Cost: a large amount of new code, reviewed one phase at a time as separate pull
  requests rather than as one change.
