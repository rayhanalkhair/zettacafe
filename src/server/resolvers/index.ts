import type { Resolvers } from '../generated/resolvers';
import { authMutation, authQuery } from './auth.resolvers';
import { financeQuery } from './finance.resolvers';
import { ingredientMutation, ingredientQuery, ingredientType } from './ingredient.resolvers';
import { orderLineType, orderMutation, orderQuery, orderType } from './order.resolvers';
import { recipeIngredientType, recipeMutation, recipeQuery, recipeType } from './recipe.resolvers';

/**
 * The full resolver map. Each domain module owns its slice of Query and Mutation
 * plus the field resolvers for its types; this file only composes them, and the
 * generated `Resolvers` type proves every field in the schema is covered
 * correctly typed.
 */
export const resolvers: Resolvers = {
  Query: {
    ...authQuery,
    ...recipeQuery,
    ...ingredientQuery,
    ...orderQuery,
    ...financeQuery,
  },
  Mutation: {
    ...authMutation,
    ...recipeMutation,
    ...ingredientMutation,
    ...orderMutation,
  },
  Recipe: recipeType,
  RecipeIngredient: recipeIngredientType,
  Ingredient: ingredientType,
  Order: orderType,
  OrderLine: orderLineType,
};
