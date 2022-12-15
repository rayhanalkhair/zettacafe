import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { filter } from 'rxjs';
import Swal from 'sweetalert2';
import { openAddMenuUserDialog } from '../menu/menu-form/menu-form.component';
import { MenuService } from '../menu/menu.service';
import { HomeService } from './home.service';

@Component({
  selector: 'app-homepage',
  templateUrl: './homepage.component.html',
  styleUrls: ['./homepage.component.css'],
})
export class HomepageComponent implements OnInit {
  isToken: any;
  specialOffer = [];
  menuHighligth = [];
  oneMenuHighligth: any;
  constructor(
    private homeService: HomeService,
    private router: Router,
    private menuService: MenuService,
    private matDialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.isToken = localStorage.getItem('token');
    this.getSpecialOffer();
    this.getMenuHighlight();
  }

  getSpecialOffer() {
    this.homeService.getSpecialOffer().subscribe((data: any) => {
      const arr = [];
      data.menuHighlight.map((data: any) => {
        const obj = {
          ...data,
          discount_price: data.price - (data.discount / 100) * data.price,
        };
        arr.push(obj);
      });
      this.specialOffer = arr;
    });
  }

  getMenuHighlight() {
    this.homeService.getMenuHighlight().subscribe((data: any) => {
      this.menuHighligth = data.specialOffer;
      const menuHighligth =
        this.menuHighligth[
          Math.floor(Math.random() * this.menuHighligth.length)
        ];
      this.oneMenuHighligth = menuHighligth;
    });
  }

  onAddToCart(recipe: any) {
    if (localStorage.getItem('token')) {
      openAddMenuUserDialog(this.matDialog, recipe)
        .pipe(filter((val) => !!val))
        .subscribe((val: any) => {
          this.menuService.createTransaction(val).subscribe(
            (data: any) => {
              Swal.fire({
                title: 'Recipe added to cart',
                text: data.data.CreateTransaction.message,
                icon: 'success',
              });
            },
            (err: any) => {
              Swal.fire({
                title: 'Recipe not added to cart',
                text: err.message,
                icon: 'error',
              });
            }
          );
        });
    } else {
      Swal.fire({
        title: 'Do you have an account?',
        text: 'Try to log in before add recipe to cart!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, log in!',
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['login']);
        }
      });
    }
  }

  onMenu() {
    this.router.navigate(['menu']);
  }

  onOrder() {
    if (this.isToken) {
      if (this.isToken === null) {
        this.router.navigate(['login']);
      } else {
        this.router.navigate(['cart']);
      }
    } else {
      this.router.navigate(['login']);
    }
  }
}
