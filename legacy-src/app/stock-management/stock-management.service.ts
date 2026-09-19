import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';

@Injectable({
  providedIn: 'root',
})
export class StockManagementService {
  constructor(private apollo: Apollo) {}

  getAllIngredients() {
    return this.apollo.query({
      query: gql`
        query GetAllIngredients {
          GetAllIngredients(data: {}) {
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

  getAllIngredientsWithPage(
    inputLimit: number,
    inputPage: number,
    name: string,
    availability: string,
    name_sort: number
  ) {
    let limit: Number;
    let page: Number;
    let filtername: string = '';
    let available: string;
    let sort = name_sort;

    if (name) {
      filtername = name;
    }

    if (availability === 'Available') {
      available = availability;
    } else if (availability === 'Unavailable') {
      available = availability;
    } else {
      available = '';
    }

    if (!inputLimit || !inputPage) {
      limit = inputLimit;
      page = 1;
    } else {
      limit = inputLimit;
      page = inputPage + 1;
    }
    return this.apollo.query({
      query: gql`
        query GetAllIngredients(
          $limit: Int
          $page: Int
          $filtername: String
          $available: String
          $sort: Int
        ) {
          GetAllIngredients(
            data: {
              page: $page
              limit: $limit
              name: $filtername
              available: $available
              name_sort: $sort
            }
          ) {
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
      variables: { page, limit, filtername, available, sort },
      fetchPolicy: 'network-only',
    });
  }

  getOneIngredient(element: any) {
    const _id = element._id;
    return this.apollo.query({
      query: gql`
        query GetOneIngredient($_id: ID) {
          GetOneIngredient(data: { _id: $_id }) {
            message
            data {
              _id
              name
              status
              stock
              available
            }
          }
        }
      `,
      variables: { _id },
    });
  }

  createIngredient(ingredient: any) {
    const name = ingredient.name;
    const stock = Number(ingredient.stock);
    return this.apollo.mutate({
      mutation: gql`
        mutation CreateIngredient($name: String, $stock: Int) {
          CreateIngredient(data: { name: $name, stock: $stock }) {
            message
            data {
              _id
              name
              stock
              status
              available
            }
          }
        }
      `,
      variables: { name, stock },
    });
  }

  updateIngredient(newIngredient: any) {
    const _id = newIngredient._id;
    const name = newIngredient.name;
    const stock = Number(newIngredient.stock);
    return this.apollo.mutate({
      mutation: gql`
        mutation UpdateIngredient($_id: ID, $name: String, $stock: Int) {
          UpdateIngredient(data: { _id: $_id, name: $name, stock: $stock }) {
            message
            data {
              _id
              name
              stock
              status
              available
            }
          }
        }
      `,
      variables: { _id, name, stock },
    });
  }

  deleteIngredient(ingredient: any) {
    const _id = ingredient._id;
    return this.apollo.mutate({
      mutation: gql`
        mutation DeleteIngredient($_id: ID) {
          DeleteIngredient(data: { _id: $_id }) {
            message
            data {
              _id
              name
              stock
              status
              available
            }
          }
        }
      `,
      variables: { _id },
      fetchPolicy: 'network-only',
    });
  }
}
