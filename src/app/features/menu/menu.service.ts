import { inject, Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { MenuDocument, type MenuQuery } from './graphql.generated';
import type { MenuItem } from '@shared/ui/menu-item';

/** Ten dishes to a page, as in v1. */
export const MENU_PAGE_SIZE = 10;

export type MenuCategory = 'FOOD' | 'DRINK';

export interface MenuRequest {
  /** Matches the dish name; empty means all. */
  readonly search: string;
  /** Null means every category. */
  readonly category: MenuCategory | null;
  readonly offset: number;
  /** The language descriptions come back in. */
  readonly language: 'en' | 'id';
}

export interface MenuPage {
  readonly items: readonly MenuItem[];
  readonly totalCount: number;
}

type MenuRecipe = MenuQuery['recipes']['items'][number];

/** The server's shape to the one the shared menu components draw. */
function toMenuItem(recipe: MenuRecipe): MenuItem {
  return {
    id: recipe.id,
    name: recipe.name,
    description: recipe.description ?? '',
    imageUrl: recipe.imageUrl ?? null,
    priceIdr: recipe.priceIdr,
    discountedPriceIdr: recipe.discountedPriceIdr,
    discountPercent: recipe.discountPercent,
    availableServings: recipe.availableServings,
    isAvailable: recipe.isAvailable,
  };
}

/**
 * Reads the public menu. Always PUBLISHED, and always from the network: stock changes
 * when anyone checks out, so a cached page could offer a dish that has just sold out.
 * The server owns the stock rule (`availableServings`); nothing here recomputes it.
 */
@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly apollo = inject(Apollo);

  async load(request: MenuRequest): Promise<MenuPage> {
    const result = await this.apollo.client.query({
      query: MenuDocument,
      variables: {
        filter: {
          status: 'PUBLISHED',
          search: request.search || null,
          category: request.category,
        },
        page: { offset: request.offset, limit: MENU_PAGE_SIZE },
        sort: { field: 'NAME', direction: 'ASC' },
        locale: request.language === 'id' ? 'ID' : 'EN',
      },
      fetchPolicy: 'network-only',
      errorPolicy: 'none',
    });
    const page = result.data?.recipes;
    if (!page) throw new Error('The server returned no menu.');
    return { items: page.items.map(toMenuItem), totalCount: page.totalCount };
  }
}
