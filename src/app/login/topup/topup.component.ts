import { Component, OnInit } from '@angular/core';
import {
  MatDialog,
  MatDialogConfig,
  MatDialogRef,
} from '@angular/material/dialog';
import { FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-topup',
  templateUrl: './topup.component.html',
  styleUrls: ['./topup.component.css'],
})
export class TopupComponent implements OnInit {
  credite = this.fb.control('', [Validators.required, Validators.min(10000)]);

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<TopupComponent>
  ) {}

  ngOnInit(): void {}

  onSubmit() {
    this.dialogRef.close(this.credite.value);
  }
  onClose() {
    this.dialogRef.close();
  }
}

export function openTopupCreditDialog(matDialog: MatDialog) {
  const config = new MatDialogConfig();

  config.disableClose = true;
  config.autoFocus = true;

  const dialogRef = matDialog.open(TopupComponent, config);

  return dialogRef.afterClosed();
}
