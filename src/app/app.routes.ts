import type { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from '@core/auth/guards';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'titles.home',
    loadComponent: () => import('@features/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'about',
    title: 'titles.about',
    loadComponent: () => import('@features/about/about.page').then((m) => m.AboutPage),
  },
  // v1 mounted the About page at /profile too. Keep old links working.
  { path: 'profile', redirectTo: 'about', pathMatch: 'full' },
  {
    path: 'menu',
    title: 'titles.menu',
    loadComponent: () => import('@features/menu/menu.page').then((m) => m.MenuPage),
  },
  {
    path: 'cart',
    title: 'titles.cart',
    canActivate: [authGuard],
    loadComponent: () => import('@features/cart/cart.page').then((m) => m.CartPage),
  },
  {
    path: 'orders',
    title: 'titles.orders',
    canActivate: [authGuard],
    loadComponent: () => import('@features/cart/orders.page').then((m) => m.OrdersPage),
  },
  {
    path: 'admin/recipes',
    title: 'titles.adminRecipes',
    canActivate: [adminGuard],
    loadComponent: () => import('@features/admin/recipes/recipes.page').then((m) => m.RecipesPage),
  },
  {
    path: 'admin/ingredients',
    title: 'titles.adminIngredients',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('@features/admin/ingredients/ingredients.page').then((m) => m.IngredientsPage),
  },
  {
    path: 'login',
    title: 'titles.login',
    canActivate: [guestGuard],
    loadComponent: () => import('@features/auth/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    title: 'titles.register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('@features/auth/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'forgot-password',
    title: 'titles.forgotPassword',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('@features/auth/forgot-password/forgot-password.page').then(
        (m) => m.ForgotPasswordPage,
      ),
  },
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
          path: 'dev/kitchen-sink',
          title: 'Kitchen sink',
          loadComponent: () =>
            import('./dev/kitchen-sink/kitchen-sink.page').then((m) => m.KitchenSinkPage),
        },
        {
          path: 'dev/session',
          title: 'Session',
          loadComponent: () => import('./dev/session/session.page').then((m) => m.SessionPage),
        },
      ]
    : []),
];
