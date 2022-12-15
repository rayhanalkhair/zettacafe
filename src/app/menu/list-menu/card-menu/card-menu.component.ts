import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { filter } from 'rxjs';
import Swal from 'sweetalert2';
import { openAddMenuUserDialog } from '../../menu-form/menu-form.component';
import { MenuService } from '../../menu.service';

@Component({
  selector: 'app-card-menu',
  templateUrl: './card-menu.component.html',
  styleUrls: ['./card-menu.component.css'],
})
export class CardMenuComponent implements OnInit {
  @Input() recipe: any;
  isNotAvailableStock = false;
  ingredients: string[] = [];
  isToken: boolean = false;
  isStockUsed = false;
  isAvailibility: number;

  constructor(
    private matDialog: MatDialog,
    private menuService: MenuService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (localStorage.getItem('token')) {
      this.isToken = true;
    } else {
      this.isToken = false;
    }

    let arr = [];
    for (let ingredient of this.recipe.ingredients) {
      arr.push(ingredient.ingredient_id.available);
    }
    let arrCheck = arr.includes(false);
    if (arrCheck === true) {
      this.isNotAvailableStock = true;
    } else {
      this.isNotAvailableStock = false;
    }

    this.recipe.ingredients.map((data) => {
      if (data.stock_used > data.ingredient_id.stock) {
        this.isStockUsed = true;
      }
    });

    const arrIngredient = this.recipe.ingredients.map((data) => {
      const availIngredient = Math.floor(
        data.ingredient_id.stock / data.stock_used
      );
      return availIngredient;
    });

    const remain_stock = Math.min(...arrIngredient);

    const data = {
      ...this.recipe,
      discount_price:
        this.recipe.price - this.recipe.price * (this.recipe.discount / 100),
      remain_stock: remain_stock,
    };
    this.recipe = data;
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
}
