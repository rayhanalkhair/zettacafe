import { inject, Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import {
  AdminRecipesDocument,
  CreateRecipeDocument,
  DeleteRecipeDocument,
  IngredientOptionsDocument,
  SetRecipeFeaturedDocument,
  SetRecipeStatusDocument,
  UpdateRecipeDocument,
  type AdminRecipesQuery,
  type IngredientOptionsQuery,
  type RecipeAdminFragment,
} from '../graphql.generated';

/** Ten to a page, as in v1's admin tables. */
export const RECIPES_PAGE_SIZE = 10;

export type AdminRecipe = RecipeAdminFragment;
export type RecipePage = AdminRecipesQuery['recipes'];
export type IngredientOption = IngredientOptionsQuery['ingredients']['items'][number];

export type StatusFilter = 'all' | 'published' | 'draft';
export type SortField = 'NAME' | 'PRICE';
export type SortDirection = 'ASC' | 'DESC';
export type Category = 'FOOD' | 'DRINK';

export interface RecipeQuery {
  readonly search: string;
  readonly status: StatusFilter;
  readonly sort: SortField;
  readonly direction: SortDirection;
  readonly offset: number;
}

export interface RecipeInput {
  readonly name: string;
  readonly category: Category;
  readonly priceIdr: number;
  readonly discountPercent: number;
  readonly imageUrl: string | null;
  readonly description: { readonly en: string; readonly id: string | null };
  readonly ingredients: readonly { readonly ingredientId: string; readonly quantity: number }[];
}

/** The most the server returns in one page. */
const OPTIONS_PAGE = 50;

/**
 * Recipe management, admin only (the server enforces it; the route guard is a
 * convenience). Reads always go to the network, since stock and availability change
 * with every order.
 */
@Injectable({ providedIn: 'root' })
export class RecipesService {
  private readonly apollo = inject(Apollo);

  async load(query: RecipeQuery): Promise<RecipePage> {
    const result = await this.apollo.client.query({
      query: AdminRecipesDocument,
      variables: {
        filter: {
          search: query.search || null,
          status:
            query.status === 'all' ? null : query.status === 'published' ? 'PUBLISHED' : 'DRAFT',
        },
        page: { offset: query.offset, limit: RECIPES_PAGE_SIZE },
        sort: { field: query.sort, direction: query.direction },
      },
      fetchPolicy: 'network-only',
      errorPolicy: 'none',
    });
    if (!result.data) throw new Error('The server returned no recipes.');
    return result.data.recipes;
  }

  /** Every ingredient, by name, for the recipe form's choices. Pages are fetched until done. */
  async ingredientOptions(): Promise<IngredientOption[]> {
    const options: IngredientOption[] = [];
    let total = Infinity;
    while (options.length < total) {
      const result = await this.apollo.client.query({
        query: IngredientOptionsDocument,
        variables: { page: { offset: options.length, limit: OPTIONS_PAGE } },
        fetchPolicy: 'network-only',
        errorPolicy: 'none',
      });
      if (!result.data) throw new Error('The server returned no ingredients.');
      const { items, totalCount } = result.data.ingredients;
      total = totalCount;
      if (items.length === 0) break;
      options.push(...items);
    }
    return options;
  }

  async create(input: RecipeInput): Promise<AdminRecipe> {
    const result = await this.apollo.client.mutate({
      mutation: CreateRecipeDocument,
      variables: { input: toServerInput(input) },
      errorPolicy: 'none',
    });
    if (!result.data) throw new Error('The server returned no recipe.');
    return result.data.createRecipe;
  }

  async update(id: string, input: RecipeInput): Promise<AdminRecipe> {
    const result = await this.apollo.client.mutate({
      mutation: UpdateRecipeDocument,
      variables: { id, input: toServerInput(input) },
      errorPolicy: 'none',
    });
    if (!result.data) throw new Error('The server returned no recipe.');
    return result.data.updateRecipe;
  }

  async setStatus(id: string, status: 'PUBLISHED' | 'DRAFT'): Promise<AdminRecipe> {
    const result = await this.apollo.client.mutate({
      mutation: SetRecipeStatusDocument,
      variables: { id, status },
      errorPolicy: 'none',
    });
    if (!result.data) throw new Error('The server returned no recipe.');
    return result.data.setRecipeStatus;
  }

  async setFeatured(id: string, isFeatured: boolean): Promise<AdminRecipe> {
    const result = await this.apollo.client.mutate({
      mutation: SetRecipeFeaturedDocument,
      variables: { id, isFeatured },
      errorPolicy: 'none',
    });
    if (!result.data) throw new Error('The server returned no recipe.');
    return result.data.setRecipeFeatured;
  }

  async remove(id: string): Promise<void> {
    await this.apollo.client.mutate({
      mutation: DeleteRecipeDocument,
      variables: { id },
      errorPolicy: 'none',
    });
  }
}

/** The form's shape to the server's, with empty optional text sent as null. */
function toServerInput(input: RecipeInput) {
  return {
    name: input.name,
    category: input.category,
    priceIdr: input.priceIdr,
    discountPercent: input.discountPercent,
    imageUrl: input.imageUrl,
    description: { en: input.description.en, id: input.description.id },
    ingredients: input.ingredients.map((i) => ({
      ingredientId: i.ingredientId,
      quantity: i.quantity,
    })),
  };
}
