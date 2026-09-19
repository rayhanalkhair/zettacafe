import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuComponent } from './menu.component';
import { AngularMaterialModule } from '../shared/angular-material/angular-material.module';
import { RouterModule, Routes } from '@angular/router';
import { ListMenuComponent } from './list-menu/list-menu.component';
import { CardMenuComponent } from './list-menu/card-menu/card-menu.component';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MenuFormComponent } from './menu-form/menu-form.component';
import { ReactiveFormsModule } from '@angular/forms';

import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

export function HttpLoaderFactory(httpClient: HttpClient) {
  return new TranslateHttpLoader(httpClient);
}

const routes: Routes = [{ path: '', component: MenuComponent, title: 'Menu' }];

@NgModule({
  declarations: [
    MenuComponent,
    ListMenuComponent,
    CardMenuComponent,
    MenuFormComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AngularMaterialModule,
    RouterModule.forChild(routes),
    HttpClientModule,
    TranslateModule.forChild({
      defaultLanguage: 'en',
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
  ],
  exports: [MenuComponent],
})
export class MenuModule {}
