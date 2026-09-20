import type { ApolloLink } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { ErrorLink } from '@apollo/client/link/error';
import { hasErrorCode } from '@core/errors/to-user-message';

/**
 * Adds the bearer token to every operation. The token is read at request time from
 * the session store (not captured at startup), so signing in and out takes effect
 * immediately. v1 read `localStorage.getItem('token')` here.
 *
 * A caller that sets its own Authorization header, such as signOut ending the
 * session it just discarded locally, wins over the store.
 */
export function createAuthLink(getToken: () => string | null): ApolloLink {
  return new SetContextLink((previous) => {
    const headers = (previous as { headers?: Record<string, string> }).headers ?? {};
    const token = getToken();
    if (!token || headers['authorization']) return {};
    return { headers: { ...headers, authorization: `Bearer ${token}` } };
  });
}

/**
 * Reacts to a rejected session. When the server says UNAUTHENTICATED while the
 * user believes they are signed in (the token expired, or the password was reset
 * elsewhere), it ends the local session and tells them. It does nothing for a
 * guest, or the loop "unauthenticated -> notify" would fire on every public page.
 */
export function createErrorLink(handlers: {
  isSignedIn: () => boolean;
  onSessionExpired: () => void;
}): ApolloLink {
  return new ErrorLink(({ error }) => {
    if (handlers.isSignedIn() && hasErrorCode(error, 'UNAUTHENTICATED')) {
      handlers.onSessionExpired();
    }
  });
}
