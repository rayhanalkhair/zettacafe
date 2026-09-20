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
      ]
    : []),
];
