import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { SessionStore } from '@core/auth/session.store';
import { ConfirmService } from '@core/feedback/confirm.service';
import { FORM_DIALOG } from '../../ui/dialog-focus';
import type { MenuItem } from '../../ui/menu-item';
import { AddToCartDialog } from './add-to-cart.dialog';

/**
 * "Order this dish", the same on every page that offers one (the menu, the home page).
 *
 * A guest is asked to sign in (v1 rule 3: guests browse but cannot order) and comes back
 * to the very page they were on. A signed-in customer chooses how many, and a note.
 */
@Injectable({ providedIn: 'root' })
export class AddToCartService {
  private readonly session = inject(SessionStore);
  private readonly confirm = inject(ConfirmService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  async start(item: MenuItem): Promise<void> {
    if (!this.session.isAuthenticated()) {
      const wantsToSignIn = await this.confirm.ask({
        titleKey: 'cartDialog.guest.title',
        messageKey: 'cartDialog.guest.message',
        confirmKey: 'cartDialog.guest.confirm',
      });
      if (wantsToSignIn) {
        await this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      }
      return;
    }

    this.dialog.open(AddToCartDialog, {
      width: 'min(28rem, calc(100vw - 2rem))',
      ...FORM_DIALOG,
      data: {
        mode: 'add',
        recipeId: item.id,
        recipeName: item.name,
        availableServings: item.availableServings,
      },
    });
  }
}
