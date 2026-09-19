import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import {
  MatDialog,
  MatDialogConfig,
  MatDialogRef,
} from '@angular/material/dialog';

@Component({
  selector: 'app-stock-form',
  templateUrl: './stock-form.component.html',
  styleUrls: ['./stock-form.component.css'],
})
export class StockFormComponent implements OnInit {
  stockForm = this.fb.group({
    name: this.fb.control('', Validators.required),
    stock: this.fb.control('', [
      Validators.required,
      Validators.min(0),
      Validators.pattern(/^-?(0|[1-9]\d*)?$/),
    ]),
  });
  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<StockFormComponent>
  ) {}

  ngOnInit(): void {}

  onClose() {
    this.dialogRef.close();
  }

  onSubmit() {
    this.dialogRef.close(this.stockForm.value);
  }
}

export function openAddStockDialog(matDialog: MatDialog) {
  const config = new MatDialogConfig();

  config.disableClose = true;
  config.autoFocus = true;

  const dialogRef = matDialog.open(StockFormComponent, config);

  return dialogRef.afterClosed();
}
