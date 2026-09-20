import { inject, Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import {
  CreateIngredientDocument,
  DeleteIngredientDocument,
  IngredientsDocument,
  UpdateIngredientDocument,
  type IngredientFieldsFragment,
  type IngredientsQuery,
} from '../graphql.generated';

/** Ten to a page, as in v1's admin tables. */
export const INGREDIENTS_PAGE_SIZE = 10;

export type Ingredient = IngredientFieldsFragment;
export type IngredientPage = IngredientsQuery['ingredients'];

export type Availability = 'all' | 'in' | 'out';
export type SortField = 'NAME' | 'STOCK';
export type SortDirection = 'ASC' | 'DESC';

export interface IngredientQuery {
  readonly search: string;
  readonly availability: Availability;
  readonly sort: SortField;
  readonly direction: SortDirection;
  readonly offset: number;
}

export interface IngredientInput {
  readonly name: string;
  readonly stockQty: number;
  readonly unit: string;
}

/**
 * Ingredient stock, admin only (the server enforces it; the route guard is only a
 * convenience). Reads always go to the network, since stock changes with every order.
 */
@Injectable({ providedIn: 'root' })
export class IngredientsService {
  private readonly apollo = inject(Apollo);

  async load(query: IngredientQuery): Promise<IngredientPage> {
    const result = await this.apollo.client.query({
      query: IngredientsDocument,
      variables: {
        filter: {
          search: query.search || null,
          isAvailable: query.availability === 'all' ? null : query.availability === 'in',
        },
        page: { offset: query.offset, limit: INGREDIENTS_PAGE_SIZE },
        sort: { field: query.sort, direction: query.direction },
      },
      fetchPolicy: 'network-only',
      errorPolicy: 'none',
    });
    if (!result.data) throw new Error('The server returned no ingredients.');
    return result.data.ingredients;
  }

  async create(input: IngredientInput): Promise<Ingredient> {
    const result = await this.apollo.client.mutate({
      mutation: CreateIngredientDocument,
      variables: { input },
      errorPolicy: 'none',
    });
    if (!result.data) throw new Error('The server returned no ingredient.');
    return result.data.createIngredient;
  }

  async update(id: string, input: IngredientInput): Promise<Ingredient> {
    const result = await this.apollo.client.mutate({
      mutation: UpdateIngredientDocument,
      variables: { id, input },
      errorPolicy: 'none',
    });
    if (!result.data) throw new Error('The server returned no ingredient.');
    return result.data.updateIngredient;
  }

  /** Fails with RECIPE_IN_USE while a live recipe still depends on the ingredient. */
  async remove(id: string): Promise<void> {
    await this.apollo.client.mutate({
      mutation: DeleteIngredientDocument,
      variables: { id },
      errorPolicy: 'none',
    });
  }
}
