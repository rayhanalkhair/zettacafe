import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { from } from 'rxjs';
import { SessionStore } from '@core/auth/session.store';
import { LanguageStore } from '@core/i18n/language.store';
import { AddToCartService } from '@shared/dialogs/add-to-cart/add-to-cart.service';
import type { MenuItem } from '@shared/ui/menu-item';
import { PageShell } from '@shared/ui/page-shell/page-shell';
import { RecipeCard } from '@shared/ui/recipe-card/recipe-card';
import { SectionHeading } from '@shared/ui/section-heading/section-heading';
import { ErrorState, LoadingPane } from '@shared/ui/states/states';
import { HomeService } from './home.service';

type View = 'loading' | 'error' | 'ready';

/**
 * The front door: a short introduction, then the dishes the kitchen wants you to see
 * (featured) and the ones on offer (discounted). It reuses the shared RecipeCard, where
 * v1 re-implemented the same card inline in 32 lines of template.
 */
@Component({
  selector: 'zc-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ErrorState,
    LoadingPane,
    MatButton,
    PageShell,
    RecipeCard,
    RouterLink,
    SectionHeading,
    TranslatePipe,
  ],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  protected readonly session = inject(SessionStore);
  private readonly home = inject(HomeService);
  private readonly language = inject(LanguageStore);
  private readonly addToCart = inject(AddToCartService);

  /** Refetches when the language changes, so descriptions follow it. */
  protected readonly content = rxResource({
    params: () => ({ language: this.language.language() }),
    stream: ({ params }) => from(this.home.load(params.language)),
  });

  protected readonly featured = computed(() => this.content.value()?.featured ?? []);
  protected readonly discounted = computed(() => this.content.value()?.discounted ?? []);

  protected readonly view = computed<View>(() => {
    if (this.content.error()) return 'error';
    return this.content.hasValue() ? 'ready' : 'loading';
  });

  protected add(item: MenuItem): Promise<void> {
    return this.addToCart.start(item);
  }
}
