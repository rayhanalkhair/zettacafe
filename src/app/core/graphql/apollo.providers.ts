import type { Provider } from '@angular/core';
import { ApolloLink, InMemoryCache } from '@apollo/client';
import { HttpLink } from '@apollo/client/link/http';
import { provideApollo } from 'apollo-angular';
import { Observable } from 'rxjs';

/**
 * A terminating link that loads the in-browser GraphQL server on first use.
 *
 * The server (graphql, @graphql-tools, idb, every resolver and seed) is well over
 * 200 kB. A static import would put all of it in the initial bundle, which is
 * exactly how v1 reached 1.10 MB with lazy loading silently doing nothing. Behind
 * a dynamic import it becomes its own chunk, fetched when the first operation
 * runs and shared by every one after. `check-bundle.mjs` asserts the boundary.
 */
function createLazySchemaLink(): ApolloLink {
  let loaded: Promise<ApolloLink> | null = null;

  const load = (): Promise<ApolloLink> =>
    (loaded ??= (async () => {
      const [{ schema, contextFor }, { SchemaLink }] = await Promise.all([
        import('@server/schema'),
        import('@apollo/client/link/schema'),
      ]);
      return new SchemaLink({ schema, context: (operation) => contextFor(operation) });
    })());

  return new ApolloLink(
    (operation, forward) =>
      new Observable((subscriber) => {
        let inner: { unsubscribe(): void } | undefined;
        load().then(
          (link) => {
            inner = link.request(operation, forward)?.subscribe(subscriber);
          },
          (error: unknown) => subscriber.error(error),
        );
        return () => inner?.unsubscribe();
      }),
  );
}

/**
 * Apollo, wired to either backend. Documents are identical either way, so
 * pointing the app at a real server later is a build-config change (`API_URL`
 * in angular.json) and nothing else.
 *
 * `API_URL` is substituted at build time, so with a URL the in-browser branch,
 * its dynamic import and its chunk are all removed from the build.
 */
export function provideZcApollo(): Provider {
  return provideApollo(() => ({
    link: API_URL ? new HttpLink({ uri: API_URL }) : createLazySchemaLink(),
    cache: new InMemoryCache(),
  }));
}
