import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import {
  MatDialog,
  MatDialogConfig,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { Ingredient } from 'src/app/model/ingredient.model';

@Component({
  selector: 'app-stock-edit',
  templateUrl: './stock-edit.component.html',
  styleUrls: ['./stock-edit.component.css'],
})
export class StockEditComponent implements OnInit {
  stockForm = this.fb.group({
    name: this.fb.control(this.ingredient.name, Validators.required),
    stock: this.fb.control(this.ingredient.stock, [
      Validators.required,
      Validators.min(0),
      Validators.pattern(/^-?(0|[1-9]\d*)?$/),
    ]),
  });
  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<StockEditComponent>,
    @Inject(MAT_DIALOG_DATA) private ingredient: Ingredient
  ) {}

  ngOnInit(): void {
    this.stockForm.controls['name'].disable();
  }

  onClose() {
    this.dialogRef.close();
  }

  onSubmit() {
    this.dialogRef.close({ ...this.stockForm.value, _id: this.ingredient._id });
  }
}

export function openEditStockDialog(
  matDialog: MatDialog,
  ingredient: Ingredient
) {
  const config = new MatDialogConfig();

  config.disableClose = true;
  config.autoFocus = true;

  config.data = {
    ...ingredient,
  };

  const dialogRef = matDialog.open(StockEditComponent, config);

  return dialogRef.afterClosed();
}
