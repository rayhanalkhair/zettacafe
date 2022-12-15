import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  constructor(private httpClient: HttpClient, private apollo: Apollo) {}

  getPublishRecipes(inputPage: number) {
    const limit = 10;
    const page = inputPage;
    return this.apollo
      .query({
        query: gql`
          query GetAllrecipes($page: Int, $limit: Int) {
            GetAllrecipes(
              data: { published: "Publish", page: $page, limit: $limit }
            ) {
              message
              data {
                recipe_data {
                  _id
                  discount
                  link_recipe
                  recipe_name
                  published
                  status
                  ingredients {
                    stock_used
                    ingredient_id {
                      name
                      stock
                      status
                      available
                    }
                  }
                  link_recipe
                  price
                  status
                }
                info_page {
                  count
                }
              }
            }
          }
        `,
        variables: { limit, page },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((data: any) => {
          return data?.data?.GetAllrecipes;
        })
      );
  }

  createTransaction(menu: any) {
    menu.recipe_id = menu._id;
    delete menu._id;
    menu = [menu];
    return this.apollo.mutate({
      mutation: gql`
        mutation CreateTransaction($menu: [menuFieldsParams]) {
          CreateTransaction(data: { menu: $menu }) {
            message
            data {
              status
              order_status
              menu {
                recipe_id {
                  price
                }
              }
            }
          }
        }
      `,
      variables: { menu },
    });
  }
}
