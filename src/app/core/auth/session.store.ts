import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { LocalStorageService, StorageKeys } from '@core/storage/local-storage.service';

export type Role = 'ADMIN' | 'CUSTOMER';

export interface SessionUser {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly role: Role;
  readonly creditIdr: number;
}

export interface Session {
  readonly token: string;
  readonly user: SessionUser;
}

function isRole(value: unknown): value is Role {
  return value === 'ADMIN' || value === 'CUSTOMER';
}

function isSessionUser(value: unknown): value is SessionUser {
  if (typeof value !== 'object' || value === null) return false;
  const u = value as Record<string, unknown>;
  return (
    typeof u['id'] === 'string' &&
    typeof u['firstName'] === 'string' &&
    typeof u['lastName'] === 'string' &&
    typeof u['email'] === 'string' &&
    isRole(u['role']) &&
    typeof u['creditIdr'] === 'number'
  );
}

/** Rejects anything that is not a complete session, so a half-written value is a guest. */
export function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  return typeof s['token'] === 'string' && s['token'].length > 0 && isSessionUser(s['user']);
}

/**
 * Who is signed in. The single source of truth for identity.
 *
 * It replaces v1's three ad-hoc pieces: `AppComponent` fields that other
 * components reached into and assigned to, `localStorage` read in about eight
 * places, and three booleans (isToken, isAdmin, isCustomer) that could disagree.
 * Here `isAdmin` and `isCustomer` are computed from one value, so they cannot.
 *
 * It is pure state. Talking to the server is AuthService's job; this store only
 * remembers the result and persists it.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly storage = inject(LocalStorageService);

  private readonly state = signal<Session | null>(
    this.storage.read(StorageKeys.session, isSession),
  );

  readonly session = this.state.asReadonly();
  readonly user = computed(() => this.state()?.user ?? null);
  readonly token = computed(() => this.state()?.token ?? null);
  readonly isAuthenticated = computed(() => this.state() !== null);
  readonly isAdmin = computed(() => this.user()?.role === 'ADMIN');
  readonly isCustomer = computed(() => this.user()?.role === 'CUSTOMER');
  readonly creditIdr = computed(() => this.user()?.creditIdr ?? 0);
  readonly displayName = computed(() => {
    const user = this.user();
    return user ? `${user.firstName} ${user.lastName}`.trim() : '';
  });

  constructor() {
    effect(() => {
      this.storage.write(StorageKeys.session, this.state());
    });
  }

  signIn(session: Session): void {
    this.state.set(session);
  }

  signOut(): void {
    this.state.set(null);
  }

  /** Updates the signed-in user's fields, e.g. credit after a top-up or checkout. */
  patchUser(patch: Partial<SessionUser>): void {
    this.state.update((s) => (s ? { ...s, user: { ...s.user, ...patch } } : s));
  }
}
