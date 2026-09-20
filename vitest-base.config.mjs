import { defineConfig } from 'vitest/config';

/**
 * Extra Vitest configuration, merged with what the Angular unit-test builder
 * generates (see `runnerConfig` in angular.json).
 *
 * The unit-test build leaves `graphql` and `@graphql-tools/*` as external bare
 * imports, so the runner loads them itself. `graphql` 16 ships a CommonJS entry
 * (`main`) and an ES-module entry (`module`) with no `exports` map, so the schema
 * builder and the executor can end up with two different copies, and graphql then
 * refuses to run ("Cannot use GraphQLSchema from another module or realm").
 *
 * `@apollo/client` imports `graphql` too (SchemaLink executes through it), so it is
 * inlined with them: otherwise Node loads a third copy for it.
 *
 * Inlining makes Vitest process them through one resolver, and `dedupe` pins a
 * single copy. Note `inline` patterns match the absolute file path, so they must
 * not be anchored with `^`.
 */
const GRAPHQL_PACKAGES = /[/\\]node_modules[/\\](graphql|@graphql-tools|@apollo[/\\]client)[/\\]/;

export default defineConfig({
  resolve: { dedupe: ['graphql'] },
  test: {
    // An axe scan of a full page takes a few seconds when the whole suite runs in
    // parallel; the default 5 s made those specs flaky rather than wrong.
    testTimeout: 20_000,
    server: { deps: { inline: [GRAPHQL_PACKAGES] } },
  },
});
