import { errors } from './errors';

/**
 * Input validation that the schema cannot express. Each helper returns the
 * cleaned value or throws VALIDATION naming the field, so a form can show the
 * message next to the right input.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requireText(
  field: string,
  value: string,
  { min = 1, max = 200 }: { min?: number; max?: number } = {},
): string {
  const text = value.trim();
  if (text.length < min)
    throw errors.validation(field, min === 1 ? 'is required' : `needs at least ${min} characters`);
  if (text.length > max) throw errors.validation(field, `must be at most ${max} characters`);
  return text;
}

/** Trims and lowercases; emails are unique case-insensitively. */
export function requireEmail(field: string, value: string): string {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !EMAIL.test(email))
    throw errors.validation(field, 'is not a valid email');
  return email;
}

export function requirePassword(field: string, value: string): string {
  if (value.length < 8) throw errors.validation(field, 'needs at least 8 characters');
  if (value.length > 200) throw errors.validation(field, 'must be at most 200 characters');
  return value;
}

export function requireInt(
  field: string,
  value: number,
  { min, max }: { min: number; max: number },
): number {
  if (!Number.isInteger(value)) throw errors.validation(field, 'must be a whole number');
  if (value < min || value > max)
    throw errors.validation(field, `must be between ${min} and ${max}`);
  return value;
}

/** An http(s) URL, or null. Empty strings count as no image. */
export function optionalUrl(field: string, value: string | null | undefined): string | null {
  const text = value?.trim();
  if (!text) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('protocol');
  } catch {
    throw errors.validation(field, 'must be an http or https URL');
  }
  return text;
}
