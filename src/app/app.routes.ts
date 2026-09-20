import type { Routes } from '@angular/router';

export const routes: Routes = [
  // Dev-only tooling. DEV_TOOLS is substituted at build time (see src/env.d.ts),
  // so in production this branch, its dynamic import and the chunk are all gone.
  ...(DEV_TOOLS
    ? [
        {
          path: 'dev/tokens',
          title: 'Design tokens',
          loadComponent: () => import('./dev/tokens/tokens.page').then((m) => m.TokensPage),
        },
        {
          path: 'dev/graphql',
          title: 'GraphQL console',
          loadComponent: () =>
            import('./dev/graphql/graphql-console.page').then((m) => m.GraphqlConsolePage),
        },
        {
          path: 'dev/session',
          title: 'Session',
          loadComponent: () => import('./dev/session/session.page').then((m) => m.SessionPage),
        },
      ]
    : []),
];
