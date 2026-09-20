import { Component, type EnvironmentProviders, type Provider, type Type } from '@angular/core';
import { gql, type OperationVariables, type TypedDocumentNode } from '@apollo/client';
import { Apollo } from 'apollo-angular';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding, type Route } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { guestGuard } from '@core/auth/guards';
import { SignInDocument } from '@core/graphql/generated/operations';
import { DEMO_ACCOUNTS, provideTestApollo } from './apollo';
import { provideTestTranslations } from './translate';

/** A stand-in for any page the spec is not about. */
@Component({ template: '<p id="placeholder">placeholder</p>' })
export class Placeholder {}

export interface Harness {
  readonly harness: RouterTestingHarness;
  readonly router: Router;
  /** The rendered page. */
  readonly el: HTMLElement;
}

/**
 * Renders a feature page the way the app does: through the router, with the real
 * guards, translations, and the real server behind Apollo. Other routes are
 * placeholders so navigation can be asserted by URL.
 */
export async function renderRoute(
  url: string,
  routes: Route[],
  extraProviders: (Provider | EnvironmentProviders)[] = [],
): Promise<Harness> {
  localStorage.clear();
  TestBed.configureTestingModule({
    providers: [
      provideRouter(
        [
          ...routes,
          { path: 'cart', component: Placeholder },
          { path: '', pathMatch: 'full', component: Placeholder },
        ],
        // As in the app: query parameters bind straight to component inputs.
        withComponentInputBinding(),
      ),
      provideTestApollo(),
      provideTestTranslations(),
      ...extraProviders,
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  await harness.fixture.whenStable();
  return {
    harness,
    router: TestBed.inject(Router),
    el: harness.routeNativeElement as HTMLElement,
  };
}

/** A guest-only route, as configured in app.routes.ts. */
export function guestRoute(path: string, component: Type<unknown>): Route {
  return { path, component, canActivate: [guestGuard] };
}

/** Types into the field with this label and lets the form update. */
export function fill(root: HTMLElement, label: string, value: string): void {
  const field = Array.from(root.querySelectorAll('label')).find(
    (l) => l.textContent.trim() === label,
  );
  const input = root.querySelector<HTMLInputElement>(
    `#${field?.getAttribute('for') ?? '__none__'}`,
  );
  if (!input) throw new Error(`No field labelled "${label}"`);
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

export function submitButton(root: HTMLElement): HTMLButtonElement {
  return root.querySelector('button[type="submit"]') as HTMLButtonElement;
}

export interface Dish {
  readonly id: string;
  readonly name: string;
  readonly availableServings: number;
}

/** A published dish from the seeded menu, found by name. */
export async function findDish(search: string): Promise<Dish> {
  const result = await TestBed.inject(Apollo).client.query({
    query: gql`
      query Find($search: String) {
        recipes(filter: { status: PUBLISHED, search: $search }) {
          items {
            id
            name
            availableServings
          }
        }
      }
    `,
    variables: { search },
    fetchPolicy: 'network-only',
  });
  const items = (result.data as { recipes: { items: Dish[] } }).recipes.items;
  if (!items[0]) throw new Error(`No dish matches "${search}"`);
  return items[0];
}

/**
 * Runs a mutation as the admin, in the same database, without touching the signed-in
 * session (a caller-supplied Authorization header wins over the store). This is how a
 * spec makes "someone else bought the last portions" true.
 */
export async function asAdmin<D, V extends OperationVariables>(
  mutation: TypedDocumentNode<D, V>,
  variables?: V,
): Promise<D | null | undefined> {
  const client = TestBed.inject(Apollo).client;
  const signedIn = await client.mutate({
    mutation: SignInDocument,
    variables: { input: DEMO_ACCOUNTS.admin },
  });
  const token = signedIn.data?.signIn.token;
  if (!token) throw new Error('could not sign in as admin');
  const result = await client.mutate({
    mutation,
    variables,
    context: { headers: { authorization: `Bearer ${token}` } },
  } as never);
  return (result as { data?: D | null }).data;
}
