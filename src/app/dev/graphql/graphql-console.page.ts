import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CombinedGraphQLErrors, gql } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { MatButton } from '@angular/material/button';
import { Apollo } from 'apollo-angular';

interface Preset {
  readonly label: string;
  readonly query: string;
  readonly variables?: string;
}

const PRESETS: readonly Preset[] = [
  {
    label: 'Menu (guest)',
    query: `query {
  recipes(page: { limit: 5 }, sort: { field: PRICE, direction: ASC }) {
    totalCount
    items { id name category priceIdr discountedPriceIdr availableServings }
  }
}`,
  },
  {
    label: 'Home lists',
    query: `query {
  featuredRecipes { id name isFeatured }
  discountedRecipes { id name discountPercent discountedPriceIdr }
}`,
  },
  {
    label: 'Sold-out check',
    query: `query {
  rawon: recipe(id: "rec_rawon") { name availableServings isAvailable }
  ikan: recipe(id: "rec_ikan_bakar") { name availableServings isAvailable }
}`,
  },
  {
    label: 'Who am I',
    query: `query { me { id firstName email role creditIdr } }`,
  },
  {
    label: 'My cart',
    query: `query {
  cart {
    id totalIdr
    lines { id recipeName quantity note unitPriceIdr lineTotalIdr }
    issues { kind maxOrderableQuantity line { recipeName } }
  }
}`,
  },
  {
    label: 'Add to cart',
    query: `mutation($i: AddCartLineInput!) {
  addCartLine(input: $i) { id totalIdr lines { id recipeName quantity } issues { kind } }
}`,
    variables: `{ "i": { "recipeId": "rec_nasi_goreng", "quantity": 2, "note": "less spicy" } }`,
  },
  {
    label: 'Checkout',
    query: `mutation { checkout { id status totalIdr lines { recipeName quantity unitPriceIdr } } }`,
  },
  {
    label: 'Order history',
    query: `query { orderHistory { totalCount items { id totalIdr placedAt user { email } } } }`,
  },
  {
    label: 'Finance (admin)',
    query: `query { finance { revenueIdr orderCount averageOrderIdr } }`,
  },
  {
    label: 'Stock (admin)',
    query: `query {
  ingredients(page: { limit: 5 }, sort: { field: STOCK, direction: ASC }) {
    totalCount
    items { name stockQty unit isAvailable }
  }
}`,
  },
];

function describeError(error: unknown): unknown {
  if (CombinedGraphQLErrors.is(error)) {
    return error.errors.map((e) => ({ message: e.message, extensions: e.extensions }));
  }
  return { message: error instanceof Error ? error.message : String(error) };
}

/**
 * Dev-only console, mounted at /dev/graphql.
 *
 * Runs any query or mutation against the live schema through the same Apollo
 * client the app uses, so the whole data layer can be exercised end to end in a
 * real browser (real IndexedDB, real network for the coffee API) before any
 * feature exists. Compiled out of production builds (see app.routes.ts).
 */
@Component({
  selector: 'zc-graphql-console',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButton],
  templateUrl: './graphql-console.page.html',
  styleUrl: './graphql-console.page.scss',
})
export class GraphqlConsolePage {
  private readonly apollo = inject(Apollo);

  protected readonly presets = PRESETS;
  protected readonly query = signal(PRESETS[0]?.query ?? '');
  protected readonly variables = signal('{}');
  protected readonly token = signal('');
  protected readonly output = signal('Choose a preset and press Run.');
  protected readonly running = signal(false);
  protected readonly elapsedMs = signal<number | null>(null);

  protected choose(preset: Preset): void {
    this.query.set(preset.query);
    this.variables.set(preset.variables ?? '{}');
  }

  protected async run(): Promise<void> {
    this.running.set(true);
    const started = performance.now();
    try {
      const document = gql(this.query());
      const variables = JSON.parse(this.variables() || '{}') as Record<string, unknown>;
      const token = this.token().trim();
      const context = token ? { headers: { authorization: `Bearer ${token}` } } : {};
      const definition = getMainDefinition(document);
      const isMutation = 'operation' in definition && String(definition.operation) === 'mutation';

      const client = this.apollo.client;
      const result = isMutation
        ? await client.mutate({ mutation: document, variables, context, errorPolicy: 'all' })
        : await client.query({
            query: document,
            variables,
            context,
            errorPolicy: 'all',
            fetchPolicy: 'no-cache',
          });

      this.output.set(
        JSON.stringify(
          {
            data: result.data ?? null,
            ...(result.error ? { errors: describeError(result.error) } : {}),
          },
          null,
          2,
        ),
      );
    } catch (error) {
      this.output.set(JSON.stringify({ errors: describeError(error) }, null, 2));
    } finally {
      this.elapsedMs.set(Math.round(performance.now() - started));
      this.running.set(false);
    }
  }

  /** Signs in as a seeded demo account and fills the token field. */
  protected async signInAs(who: 'admin' | 'customer'): Promise<void> {
    this.query.set(
      `mutation($i: SignInInput!) { signIn(input: $i) { token user { email role creditIdr } } }`,
    );
    this.variables.set(
      JSON.stringify({ i: { email: `${who}@zettacafe.id`, password: 'zettacafe123' } }),
    );
    await this.run();
    try {
      const parsed = JSON.parse(this.output()) as { data?: { signIn?: { token?: string } } };
      this.token.set(parsed.data?.signIn?.token ?? '');
    } catch {
      // The output already shows what went wrong.
    }
  }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLTextAreaElement).value);
  }

  protected onVariables(event: Event): void {
    this.variables.set((event.target as HTMLTextAreaElement).value);
  }

  protected onToken(event: Event): void {
    this.token.set((event.target as HTMLInputElement).value);
  }
}
