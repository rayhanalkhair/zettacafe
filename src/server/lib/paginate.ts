import { errors } from './errors';

export interface PageArgs {
  offset?: number | null | undefined;
  limit?: number | null | undefined;
}

export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 50;

/** Validates page arguments and applies the defaults declared in the schema. */
export function resolvePage(page: PageArgs | null | undefined): { offset: number; limit: number } {
  const offset = page?.offset ?? 0;
  const limit = page?.limit ?? DEFAULT_LIMIT;
  if (!Number.isInteger(offset) || offset < 0) {
    throw errors.validation('page.offset', 'must be a whole number, zero or more');
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw errors.validation('page.limit', `must be between 1 and ${MAX_LIMIT}`);
  }
  return { offset, limit };
}

/** One page of an already filtered and sorted list, with the total before paging. */
export function paginate<T>(
  items: readonly T[],
  page: PageArgs | null | undefined,
): { items: T[]; totalCount: number } {
  const { offset, limit } = resolvePage(page);
  return { items: items.slice(offset, offset + limit), totalCount: items.length };
}
