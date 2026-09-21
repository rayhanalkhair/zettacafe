import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom, from } from 'rxjs';
import { ConfirmService } from '@core/feedback/confirm.service';
import { NotificationService } from '@core/feedback/notification.service';
import { ZcNumberPipe } from '@core/i18n/zc-formatting.pipes';
import { SearchField } from '@shared/forms/search-field';
import { FORM_DIALOG, MODAL_DIALOG } from '@shared/ui/dialog-focus';
import { Money } from '@shared/ui/money/money';
import { PageShell } from '@shared/ui/page-shell/page-shell';
import { Pager } from '@shared/ui/pager/pager';
import { SectionHeading } from '@shared/ui/section-heading/section-heading';
import { StatusPill } from '@shared/ui/status-pill/status-pill';
import { TableShell, type TableState } from '@shared/ui/table-shell/table-shell';
import { RecipeDetailDialog } from './recipe-detail.dialog';
import { RecipeFormDialog, type RecipeFormData } from './recipe-form.dialog';
import {
  RECIPES_PAGE_SIZE,
  RecipesService,
  type AdminRecipe,
  type SortDirection,
  type SortField,
  type StatusFilter,
} from './recipes.service';

type AriaSort = 'ascending' | 'descending' | 'none';

const FORM_WIDTH = 'min(44rem, calc(100vw - 2rem))';

/**
 * The recipe table. What is being looked at (search, status, sort, page) lives in the
 * URL. Publishing and unpublishing ask first, and a "No" does nothing: v1's toggle ran
 * its mutation on the No branch too, with the value flipped.
 */
@Component({
  selector: 'zc-recipes-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButton,
    Money,
    PageShell,
    Pager,
    SearchField,
    SectionHeading,
    StatusPill,
    TableShell,
    TranslatePipe,
    ZcNumberPipe,
  ],
  templateUrl: './recipes.page.html',
  styleUrl: './recipes.page.scss',
})
export class RecipesPage {
  /** Query parameters, bound by the router. Absent means undefined. */
  readonly search = input<string | undefined>();
  readonly status = input<string | undefined>();
  readonly sort = input<string | undefined>();
  readonly dir = input<string | undefined>();
  readonly page = input<string | undefined>();

  private readonly recipes = inject(RecipesService);
  private readonly confirm = inject(ConfirmService);
  private readonly notifications = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  protected readonly pageSize = RECIPES_PAGE_SIZE;

  protected readonly term = computed(() => (this.search() ?? '').trim());
  protected readonly statusFilter = computed<StatusFilter>(() => {
    if (this.status() === 'published') return 'published';
    if (this.status() === 'draft') return 'draft';
    return 'all';
  });
  protected readonly sortField = computed<SortField>(() =>
    this.sort() === 'price' ? 'PRICE' : 'NAME',
  );
  protected readonly direction = computed<SortDirection>(() =>
    this.dir() === 'desc' ? 'DESC' : 'ASC',
  );
  protected readonly pageNumber = computed(() =>
    Math.max(1, Number.parseInt(this.page() ?? '1', 10) || 1),
  );
  protected readonly offset = computed(() => (this.pageNumber() - 1) * RECIPES_PAGE_SIZE);

  protected readonly result = rxResource({
    params: () => ({
      search: this.term(),
      status: this.statusFilter(),
      sort: this.sortField(),
      direction: this.direction(),
      offset: this.offset(),
    }),
    stream: ({ params }) => from(this.recipes.load(params)),
  });

  protected readonly items = computed(() => this.result.value()?.items ?? []);
  protected readonly total = computed(() => this.result.value()?.totalCount ?? 0);

  protected readonly state = computed<TableState>(() => {
    if (this.result.error()) return 'error';
    if (!this.result.hasValue()) return 'loading';
    return this.items().length === 0 ? 'empty' : 'ready';
  });

  protected readonly filters: readonly {
    value: StatusFilter;
    param: string | null;
    key: string;
  }[] = [
    { value: 'all', param: null, key: 'recipes.filter.all' },
    { value: 'published', param: 'published', key: 'recipes.filter.published' },
    { value: 'draft', param: 'draft', key: 'recipes.filter.draft' },
  ];

