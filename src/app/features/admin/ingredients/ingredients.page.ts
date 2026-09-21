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
import { FORM_DIALOG } from '@shared/ui/dialog-focus';
import { PageShell } from '@shared/ui/page-shell/page-shell';
import { Pager } from '@shared/ui/pager/pager';
import { SectionHeading } from '@shared/ui/section-heading/section-heading';
import { StatusPill } from '@shared/ui/status-pill/status-pill';
import { TableShell, type TableState } from '@shared/ui/table-shell/table-shell';
import { IngredientFormDialog } from './ingredient-form.dialog';
import {
  INGREDIENTS_PAGE_SIZE,
  IngredientsService,
  type Availability,
  type Ingredient,
  type SortDirection,
  type SortField,
} from './ingredients.service';

type AriaSort = 'ascending' | 'descending' | 'none';

/**
 * The ingredient table. What is being looked at (search, availability, sort, page)
 * lives in the URL, so a reload keeps it and a link shares it.
 *
 * v1's version leaked a subscription per table, queried the server on every keystroke,
 * and bound its search box twice, which Angular 17 removed. Here the query is a
 * resource over the URL and the search box debounces itself.
 */
@Component({
  selector: 'zc-ingredients-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButton,
    PageShell,
    Pager,
    SearchField,
    SectionHeading,
    StatusPill,
    TableShell,
    TranslatePipe,
    ZcNumberPipe,
  ],
  templateUrl: './ingredients.page.html',
  styleUrl: './ingredients.page.scss',
})
export class IngredientsPage {
  /** Query parameters, bound by the router. Absent means undefined. */
  readonly search = input<string | undefined>();
  readonly stock = input<string | undefined>();
  readonly sort = input<string | undefined>();
  readonly dir = input<string | undefined>();
  readonly page = input<string | undefined>();

  private readonly ingredients = inject(IngredientsService);
  private readonly confirm = inject(ConfirmService);
  private readonly notifications = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  protected readonly pageSize = INGREDIENTS_PAGE_SIZE;

  protected readonly term = computed(() => (this.search() ?? '').trim());
  protected readonly availability = computed<Availability>(() => {
    if (this.stock() === 'in') return 'in';
    if (this.stock() === 'out') return 'out';
    return 'all';
  });
  protected readonly sortField = computed<SortField>(() =>
    this.sort() === 'stock' ? 'STOCK' : 'NAME',
  );
  protected readonly direction = computed<SortDirection>(() =>
    this.dir() === 'desc' ? 'DESC' : 'ASC',
  );
  protected readonly pageNumber = computed(() =>
    Math.max(1, Number.parseInt(this.page() ?? '1', 10) || 1),
  );
  protected readonly offset = computed(() => (this.pageNumber() - 1) * INGREDIENTS_PAGE_SIZE);

  protected readonly result = rxResource({
    params: () => ({
      search: this.term(),
      availability: this.availability(),
      sort: this.sortField(),
      direction: this.direction(),
      offset: this.offset(),
    }),
    stream: ({ params }) => from(this.ingredients.load(params)),
  });

  protected readonly items = computed(() => this.result.value()?.items ?? []);
  protected readonly total = computed(() => this.result.value()?.totalCount ?? 0);

  protected readonly state = computed<TableState>(() => {
    if (this.result.error()) return 'error';
    if (!this.result.hasValue()) return 'loading';
    return this.items().length === 0 ? 'empty' : 'ready';
  });

  protected readonly filters: readonly {
    value: Availability;
    param: string | null;
    key: string;
  }[] = [
    { value: 'all', param: null, key: 'ingredients.filter.all' },
    { value: 'in', param: 'in', key: 'ingredients.filter.in' },
    { value: 'out', param: 'out', key: 'ingredients.filter.out' },
  ];

  /** What a screen reader hears for a sortable column header. */
  protected ariaSort(field: SortField): AriaSort {
    if (this.sortField() !== field) return 'none';
    return this.direction() === 'ASC' ? 'ascending' : 'descending';
  }

  protected setSearch(term: string): void {
    void this.navigate({ search: term || null, page: null }, true);
  }

  protected setAvailability(param: string | null): void {
    void this.navigate({ stock: param, page: null });
  }

  /** Sorting by the active column flips its direction; a new column starts ascending. */
  protected sortBy(field: SortField): void {
    const flip = this.sortField() === field && this.direction() === 'ASC';
    void this.navigate({
      sort: field === 'STOCK' ? 'stock' : null,
      dir: flip ? 'desc' : null,
      page: null,
    });
  }

  protected setOffset(offset: number): void {
    const page = offset / INGREDIENTS_PAGE_SIZE + 1;
    void this.navigate({ page: page > 1 ? page : null });
  }

  protected clearFilters(): void {
    void this.navigate({ search: null, stock: null, page: null });
  }

  protected async create(): Promise<void> {
    await this.openForm({ mode: 'create' });
  }

  protected async edit(ingredient: Ingredient): Promise<void> {
    await this.openForm({ mode: 'edit', ingredient });
  }

  protected async remove(ingredient: Ingredient): Promise<void> {
    const confirmed = await this.confirm.ask({
      titleKey: 'ingredients.delete.title',
      messageKey: 'ingredients.delete.message',
      confirmKey: 'ingredients.delete.confirm',
      params: { name: ingredient.name },
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      await this.ingredients.remove(ingredient.id);
      this.notifications.info('ingredients.deleted', { name: ingredient.name });
      await this.afterChange({ deleted: true });
    } catch (error) {
      // Most often RECIPE_IN_USE: a live recipe still depends on it.
      this.notifications.fromError(error);
    }
  }

  private async openForm(data: { mode: 'create' } | { mode: 'edit'; ingredient: Ingredient }) {
    const ref = this.dialog.open<IngredientFormDialog, typeof data, boolean>(IngredientFormDialog, {
      width: 'min(28rem, calc(100vw - 2rem))',
      ...FORM_DIALOG,
      data,
    });
    if ((await firstValueFrom(ref.afterClosed())) === true) await this.afterChange();
  }

  /** Reloads, and steps back a page if deleting emptied the last one. */
  private async afterChange(options: { deleted?: boolean } = {}): Promise<void> {
    this.result.reload();
    if (options.deleted && this.pageNumber() > 1 && this.items().length === 1) {
      await this.navigate({ page: this.pageNumber() - 1 > 1 ? this.pageNumber() - 1 : null });
    }
  }

  private navigate(queryParams: Record<string, string | number | null>, replace = false) {
    return this.router.navigate([], {
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: replace,
    });
  }
}
