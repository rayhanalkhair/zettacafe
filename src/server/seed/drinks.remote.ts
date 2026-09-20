import type { IngredientRow, RecipeRow } from '../db/schema.types';
import fallback from './drinks.fallback.json';

/**
 * Drinks come from the public SampleAPIs coffee endpoints, merged into the same
 * recipe store as the food at SEED time, not at query time. That makes drinks
 * first-class: paginated, searchable, publishable, orderable and stock-tracked,
 * and the menu never blocks on a network call.
 *
 * The source is a public sandbox that anyone can write to. At the time of
 * writing it contains junk records (titles "test", "string", "Robert", an image
 * of "string", ingredients as a plain sentence), so every record is validated
 * and bad ones are dropped rather than trusted.
 *
 * If a request fails or times out, the committed snapshot (drinks.fallback.json,
 * captured with the same validation) is used, so the app works offline and in CI.
 */

export interface CoffeeDto {
  title: string;
  description: string;
  ingredients: string[];
  image: string;
}

export type Temperature = 'hot' | 'iced';

export const COFFEE_URLS: Record<Temperature, string> = {
  hot: 'https://api.sampleapis.com/coffee/hot',
  iced: 'https://api.sampleapis.com/coffee/iced',
};

export const FETCH_TIMEOUT_MS = 3000;

function isHttpUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isText(value: unknown, min: number): value is string {
  return typeof value === 'string' && value.trim().length >= min;
}

/** Keeps only well-formed records, trimmed, with duplicate titles removed. */
export function parseCoffeeDtos(raw: unknown): CoffeeDto[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: CoffeeDto[] = [];
  for (const item of raw as unknown[]) {
    if (typeof item !== 'object' || item === null) continue;
    const { title, description, ingredients, image } = item as Record<string, unknown>;
    if (!isText(title, 2) || !isText(description, 10) || !isText(image, 1) || !isHttpUrl(image)) {
      continue;
    }
    if (!Array.isArray(ingredients) || ingredients.length === 0) continue;
    const parts = ingredients as unknown[];
    if (!parts.every((part) => isText(part, 1))) continue;

    const key = title.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      title: title.trim(),
      description: description.trim(),
      ingredients: parts.map((part) => part.trim()),
      image,
    });
  }
  return out;
}

export function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'x'
  );
}

/** FNV-1a, 32-bit. Small, stable, no dependency. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * A plausible price derived from the title, so the same drink always costs the
 * same and reseeding is reproducible. 22,000 to 48,000 rupiah in steps of 500.
 */
export function drinkPriceIdr(title: string): number {
  return 22_000 + (hash(title.toLowerCase()) % 53) * 500;
}

/** Roughly one drink in five is discounted, chosen the same stable way. */
export function drinkDiscountPercent(title: string): number {
  return hash(`discount:${title.toLowerCase()}`) % 5 === 0 ? 10 : 0;
}

const DRINK_STOCK = 80;

function titleCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Turns validated DTOs into recipe rows plus the synthetic ingredients they use.
 * Ingredients are shared across drinks (deduplicated case-insensitively), so
 * drinks take part in the same stock model as food.
 */
export function toDrinkRows(
  lists: Record<Temperature, readonly CoffeeDto[]>,
  createdAt: string,
): { recipes: RecipeRow[]; ingredients: IngredientRow[] } {
  const ingredients = new Map<string, IngredientRow>();
  const recipes: RecipeRow[] = [];
  const names = new Set<string>();

  for (const temperature of ['hot', 'iced'] as const) {
    for (const dto of lists[temperature]) {
      const lower = dto.title.toLowerCase();
      // The same title on both lists gets its temperature in the name.
      const name = names.has(lower) ? `${dto.title} (${temperature})` : dto.title;
      names.add(lower);

      const needs = dto.ingredients.map((text) => {
        const id = `ing_drink_${slug(text)}`;
        if (!ingredients.has(id)) {
          ingredients.set(id, {
            id,
            name: titleCase(text),
            stockQty: DRINK_STOCK,
            unit: 'portion',
            deletedAt: null,
          });
        }
        return id;
      });

      recipes.push({
        id: `rec_drink_${temperature}_${slug(dto.title)}`,
        name,
        description: { en: dto.description },
        imageUrl: dto.image,
        category: 'DRINK',
        source: 'COFFEE_API',
        priceIdr: drinkPriceIdr(dto.title),
        discountPercent: drinkDiscountPercent(dto.title),
        status: 'PUBLISHED',
        isFeatured: false,
        // Deduplicate within one drink so a repeated ingredient is not double-counted.
        ingredients: [...new Set(needs)].map((ingredientId) => ({ ingredientId, quantity: 1 })),
        createdAt,
        deletedAt: null,
      });
    }
  }
  return { recipes, ingredients: [...ingredients.values()] };
}

async function fetchList(fetchFn: typeof globalThis.fetch, url: string): Promise<CoffeeDto[]> {
  const response = await fetchFn(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  return parseCoffeeDtos(await response.json());
}

/**
 * Live data when it is available, the committed snapshot when it is not. The two
 * temperatures are independent: one endpoint failing does not lose the other.
 */
export async function loadDrinks(
  fetchFn: typeof globalThis.fetch,
): Promise<Record<Temperature, CoffeeDto[]>> {
  const [hot, iced] = await Promise.allSettled([
    fetchList(fetchFn, COFFEE_URLS.hot),
    fetchList(fetchFn, COFFEE_URLS.iced),
  ]);
  const pick = (result: PromiseSettledResult<CoffeeDto[]>, snapshot: unknown): CoffeeDto[] =>
    result.status === 'fulfilled' && result.value.length > 0
      ? result.value
      : parseCoffeeDtos(snapshot);
  return { hot: pick(hot, fallback.hot), iced: pick(iced, fallback.iced) };
}
