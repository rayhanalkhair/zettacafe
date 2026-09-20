import { inject, Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { toMenuItem, type MenuItem } from '@shared/ui/menu-item';
import { HomeDocument } from './graphql.generated';

export interface HomeContent {
  /** Curated by an admin ("Show on the home page"). Published and in stock. */
  readonly featured: readonly MenuItem[];
  /** Published, in stock and discounted, biggest discount first. */
  readonly discounted: readonly MenuItem[];
}

/**
 * What the home page shows. The two lists are separate, self-describing fields on the
 * server. v1 had them named the wrong way round (`menuHighlight` returned the offers
 * and `specialOffer` the highlight), so its highlight section showed discounts.
 */
@Injectable({ providedIn: 'root' })
export class HomeService {
  private readonly apollo = inject(Apollo);

  async load(language: 'en' | 'id'): Promise<HomeContent> {
    const result = await this.apollo.client.query({
      query: HomeDocument,
      variables: { locale: language === 'id' ? 'ID' : 'EN' },
      fetchPolicy: 'network-only',
      errorPolicy: 'none',
    });
    if (!result.data) throw new Error('The server returned no home content.');
    return {
      featured: result.data.featuredRecipes.map(toMenuItem),
      discounted: result.data.discountedRecipes.map(toMenuItem),
    };
  }
}
