import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import {
  MatDialog,
  MatDialogConfig,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { Recipe } from 'src/app/model/recipe.model';

@Component({
  selector: 'app-menu-form',
  templateUrl: './menu-form.component.html',
  styleUrls: ['./menu-form.component.css'],
})
export class MenuFormComponent implements OnInit {
  menu = this.fb.group({
    amount: this.fb.control('', [Validators.required, Validators.min(0)]),
    note: this.fb.control(''),
  });
  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<MenuFormComponent>,
    @Inject(MAT_DIALOG_DATA) private recipe: Recipe
  ) {}

  ngOnInit(): void {}

  onClose() {
    this.dialogRef.close();
  }

  onSubmit() {
    this.dialogRef.close({ ...this.menu.value, _id: this.recipe._id });
  }
}

export function openAddMenuUserDialog(matDialog: MatDialog, recipe: Recipe) {
  const config = new MatDialogConfig();

  config.disableClose = true;
  config.autoFocus = true;

  config.data = {
    ...recipe,
  };
  config.width = '300px';

  const dialogRef = matDialog.open(MenuFormComponent, config);

  return dialogRef.afterClosed();
}
