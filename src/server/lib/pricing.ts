/** Price after a whole-percent discount, rounded to the nearest rupiah. */
export function discountedPrice(priceIdr: number, discountPercent: number): number {
  return Math.round((priceIdr * (100 - discountPercent)) / 100);
}

export function lineTotal(unitPriceIdr: number, quantity: number): number {
  return unitPriceIdr * quantity;
}
