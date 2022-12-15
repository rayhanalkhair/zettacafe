enum statusRecipe {
  Active,
  Deleted,
}

enum publishing {
  publish,
  unpublish,
}

export interface recipeIngredientsParams {
  ingredient_id: String;
  stock_used: Number;
}

export interface Recipe {
  _id: String;
  ingredient_id: String;
  ingredients: [recipeIngredientsParams];
  link_recipe: String;
  recipe_name: String;
  status: statusRecipe;
  stock: Number;
  price: Number;
  published: publishing;
}