  /** The words for the publish toggle. Keys, spelled out, so the i18n check sees them. */
  protected readonly toggleLabels = {
    publish: { buttonKey: 'recipes.publish.button', ariaKey: 'recipes.publishAria' },
    unpublish: { buttonKey: 'recipes.unpublish.button', ariaKey: 'recipes.unpublishAria' },
  } as const;

  protected ariaSort(field: SortField): AriaSort {
    if (this.sortField() !== field) return 'none';
    return this.direction() === 'ASC' ? 'ascending' : 'descending';
  }

  protected setSearch(term: string): void {
    void this.navigate({ search: term || null, page: null }, true);
  }

  protected setStatusFilter(param: string | null): void {
    void this.navigate({ status: param, page: null });
  }

  /** Sorting by the active column flips its direction; a new column starts ascending. */
  protected sortBy(field: SortField): void {
    const flip = this.sortField() === field && this.direction() === 'ASC';
    void this.navigate({
      sort: field === 'PRICE' ? 'price' : null,
      dir: flip ? 'desc' : null,
      page: null,
    });
  }

  protected setOffset(offset: number): void {
    const page = offset / RECIPES_PAGE_SIZE + 1;
    void this.navigate({ page: page > 1 ? page : null });
  }

  protected clearFilters(): void {
    void this.navigate({ search: null, status: null, page: null });
  }

  protected details(recipe: AdminRecipe): void {
    this.dialog.open(RecipeDetailDialog, {
      width: 'min(36rem, calc(100vw - 2rem))',
      ...MODAL_DIALOG,
      data: { recipe },
    });
  }

  protected async create(): Promise<void> {
    await this.openForm({ mode: 'create' });
  }

  protected async edit(recipe: AdminRecipe): Promise<void> {
    await this.openForm({ mode: 'edit', recipe });
  }

  /** Asks first, and acts only when the answer is yes. */
  protected async toggleStatus(recipe: AdminRecipe): Promise<void> {
    const publishing = recipe.status !== 'PUBLISHED';
    // Keys, spelled out, so the i18n check can see every one of them.
    const words = publishing
      ? {
          titleKey: 'recipes.publish.title',
          messageKey: 'recipes.publish.message',
          confirmKey: 'recipes.publish.confirm',
          doneKey: 'recipes.published',
        }
      : {
          titleKey: 'recipes.unpublish.title',
          messageKey: 'recipes.unpublish.message',
          confirmKey: 'recipes.unpublish.confirm',
          doneKey: 'recipes.unpublished',
        };
    const confirmed = await this.confirm.ask({
      titleKey: words.titleKey,
      messageKey: words.messageKey,
      confirmKey: words.confirmKey,
      params: { name: recipe.name },
    });
    if (!confirmed) return;

    try {
      await this.recipes.setStatus(recipe.id, publishing ? 'PUBLISHED' : 'DRAFT');
      this.notifications.success(words.doneKey, { name: recipe.name });
      this.result.reload();
    } catch (error) {
      this.notifications.fromError(error);
    }
  }

  protected async remove(recipe: AdminRecipe): Promise<void> {
    const confirmed = await this.confirm.ask({
      titleKey: 'recipes.delete.title',
      messageKey: 'recipes.delete.message',
      confirmKey: 'recipes.delete.confirm',
      params: { name: recipe.name },
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      await this.recipes.remove(recipe.id);
      this.notifications.info('recipes.deleted', { name: recipe.name });
      this.result.reload();
      // Deleting the last row of a later page leaves nothing to show: step back one.
      if (this.pageNumber() > 1 && this.items().length === 1) {
        await this.navigate({ page: this.pageNumber() - 1 > 1 ? this.pageNumber() - 1 : null });
      }
    } catch (error) {
      this.notifications.fromError(error);
    }
  }

  private async openForm(data: RecipeFormData): Promise<void> {
    const ref = this.dialog.open<RecipeFormDialog, RecipeFormData, boolean>(RecipeFormDialog, {
      width: FORM_WIDTH,
      ...FORM_DIALOG,
      data,
    });
    if ((await firstValueFrom(ref.afterClosed())) === true) this.result.reload();
  }

  private navigate(queryParams: Record<string, string | number | null>, replace = false) {
    return this.router.navigate([], {
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: replace,
    });
  }
}
