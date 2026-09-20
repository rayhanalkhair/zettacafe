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

export default config;
