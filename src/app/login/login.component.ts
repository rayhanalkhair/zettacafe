import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { filter } from 'rxjs';
import { SubSink } from 'subsink/dist/subsink';
import Swal from 'sweetalert2';
import { AppComponent } from '../app.component';
import { openForgetPasswordDialog } from './forget-password/forget-password.component';
import { LoginService } from './login.service';
import { openCreateUserDialog } from './register/register.component';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  private subs = new SubSink();

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.email, Validators.required]),
    password: new FormControl('', [
      Validators.required,
      Validators.minLength(8),
    ]),
  });

  constructor(
    private router: Router,
    private loginService: LoginService,
    private appComponent: AppComponent,
    private matDialog: MatDialog
  ) {}

  ngOnInit(): void {}

  onShowPassword(event: any) {
    let password = document.getElementById('password') as HTMLInputElement;
    if (event.checked === true) {
      password.type = 'text';
    } else {
      password.type = 'password';
    }
  }

  onForgetPassword() {
    openForgetPasswordDialog(this.matDialog)
      .pipe(filter((val) => !!val))
      .subscribe();
  }

  onSubmit(value: any) {
    this.loginService.getAuthorization(value).subscribe(
      (val: any) => {
        let token: any;
        let data: any;
        let role: any;
        let name: any;
        let credit: any;
        let _id: string;
        token = val?.data?.Login?.token;
        data = val?.data?.Login?.user?.usertype;
        role = val?.data?.Login?.user?.role;
        name = val?.data?.Login?.user?.last_name;
        credit = val?.data?.Login?.user?.credite;
        _id = val?.data?.Login?.user?._id;
        localStorage.setItem('token', token);
        localStorage.setItem('data', JSON.stringify(data));
        localStorage.setItem('role', JSON.stringify(role));
        localStorage.setItem('name', name);
        localStorage.setItem('credit', credit);
        localStorage.setItem('_id', _id);
        Swal.fire({
          title: 'You have logged in',
          text: val?.data?.Login?.message,
          icon: 'success',
        }).then(() => {
          this.router.navigate(['home']).then(() => {
            if (role === 'Admin') {
              this.appComponent.isAdmin = true;
              this.appComponent.isName = name;
              this.appComponent.isCredit = credit;
              this.appComponent.isID = _id;
            } else {
              this.appComponent.isCustomer = true;
              this.appComponent.isName = name;
              this.appComponent.isCredit = credit;
              this.appComponent.isID = _id;
            }
          });
        });
      },
      (err) => {
        Swal.fire({
          title: 'Wrong input',
          text: err?.message,
          icon: 'error',
        });
      }
    );
  }

  onCreateUser() {
    openCreateUserDialog(this.matDialog)
      .pipe(filter((val) => !!val))
      .subscribe((val) => {
        this.loginService.createUser(val).subscribe(
          (data: any) => {
            Swal.fire({
              title: 'User is added',
              icon: 'success',
              text: data.data.CreateUser.message,
            });
          },
          (err) => {
            Swal.fire({
              icon: 'error',
              text: err.message,
            });
          }
        );
      });
  }
}
