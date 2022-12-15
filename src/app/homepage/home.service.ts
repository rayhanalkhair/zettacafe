import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class HomeService {
  constructor(private apollo: Apollo) {}

  getSpecialOffer() {
    return this.apollo
      .query({
        query: gql`
          query MenuHighlight {
            MenuOffers {
              message
              menuHighlight {
                _id
                discount
                link_recipe
                published
                price
                recipe_name
                status
              }
            }
          }
        `,
      })
      .pipe(
        map((data: any) => {
          return data.data.MenuOffers;
        })
      );
  }

  getMenuHighlight() {
    return this.apollo
      .query({
        query: gql`
          query SpecialOffer {
            MenuOffers {
              message
              specialOffer {
                _id
                discount
                link_recipe
                published
                price
                recipe_name
                status
              }
            }
          }
        `,
      })
      .pipe(
        map((data: any) => {
          return data.data.MenuOffers;
        })
      );
  }
}
