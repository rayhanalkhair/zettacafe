import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { ZcNumberPipe } from '@core/i18n/zc-formatting.pipes';
import { DialogShell } from '@shared/ui/dialog-shell/dialog-shell';
import { Money } from '@shared/ui/money/money';
import { StatusPill } from '@shared/ui/status-pill/status-pill';
import type { AdminRecipe } from './recipes.service';

export interface RecipeDetailData {
  readonly recipe: AdminRecipe;
}

/**
 * A read-only view of one recipe: what it is, what it costs, and what one serving
 * uses against what is in stock. It answers "why can't I order this?" at a glance.
 */
@Component({
  selector: 'zc-recipe-detail-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogShell, Money, StatusPill, TranslatePipe, ZcNumberPipe],
  templateUrl: './recipe-detail.dialog.html',
  styleUrl: './recipe-detail.dialog.scss',
})
export class RecipeDetailDialog {
  protected readonly recipe = inject<RecipeDetailData>(MAT_DIALOG_DATA).recipe;
}
