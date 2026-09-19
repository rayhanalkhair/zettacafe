enum StatusIngredient {
  Active,
  Deleted,
}

export interface Ingredient {
  _id: String;
  name: String;
  stock: Number;
  status: StatusIngredient;
  available: Boolean;
}
