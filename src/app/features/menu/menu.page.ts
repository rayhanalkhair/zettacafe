import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { from } from 'rxjs';
import { SessionStore } from '@core/auth/session.store';
import { ConfirmService } from '@core/feedback/confirm.service';
import { LanguageStore } from '@core/i18n/language.store';
import { SearchField } from '@shared/forms/search-field';
import { MenuBoardRow } from '@shared/ui/menu-board-row/menu-board-row';
import type { MenuItem } from '@shared/ui/menu-item';
import { PageShell } from '@shared/ui/page-shell/page-shell';
import { Pager } from '@shared/ui/pager/pager';
import { SectionHeading } from '@shared/ui/section-heading/section-heading';
import { EmptyState, ErrorState, LoadingPane } from '@shared/ui/states/states';
import { AddToCartDialog } from '@shared/dialogs/add-to-cart/add-to-cart.dialog';
import { MENU_PAGE_SIZE, MenuService, type MenuCategory } from './menu.service';

type View = 'loading' | 'error' | 'empty' | 'ready';

/**
 * The menu, as a board. What is being looked at (search, category, page) lives in the
 * URL, so a reload keeps it, the back button steps through it, and a link shares it.
 * The router binds those query parameters straight to the inputs below.
 */
@Component({
  selector: 'zc-menu-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    EmptyState,
    ErrorState,
    LoadingPane,
    MatButton,
    MenuBoardRow,
    PageShell,
    Pager,
    SearchField,
    SectionHeading,
    TranslatePipe,
  ],
  templateUrl: './menu.page.html',
  styleUrl: './menu.page.scss',
})
export class MenuPage {
  /** Query parameters, bound by the router. Absent means undefined. */
  readonly search = input<string | undefined>();
  readonly category = input<string | undefined>();
  readonly page = input<string | undefined>();

  private readonly menu = inject(MenuService);
  private readonly session = inject(SessionStore);
  private readonly language = inject(LanguageStore);
  private readonly confirm = inject(ConfirmService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  protected readonly term = computed(() => (this.search() ?? '').trim());
  protected readonly selected = computed<MenuCategory | null>(() => {
    if (this.category() === 'food') return 'FOOD';
    if (this.category() === 'drink') return 'DRINK';
    return null;
  });
  protected readonly pageNumber = computed(() =>
    Math.max(1, Number.parseInt(this.page() ?? '1', 10) || 1),
  );
  protected readonly offset = computed(() => (this.pageNumber() - 1) * MENU_PAGE_SIZE);
  protected readonly pageSize = MENU_PAGE_SIZE;

  /** Refetches whenever the URL or the language changes. */
  protected readonly recipes = rxResource({
    params: () => ({
      search: this.term(),
      category: this.selected(),
      offset: this.offset(),
      language: this.language.language(),
    }),
    stream: ({ params }) => from(this.menu.load(params)),
  });

  protected readonly items = computed(() => this.recipes.value()?.items ?? []);
  protected readonly total = computed(() => this.recipes.value()?.totalCount ?? 0);

  protected readonly view = computed<View>(() => {
    if (this.recipes.error()) return 'error';
    if (!this.recipes.hasValue()) return 'loading';
    return this.items().length === 0 ? 'empty' : 'ready';
  });

  /** `param` is what appears in the URL. */
  protected readonly categories: readonly {
    id: MenuCategory | null;
    param: string | null;
    key: string;
  }[] = [
    { id: null, param: null, key: 'menu.category.all' },
    { id: 'FOOD', param: 'food', key: 'menu.category.food' },
    { id: 'DRINK', param: 'drink', key: 'menu.category.drink' },
  ];

  protected setSearch(term: string): void {
    void this.navigate({ search: term || null, page: null }, true);
  }

  protected setCategory(value: string | null): void {
    void this.navigate({ category: value, page: null });
  }

  protected setOffset(offset: number): void {
    const page = offset / MENU_PAGE_SIZE + 1;
    void this.navigate({ page: page > 1 ? page : null });
  }

  protected clearFilters(): void {
    void this.navigate({ search: null, category: null, page: null });
  }

  /**
   * A guest is asked to sign in (v1 rule 3: guests browse but cannot order), and
   * comes back to this same view afterwards. A signed-in customer chooses how many.
   */
  protected async add(item: MenuItem): Promise<void> {
    if (!this.session.isAuthenticated()) {
      const wantsToSignIn = await this.confirm.ask({
        titleKey: 'menu.guest.title',
        messageKey: 'menu.guest.message',
        confirmKey: 'menu.guest.confirm',
      });
      if (wantsToSignIn) {
        await this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      }
      return;
    }

    this.dialog.open(AddToCartDialog, {
      width: 'min(28rem, calc(100vw - 2rem))',
      data: {
        mode: 'add',
        recipeId: item.id,
        recipeName: item.name,
        availableServings: item.availableServings,
      },
    });
  }

  private navigate(queryParams: Record<string, string | number | null>, replace = false) {
    return this.router.navigate([], {
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: replace,
    });
  }
}
