import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MenuManagementService {
  constructor(private apollo: Apollo) {}

  getAllIngredients() {
    return this.apollo.query({
      query: gql`
        query GetAllIngredients {
          GetAllIngredients(data: { name_sort: 1 }) {
            message
            data {
              ingredient_data {
                _id
                name
                stock
                status
                available
              }
              info_page {
                count
              }
            }
          }
        }
      `,
    });
  }

  getAllRecipesWithPage(
    inputLimit: number,
    inputPage: number,
    published: any,
    filtername: string
  ) {
    let limit: Number;
    let page: Number;
    let publishing: unknown;
    let name: String;

    if (filtername) {
      name = filtername;
    }

    if (!inputLimit || !inputPage) {
      limit = inputLimit;
      page = 1;
    } else {
      limit = inputLimit;
      page = inputPage + 1;
    }

    if (published === 'Publish') {
      publishing = 'Publish';
    } else if (published === 'Unpublish') {
      publishing = 'Unpublish';
    } else {
      publishing = '';
    }

    return this.apollo
      .query({
        query: gql`
          query GetAllrecipes(
            $limit: Int
            $page: Int
            $publishing: String
            $name: String
          ) {
            GetAllrecipes(
              data: {
                limit: $limit
                page: $page
                published: $publishing
                recipe_name: $name
              }
            ) {
              message
              data {
                recipe_data {
                  _id
                  link_recipe
                  recipe_name
                  discount
                  published
                  status
                  ingredients {
                    ingredient_id {
                      _id
                      name
                      stock
                      status
                      available
                    }
                    stock_used
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
        variables: { limit, page, publishing, name },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((data: any) => {
          return data.data.GetAllrecipes;
        })
      );
  }

  getAllRecipesWithPublished(published: string, filtername: string) {
    let publishing: string;

    if (published === 'Publish') {
      publishing = 'Publish';
    } else if (published === 'Unpublish') {
      publishing = 'Unpublish';
    } else {
      publishing = '';
    }

    return this.apollo.query({
      query: gql`
        query GetAllrecipes($publishing: String, $filtername: String) {
          GetAllrecipes(
            data: { published: $publishing, recipe_name: $filtername }
          ) {
            message
            data {
              recipe_data {
                _id
                link_recipe
                recipe_name
                published
                status
                discount
                ingredients {
                  ingredient_id {
                    _id
                    name
                    stock
                    status
                    available
                  }
                  stock_used
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
      variables: { publishing, filtername },
      fetchPolicy: 'network-only',
    });
  }

  getPublishRecipes() {
    return this.apollo.query({
      query: gql`
        query GetAllrecipes {
          GetAllrecipes(data: { published: "Publish" }) {
            message
            data {
              recipe_data {
                _id
                link_recipe
                recipe_name
                published
                status
                discount
                ingredients {
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
    });
  }

  getOneRecipe(element: any) {
    const _id = element._id;
    return this.apollo.query({
      query: gql`
        query GetOneRecipe($_id: ID) {
          GetOneRecipe(data: { _id: $_id }) {
            message
            data {
              _id
              recipe_name
              status
              published
              discount
              ingredients {
                ingredient_id {
                  _id
                  name
                  stock
                }
                stock_used
              }
            }
          }
        }
      `,
      variables: { _id },
    });
  }

  deleteIngredientUpdateRecipe(element: any, ingredientId: any) {
    const _id = element._id;
    return this.apollo.mutate({
      mutation: gql`
        mutation UpdateRecipe($_id: ID, $ingredientId: [ID]) {
          UpdateRecipe(data: { _id: $_id, ingredient_id: $ingredientId }) {
            message
            data {
              _id
              recipe_name
              status
              published
              ingredients {
                ingredient_id {
                  name
                  stock
                }
                stock_used
              }
            }
          }
        }
      `,
      variables: {
        _id,
        ingredientId,
      },
    });
  }

  createRecipe(element: any) {
    const recipe_name = element.recipe_name;
    const link_recipe = element.link_recipe;
    const price = Number(element.price);
    const ingredients = element.ingredients;
    const discount = element.discount ? element.discount : 0;
    for (let ingredient of ingredients) {
      ingredient.stock_used = Number(ingredient.stock_used);
    }
    return this.apollo.mutate({
      mutation: gql`
        mutation CreateRecipe(
          $recipe_name: String
          $link_recipe: String
          $price: Int
          $ingredients: [recipeIngredientsParams]
          $discount: Int
        ) {
          CreateRecipe(
            data: {
              recipe_name: $recipe_name
              link_recipe: $link_recipe
              price: $price
              ingredients: $ingredients
              discount: $discount
            }
          ) {
            message
            data {
              _id
              recipe_name
              status
              published
              discount
              ingredients {
                ingredient_id {
                  name
                  stock
                }
                stock_used
              }
            }
          }
        }
      `,
      variables: { recipe_name, link_recipe, price, ingredients, discount },
    });
  }

  updateRecipe(element: any) {
    const published = element.published;
    const _id = element._id;
    const recipe_name = element.recipe_name;
    const link_recipe = element.link_recipe;
    const price = Number(element.price);
    const discount = element.discount;
    const ingredients = element.ingredients;
    for (let ingredient of ingredients) {
      ingredient.stock_used = Number(ingredient.stock_used);
    }
    return this.apollo.mutate({
      mutation: gql`
        mutation UpdateRecipe(
          $_id: ID
          $recipe_name: String
          $link_recipe: String
          $price: Int
          $ingredients: [recipeIngredientsParams]
          $published: String
          $discount: Int
        ) {
          UpdateRecipe(
            data: {
              _id: $_id
              recipe_name: $recipe_name
              link_recipe: $link_recipe
              price: $price
              ingredients: $ingredients
              published: $published
              discount: $discount
            }
          ) {
            message
            data {
              _id
              recipe_name
              status
              discount
              published
              price
              ingredients {
                ingredient_id {
                  name
                  stock
                }
                stock_used
              }
            }
          }
        }
      `,
      variables: {
        _id,
        recipe_name,
        link_recipe,
        price,
        ingredients,
        published,
        discount,
      },
    });
  }

  updatePublished(element: any) {
    const published = element.published;
    const _id = element._id;
    return this.apollo.mutate({
      mutation: gql`
        mutation UpdateRecipe($_id: ID, $published: String) {
          UpdateRecipe(data: { _id: $_id, published: $published }) {
            message
            data {
              _id
              recipe_name
              status
              discount
              published
              ingredients {
                ingredient_id {
                  name
                  stock
                }
                stock_used
              }
            }
          }
        }
      `,
      variables: {
        _id,
        published,
      },
    });
  }

  deleteRecipe(element: any) {
    const _id = element._id;
    return this.apollo.mutate({
      mutation: gql`
        mutation DeleteRecipe($_id: ID) {
          DeleteRecipe(data: { _id: $_id }) {
            message
            data {
              _id
              recipe_name
              status
              discount
              published
              ingredients {
                ingredient_id {
                  name
                  stock
                }
                stock_used
              }
            }
          }
        }
      `,
      variables: { _id },
    });
  }
}
