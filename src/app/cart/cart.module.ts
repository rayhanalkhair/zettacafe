import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartComponent } from './cart.component';
import { AngularMaterialModule } from '../shared/angular-material/angular-material.module';
import { RouterModule, Routes } from '@angular/router';
import { CartEditComponent } from './cart-edit/cart-edit.component';
import { ReactiveFormsModule } from '@angular/forms';
import { HistoryTransactionComponent } from './history-transaction/history-transaction.component';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';

export function HttpLoaderFactory(httpClient: HttpClient) {
  return new TranslateHttpLoader(httpClient);
}

const routes: Routes = [{ path: '', component: CartComponent, title: 'Cart' }];

@NgModule({
  declarations: [CartComponent, CartEditComponent, HistoryTransactionComponent],
  imports: [
    CommonModule,
    AngularMaterialModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    TranslateModule.forChild({
      defaultLanguage: 'en',
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
  ],
  exports: [CartComponent, HistoryTransactionComponent, CartEditComponent],
})
export class CartModule {}
