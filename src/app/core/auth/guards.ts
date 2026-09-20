import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { SessionStore } from './session.store';

/**
 * Route guards. Each reads the typed SessionStore, so none can be fooled by the
 * string "undefined" the way v1's `if (localStorage.getItem('token'))` was, and
 * each returns a UrlTree rather than calling navigate() and returning false.
 *
 * These are a convenience for the UI only. Authorization is enforced by the
 * server's resolvers; a guard cannot protect data.
 */

/** Signed-in users only. Guests go to login and come back afterwards. */
export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionStore);
  return (
    session.isAuthenticated() ||
    inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })
  );
};

/** Admins only. A signed-in customer goes home; a guest goes to login. */
export const adminGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionStore);
  const router = inject(Router);
  if (!session.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  return session.isAdmin() || router.createUrlTree(['/']);
};

/** Guests only (login, register). A signed-in user has no business there. */
export const guestGuard: CanActivateFn = () => {
  return !inject(SessionStore).isAuthenticated() || inject(Router).createUrlTree(['/']);
};
