import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AboutComponent } from './about.component';
import { AngularMaterialModule } from '../shared/angular-material/angular-material.module';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', component: AboutComponent, title: 'About' },
];

@NgModule({
  declarations: [AboutComponent],
  imports: [CommonModule, AngularMaterialModule, RouterModule.forChild(routes)],
  exports: [AboutComponent],
})
export class AboutModule {}
