import 'fake-indexeddb/auto';
import { inject, type Provider } from '@angular/core';
import { ApolloLink, InMemoryCache } from '@apollo/client';
import { SchemaLink } from '@apollo/client/link/schema';
import { provideApollo } from 'apollo-angular';
import { SessionStore } from '@core/auth/session.store';
import { createAuthLink, createErrorLink } from '@core/graphql/links';
import { contextFor, schema } from '@server/schema';
import { DEMO_ACCOUNTS } from '@server/seed/users.seed';

export { DEMO_ACCOUNTS };

let databases = 0;

export interface TestBackendOptions {
  /** Called when the server rejects a signed-in session, like the app's notice. */
  onSessionExpired?: () => void;
}

/**
 * Apollo over the REAL executable schema and a private in-memory IndexedDB, wired
 * with the app's own auth and error links. Specs for stores and services run
 * against the actual resolvers, authorization and checkout transaction, with
 * nothing mocked: the v1 `cart[0]` bug would have been mocked straight past.
 *
 * Each call gets a fresh database, so specs cannot leak state into each other.
 * Lives outside `src/app/core` because core must not import the server.
 */
export function provideTestApollo(options: TestBackendOptions = {}): Provider {
  const dbName = `zettacafe-spec-${++databases}-${Math.random().toString(36).slice(2, 8)}`;

  return provideApollo(() => {
    const session = inject(SessionStore);
    const terminating = new SchemaLink({
      schema,
      context: (operation) =>
        contextFor(operation, {
          dbName,
          config: { pbkdf2Iterations: 1000 },
          fetch: () => Promise.reject(new Error('offline in tests')),
        }),
    });
    return {
      link: ApolloLink.from([
        createErrorLink({
          isSignedIn: () => session.isAuthenticated(),
          onSessionExpired: () => {
            session.signOut();
            options.onSessionExpired?.();
          },
        }),
        createAuthLink(() => session.token()),
        terminating,
      ]),
      cache: new InMemoryCache(),
    };
  });
}
