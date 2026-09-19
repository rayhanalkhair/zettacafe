import { provideZonelessChangeDetection } from '@angular/core';
import type { EnvironmentProviders, Provider } from '@angular/core';

/**
 * Providers applied to every TestBed in the suite.
 *
 * Zoneless is the app's change-detection strategy, so tests must run the same
 * way: under zoneless, `fixture.detectChanges()` no longer flushes everything
 * and specs must `await fixture.whenStable()`.
 */
const providers: (Provider | EnvironmentProviders)[] = [provideZonelessChangeDetection()];

export default providers;
