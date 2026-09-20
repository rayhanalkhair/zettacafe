import { Component, type EnvironmentProviders, type Provider, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, type Route } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { guestGuard } from '@core/auth/guards';
import { provideTestApollo } from './apollo';
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
      provideRouter([
        ...routes,
        { path: 'cart', component: Placeholder },
        { path: '', pathMatch: 'full', component: Placeholder },
      ]),
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
