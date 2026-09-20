import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, skip } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { SiteHeader } from './layout/site-header';

@Component({
  selector: 'zc-root',
  imports: [RouterOutlet, SiteHeader, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly document = inject(DOCUMENT);

  constructor() {
    // A single-page app does not reload, so a screen reader is told nothing when the
    // page changes. Moving focus to <main> after each navigation (not the first
    // load) makes it announce the new page, and starts keyboard users at the content.
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        skip(1),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.document.getElementById('main')?.focus());
  }

  /**
   * The skip link moves focus to <main> itself. A bare `href="#main"` would make the
   * router treat it as a navigation, and focus would not reliably follow.
   */
  protected skipToMain(event: Event): void {
    event.preventDefault();
    this.document.getElementById('main')?.focus();
  }
}
