import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import {
  MatDialog,
  MatDialogConfig,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MenuRecipe } from 'src/app/model/cart-recipe.model';

@Component({
  selector: 'app-cart-edit',
  templateUrl: './cart-edit.component.html',
  styleUrls: ['./cart-edit.component.css'],
})
export class CartEditComponent implements OnInit {
  cartForm = this.fb.group({
    amount: this.fb.control(this.menuRecipe.amount, [
      Validators.required,
      Validators.min(1),
    ]),
    note: this.fb.control(this.menuRecipe.note),
  });
  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<CartEditComponent>,
    @Inject(MAT_DIALOG_DATA) private menuRecipe: any
  ) {}

  ngOnInit(): void {}

  onClose() {
    this.dialogRef.close();
  }

  onSubmit() {
    this.dialogRef.close({
      ...this.cartForm.value,
      _id: this.menuRecipe._id,
    });
  }
}

export function openEditRecipeCartDialog(
  matDialog: MatDialog,
  menuRecipe: MenuRecipe
) {
  const config = new MatDialogConfig();

  config.disableClose = true;
  config.autoFocus = true;

  config.data = {
    ...menuRecipe,
  };

  const dialogRef = matDialog.open(CartEditComponent, config);

  return dialogRef.afterClosed();
}
