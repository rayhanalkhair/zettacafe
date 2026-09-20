import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import type { RouterStateSnapshot } from '@angular/router';
import { TitleStrategy } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

const SITE = 'ZettaCafe';

/**
 * Sets the document title from a route's `title`, treated as an i18n key, and keeps
 * it in the active language when that changes. A page title is the first thing a
 * screen reader announces (WCAG 2.4.2); v1 hardcoded a single English title for
 * the whole app, and it read "AngularMaterial".
 *
 * A `title` that is not a known key (the dev pages use plain text) is shown as is.
 */
@Injectable({ providedIn: 'root' })
export class TranslatedTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly translate = inject(TranslateService);
  private key: string | undefined;

  constructor() {
    super();
    // Language changes do not navigate, so the title must follow them itself.
    this.translate.onLangChange.subscribe(() => this.apply());
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.key = this.buildTitle(snapshot);
    this.apply();
  }

  private apply(): void {
    if (!this.key) {
      this.title.setTitle(SITE);
      return;
    }
    const translated = this.translate.instant(this.key) as string;
    const page = translated || this.key;
    this.title.setTitle(page === SITE ? SITE : `${page} · ${SITE}`);
  }
}
