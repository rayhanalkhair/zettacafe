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

import { existsSync, readdirSync } from 'node:fs';

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

// Client operations. Every .graphql document becomes a typed document (variables and
// result types), so services never hand-write a response shape.
//
// Documents are generated NEXT TO THE CODE THAT USES THEM. A single shared file would
// be imported by the auth service, so it would sit in the initial bundle and grow with
// every feature's queries; per-feature files load with that feature's lazy chunk.
//   core       -> src/app/core/graphql/generated/operations.ts   (auth, cart)
//   a feature  -> src/app/features/<name>/graphql.generated.ts
const clientOutput = (documents) => ({
  documents,
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
});

config.generates['src/app/core/graphql/generated/operations.ts'] = clientOutput(
  'src/app/core/**/*.graphql',
);

const FEATURES = 'src/app/features';
if (existsSync(FEATURES)) {
  for (const entry of readdirSync(FEATURES, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = `${FEATURES}/${entry.name}`;
    const hasDocuments = readdirSync(dir, { recursive: true }).some((f) =>
      String(f).endsWith('.graphql'),
    );
    if (hasDocuments) {
      config.generates[`${dir}/graphql.generated.ts`] = clientOutput(`${dir}/**/*.graphql`);
    }
  }
}

export default config;
