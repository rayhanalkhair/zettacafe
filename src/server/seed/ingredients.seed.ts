import type { IngredientRow } from '../db/schema.types';

/**
 * The pantry behind the authored Indonesian menu. Keys are stable ids
 * (`ing_<key>`), so re-seeding never duplicates and recipes reference by key.
 *
 * Two are deliberate demo states, so the sold-out and low-stock UI paths are
 * exercised on first load instead of never:
 *   kluwek       0     => Rawon is sold out
 *   ikan_kakap   750g  => only three portions of Ikan Bakar
 */
type Entry = readonly [key: string, name: string, unit: string, stock: number];

const PANTRY: readonly Entry[] = [
  // Staples
  ['beras', 'Rice', 'g', 8000],
  ['mie_telur', 'Egg noodles', 'g', 3000],
  ['lontong', 'Lontong (rice cake)', 'pcs', 40],
  ['tepung_beras', 'Rice flour', 'g', 2000],
  ['tepung_tapioka', 'Tapioca flour', 'g', 2000],
  // Protein
  ['ayam', 'Chicken', 'g', 6000],
  ['daging_sapi', 'Beef', 'g', 4500],
  ['buntut', 'Oxtail', 'g', 2000],
  ['ikan_kakap', 'Snapper', 'g', 750],
  ['lele', 'Catfish', 'pcs', 15],
  ['bakso', 'Beef meatballs', 'pcs', 60],
  ['telur', 'Egg', 'pcs', 60],
  ['tahu', 'Tofu', 'pcs', 50],
  ['tempe', 'Tempeh', 'pcs', 50],
  // Vegetables and fruit
  ['kol', 'Cabbage', 'g', 2500],
  ['tauge', 'Bean sprouts', 'g', 1500],
  ['kentang', 'Potato', 'g', 3000],
  ['timun', 'Cucumber', 'g', 1500],
  ['tomat', 'Tomato', 'g', 1500],
  ['kacang_panjang', 'Long beans', 'g', 1200],
  ['nangka_muda', 'Young jackfruit', 'g', 2000],
  ['pisang', 'Banana', 'pcs', 40],
  // Aromatics and spices
  ['bawang_merah', 'Shallot', 'g', 2500],
  ['bawang_putih', 'Garlic', 'g', 1500],
  ['cabai_merah', 'Red chilli', 'g', 1500],
  ['cabai_rawit', 'Bird’s-eye chilli', 'g', 800],
  ['jahe', 'Ginger', 'g', 800],
  ['lengkuas', 'Galangal', 'g', 800],
  ['kunyit', 'Turmeric', 'g', 600],
  ['kemiri', 'Candlenut', 'g', 600],
  ['serai', 'Lemongrass', 'pcs', 100],
  ['daun_jeruk', 'Kaffir lime leaf', 'pcs', 200],
  ['daun_salam', 'Bay leaf', 'pcs', 200],
  ['kluwek', 'Kluwek', 'pcs', 0],
  ['pandan', 'Pandan leaf', 'pcs', 100],
  ['asam_jawa', 'Tamarind', 'g', 600],
  ['terasi', 'Shrimp paste', 'g', 400],
  // Sauces, oil, sweeteners
  ['santan', 'Coconut milk', 'ml', 8000],
  ['kecap_manis', 'Sweet soy sauce', 'ml', 3000],
  ['minyak', 'Cooking oil', 'ml', 10000],
  ['gula_aren', 'Palm sugar', 'g', 3000],
  ['gula_pasir', 'Sugar', 'g', 4000],
  // Toppings and extras
  ['kacang_tanah', 'Peanuts', 'g', 2500],
  ['bawang_goreng', 'Fried shallot', 'g', 800],
  ['kerupuk', 'Crackers', 'pcs', 100],
  ['es_batu', 'Ice', 'g', 20000],
];

export const ingredientId = (key: string): string => `ing_${key}`;

export const INGREDIENT_SEED: readonly IngredientRow[] = PANTRY.map(
  ([key, name, unit, stockQty]) => ({
    id: ingredientId(key),
    name,
    stockQty,
    unit,
    deletedAt: null,
  }),
);
