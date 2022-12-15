import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import {
  MatDialog,
  MatDialogConfig,
  MatDialogRef,
} from '@angular/material/dialog';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent implements OnInit {
  registerForm = this.fb.group({
    first_name: this.fb.control('', Validators.required),
    last_name: this.fb.control('', Validators.required),
    email: this.fb.control('', [Validators.required, Validators.email]),
    password: this.fb.control('', [
      Validators.required,
      Validators.minLength(8),
    ]),
  });
  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<RegisterComponent>
  ) {}

  ngOnInit(): void {}

  onSubmit(value: any) {
    this.dialogRef.close(value);
  }

  onClose() {
    this.dialogRef.close();
  }

  onShowPassword(event: any) {
    let password = document.getElementById('regpass') as HTMLInputElement;
    if (event.checked === true) {
      password.type = 'text';
    } else {
      password.type = 'password';
    }
  }
}

export function openCreateUserDialog(matDialog: MatDialog) {
  const config = new MatDialogConfig();

  config.disableClose = true;
  config.autoFocus = true;
  config.width = '500px';

  const dialogRef = matDialog.open(RegisterComponent, config);

  return dialogRef.afterClosed();
}
