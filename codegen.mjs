/**
 * GraphQL Code Generator.
 *
 * Generates the resolver types from src/server/schema.graphql. The schema is the
 * contract; nothing downstream hand-writes a shape. Resolvers return stored rows
 * (see `mappers`) and compute derived fields, so the API never mirrors storage.
 *
 * Run:   npm run codegen
 * Check: npm run codegen:check   (fails if the generated file is stale; runs in CI)
 */

/** @type {import('@graphql-codegen/cli').CodegenConfig} */
const config = {
  schema: 'src/server/schema.graphql',
  generates: {
    'src/server/generated/resolvers.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        contextType: '../context#ServerContext',
        useTypeImports: true,
        useIndexSignature: true,
        enumsAsTypes: true,
        avoidOptionals: { field: true, inputValue: false, object: false, defaultValue: false },
        maybeValue: 'T | null',
        inputMaybeValue: 'T | null | undefined',
        scalars: { DateTime: 'string' },
        mappers: {
          User: '../db/schema.types#UserRow',
          Ingredient: '../db/schema.types#IngredientRow',
          Recipe: '../db/schema.types#RecipeRow',
          RecipeIngredient: '../db/schema.types#RecipeIngredientRow',
          Order: '../db/schema.types#OrderRow',
          OrderLine: '../db/schema.types#OrderLineRow',
          CartIssue: '../models#CartIssueModel',
          Finance: '../models#FinanceModel',
        },
      },
    },
  },
};

// Client operations: every .graphql document under src/app becomes a typed document
// (variables and result types), so services never hand-write a response shape.
config.generates['src/app/core/graphql/generated/operations.ts'] = {
  documents: 'src/app/**/*.graphql',
  // typescript-operations emits the input and enum types each operation needs, so the
  // full `typescript` plugin would only duplicate them.
  plugins: ['typescript-operations', 'typed-document-node'],
  config: {
    useTypeImports: true,
    enumsAsTypes: true,
    maybeValue: 'T | null',
    inputMaybeValue: 'T | null | undefined',
    avoidOptionals: { field: true, inputValue: false, object: false, defaultValue: false },
    scalars: { DateTime: 'string' },
    // Keeps generated results structurally simple: no `__typename` unless asked for.
    skipTypename: true,
  },
};

export default config;
