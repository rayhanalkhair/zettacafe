import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { LanguageStore } from '@core/i18n/language.store';
import { NumberField } from '@shared/forms/number-field';
import { PasswordField } from '@shared/forms/password-field';
import { SearchField } from '@shared/forms/search-field';
import { TextField } from '@shared/forms/text-field';
import { DialogShell } from '@shared/ui/dialog-shell/dialog-shell';
import { MenuBoardRow } from '@shared/ui/menu-board-row/menu-board-row';
import type { MenuItem } from '@shared/ui/menu-item';
import { Money } from '@shared/ui/money/money';
import { PageShell } from '@shared/ui/page-shell/page-shell';
import { Pager } from '@shared/ui/pager/pager';
import { RecipeCard } from '@shared/ui/recipe-card/recipe-card';
import { SectionHeading } from '@shared/ui/section-heading/section-heading';
import { EmptyState, ErrorState, LoadingPane } from '@shared/ui/states/states';
import { StatusPill } from '@shared/ui/status-pill/status-pill';
import { TableShell, type TableState } from '@shared/ui/table-shell/table-shell';

const PHOTO =
  'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=320&q=60';

const DISHES: readonly MenuItem[] = [
  {
    id: 'a',
    name: 'Nasi Goreng Kampung',
    description: 'Smoked rice, bird’s-eye chilli, fried shallot and a sunny-side egg.',
    imageUrl: PHOTO,
    priceIdr: 28000,
    discountedPriceIdr: 28000,
    discountPercent: 0,
    availableServings: 15,
    isAvailable: true,
  },
  {
    id: 'b',
    name: 'Rendang Daging',
    description: 'Beef slow-cooked for eight hours in coconut milk and kluwek.',
    imageUrl: null,
    priceIdr: 52000,
    discountedPriceIdr: 41600,
    discountPercent: 20,
    availableServings: 3,
    isAvailable: true,
  },
  {
    id: 'c',
    name: 'Rawon Surabaya',
    description: 'Black beef soup with bean sprouts, salted egg and sambal.',
    imageUrl: null,
    priceIdr: 38000,
    discountedPriceIdr: 38000,
    discountPercent: 0,
    availableServings: 0,
    isAvailable: false,
  },
];

/**
 * Phase 5 gate: every shared component in one place, to check at 360, 768 and 1440
 * in both themes. Dev-only; compiled out of production builds (see app.routes.ts).
 */
@Component({
  selector: 'zc-kitchen-sink-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    EmptyState,
    ErrorState,
    LoadingPane,
    MatButton,
    MenuBoardRow,
    Money,
    NumberField,
    PageShell,
    Pager,
    PasswordField,
    RecipeCard,
    SearchField,
    SectionHeading,
    StatusPill,
    TableShell,
    TextField,
  ],
  templateUrl: './kitchen-sink.page.html',
  styleUrl: './kitchen-sink.page.scss',
})
export class KitchenSinkPage {
  protected readonly language = inject(LanguageStore);
  private readonly dialog = inject(MatDialog);

  protected readonly dishes = DISHES;
  protected readonly offset = signal(0);
  protected readonly tableState = signal<TableState>('ready');
  protected readonly tableStates: readonly TableState[] = ['ready', 'loading', 'empty', 'error'];
  protected readonly lastSearch = signal('');

  protected readonly email = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });
  protected readonly password = new FormControl('', {
    nonNullable: true,
    validators: [Validators.minLength(8)],
  });
  protected readonly servings = new FormControl<number | null>(0, [Validators.min(1)]);

  constructor() {
    // Show the validation messages straight away so they can be reviewed.
    for (const control of [this.email, this.password, this.servings]) control.markAsTouched();
  }

  protected openDialog(): void {
    this.dialog.open(SampleDialog, { width: 'min(28rem, calc(100vw - 2rem))' });
  }
}

@Component({
  selector: 'zc-kitchen-sink-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogShell, MatButton],
  template: `
    <zc-dialog-shell heading="Add to cart">
      <p>Rendang Daging, 1 serving.</p>
      <div zcDialogActions>
        <button matButton="filled" type="button">Add</button>
      </div>
    </zc-dialog-shell>
  `,
})
export class SampleDialog {}
