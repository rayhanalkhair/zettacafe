import { provideZonelessChangeDetection } from '@angular/core';
import type { EnvironmentProviders, Provider } from '@angular/core';
import { vi } from 'vitest';

/**
 * `vi.waitFor` gives up after one second by default. That is tight for specs that
 * round-trip a real GraphQL resolver, IndexedDB and a Material dialog while several
 * test files run in parallel, and it made otherwise correct specs fail one run in
 * five. Four seconds is generous for a genuine wait and still fails fast on a real
 * defect. A spec can pass its own `timeout`.
 */
const DEFAULT_WAIT_MS = 4000;
const waitFor = vi.waitFor.bind(vi);
vi.waitFor = (callback, options) =>
  waitFor(
    callback,
    typeof options === 'number' ? options : { timeout: DEFAULT_WAIT_MS, ...options },
  );

/**
 * Providers applied to every TestBed in the suite.
 *
 * Zoneless is the app's change-detection strategy, so tests must run the same
 * way: under zoneless, `fixture.detectChanges()` no longer flushes everything
 * and specs must `await fixture.whenStable()`.
 */
const providers: (Provider | EnvironmentProviders)[] = [provideZonelessChangeDetection()];

export default providers;
