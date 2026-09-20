import { Injectable } from '@angular/core';

/** Every key the app persists. Nothing else may be written to localStorage. */
export const StorageKeys = {
  session: 'zc.session',
  language: 'zc.language',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

/**
 * The ONLY file in the app that touches localStorage (ESLint enforces it).
 *
 * Reads are validated: a value is returned only if it parses AND passes the
 * caller's type guard. v1 wrote `localStorage.setItem('token', undefined)` after
 * a failed login, which stores the four-character string "undefined". That string
 * is truthy, so every guard let the user straight through. Here `JSON.parse` of
 * "undefined" throws, so the read yields null instead.
 *
 * Every access is wrapped: storage can be unavailable (private windows, blocked
 * site data) or full, and the app must keep working without it.
 */
@Injectable({ providedIn: 'root' })
export class LocalStorageService {
  read<T>(key: StorageKey, isValid: (value: unknown) => value is T): T | null {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      const parsed: unknown = JSON.parse(raw);
      return isValid(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  /** Writes the value, or removes the key for null and undefined. */
  write(key: StorageKey, value: unknown): void {
    try {
      if (value === null || value === undefined) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage unavailable or full: persistence is a convenience, not a requirement.
    }
  }
}
