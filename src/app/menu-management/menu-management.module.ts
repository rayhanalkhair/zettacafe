import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuManagementComponent } from './menu-management.component';
import { AngularMaterialModule } from '../shared/angular-material/angular-material.module';
import { RouterModule, Routes } from '@angular/router';
import { MenuFormComponent } from './menu-form/menu-form.component';
import { MenuEditComponent } from './menu-form/menu-edit/menu-edit.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MenuDetailComponent } from './menu-detail/menu-detail.component';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';

export function HttpLoaderFactory(httpClient: HttpClient) {
  return new TranslateHttpLoader(httpClient);
}

const routes: Routes = [
  { path: '', component: MenuManagementComponent, title: 'Menu Management' },
];

@NgModule({
  declarations: [
    MenuManagementComponent,
    MenuFormComponent,
    MenuEditComponent,
    MenuDetailComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    AngularMaterialModule,
    RouterModule.forChild(routes),
    ReactiveFormsModule,
    TranslateModule.forChild({
      defaultLanguage: 'en',
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
  ],
  exports: [MenuManagementComponent, MenuEditComponent],
})
export class MenuManagementModule {}
