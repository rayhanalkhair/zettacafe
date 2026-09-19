import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { filter } from 'rxjs';
import { SubSink } from 'subsink';
import Swal from 'sweetalert2';
import { AppComponent } from '../app.component';
import { AppService } from '../app.service';
import { openEditRecipeCartDialog } from './cart-edit/cart-edit.component';
import { CartService } from './cart.service';
import { HistoryTransactionComponent } from './history-transaction/history-transaction.component';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css'],
})
export class CartComponent implements OnInit, OnDestroy {
  isLoading: any = 'on';
  private subs = new SubSink();
  cart: any = [];

  constructor(
    private cartService: CartService,
    private matDialog: MatDialog,
    private appService: AppService,
    private appComponent: AppComponent,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.getAllTransactions();
  }

  getAllTransactions() {
    this.subs.sink = this.cartService.getAllTransaction().subscribe(
      (data: any) => {
        this.cart = data?.data?.transaction_data;
        const arr = [];
        for (let transaction of data?.data?.transaction_data) {
          const arrTemp = [];
          for (let recipe of transaction.menu) {
            const temp = {
              ...recipe.recipe_id,
              amount: recipe.amount,
              note: recipe.note,
              discount_price:
                recipe.recipe_id.price -
                (recipe.recipe_id.discount / 100) * recipe.recipe_id.price,
            };
            arrTemp.push(temp);
          }
          const obj = {
            ...transaction,
            _id: transaction._id,
            menu: arrTemp,
          };
          arr.push(obj);
        }
        this.cart = arr;
      },
      (err) => {
        Swal.fire({
          title: 'No Transaction',
          text: err.message,
          icon: 'error',
        });
      }
    );
  }

  onMenu() {
    this.router.navigate(['menu']);
  }

  onCheckOut(data: any) {
    Swal.fire({
      title: 'Are you sure want to checkout?',
      text: 'Your foods and beverages will ready in 30 minutes!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, check it out!',
    }).then((result) => {
      if (result.isConfirmed) {
        this.isLoading = null;
        this.cartService.checkOut(data).subscribe(
          (data: any) => {
            this.isLoading = data;
            const _id = this.appComponent.isID;
            this.appService.getOneUser(_id).subscribe((data: any) => {
              this.appComponent.isCredit = data.data.getOneUser.data.credite;
            });
            Swal.fire({
              title: 'Transaction is Success',
              text: data.data.UpdateTransaction.message,
              icon: 'success',
            }).then(() => {
              this.getAllTransactions();
            });
          },
          (err) => {
            this.isLoading = err;
            if (err.message.includes('Transaction is Failed')) {
              let message = err.message
                .replaceAll('"', '')
                .replaceAll('[', '')
                .replaceAll(']', '')
                .replaceAll(',', ', ');
              Swal.fire({
                title: 'Transaction is failed',
                text: message,
                icon: 'error',
              }).then(() => {
                this.getAllTransactions();
              });
            } else {
              Swal.fire({
                title: err,
                text: err.message,
                icon: 'error',
              }).then(() => {
                this.getAllTransactions();
              });
            }
          }
        );
      }
    });
  }

  onCancel(data: any) {
    Swal.fire({
      title: 'Are you want to cancel transaction?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, cancel it!',
    }).then((result) => {
      if (result.isConfirmed) {
        this.cartService.cancelTransaction(data).subscribe(
          (data: any) => {
            Swal.fire({
              title: 'Transaction is Deleted',
              text: data.data.DeleteTransaction.message,
              icon: 'success',
            }).then(() => {
              this.getAllTransactions();
            });
          },
          (err) => {
            Swal.fire({
              title: 'Transaction is not Deleted',
              text: err.message,
              icon: 'error',
            });
          }
        );
      }
    });
  }

  onEdit(data: any) {
    openEditRecipeCartDialog(this.matDialog, data)
      .pipe(filter((val) => !!val))
      .subscribe((val: any) => {
        this.cartService.updateTransaction(val).subscribe(
          (data: any) => {
            Swal.fire({
              title: 'Transaction is Updated',
              text: data.data.UpdateTransaction.message,
              icon: 'success',
            }).then(() => {
              this.getAllTransactions();
            });
          },
          (err) => {
            Swal.fire({
              title: 'Transaction is not Updated',
              text: err.message,
              icon: 'error',
            });
          }
        );
      });
  }

  onRemove(data: any) {
    if (this.cart[0].menu.length === 1) {
      Swal.fire({
        title: 'Are you sure want to remove recipe?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, remove it!',
      }).then((result) => {
        if (result.isConfirmed) {
          this.cartService.cancelTransaction(this.cart[0]._id).subscribe(
            (data: any) => {
              Swal.fire({
                title: 'Transaction is Updated',
                text: data.data.DeleteTransaction.message,
                icon: 'success',
              }).then(() => {
                this.getAllTransactions();
              });
            },
            (err) => {
              Swal.fire({
                title: 'Transaction is not updated',
                text: err.message,
                icon: 'success',
              });
            }
          );
        }
      });
    } else {
      Swal.fire({
        title: 'Are you sure want to remove recipe?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, remove it!',
      }).then((result) => {
        if (result.isConfirmed) {
          this.cartService.removeItem(data).subscribe(
            (data: any) => {
              Swal.fire({
                title: 'Transaction is Updated',
                text: 'Recipe is deleted from cart',
                icon: 'success',
              }).then(() => {
                this.getAllTransactions();
              });
            },
            (err) => {
              Swal.fire({
                title: 'Transaction is not Updated',
                text: err.message,
                icon: 'error',
              });
            }
          );
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
