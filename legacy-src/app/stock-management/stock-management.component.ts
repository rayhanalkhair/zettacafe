import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { openAddStockDialog } from './stock-form/stock-form.component';
import { openEditStockDialog } from './stock-form/stock-edit/stock-edit.component';
import { StockManagementService } from './stock-management.service';
import { filter } from 'rxjs';
import { SubSink } from 'subsink';
import Swal from 'sweetalert2';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-stock-management',
  templateUrl: './stock-management.component.html',
  styleUrls: ['./stock-management.component.css'],
})
export class StockManagementComponent implements OnInit {
  private subs = new SubSink();
  displayedColumns: string[] = ['name', 'stock', 'available', 'actions'];
  ingredientsLength: number;
  ingredients = [];
  dataSource = new MatTableDataSource();

  pageEvent: any;
  pageSize = 10;
  pageIndex = 0;

  filtername: any = new FormControl('');
  searchName = '';
  defaultFilter = '';

  name_sort: number = 0;

  availabilities: any[] = [
    { value: '', viewValue: 'All' },
    { value: 'Unavailable', viewValue: 'Unavailable' },
    { value: 'Available', viewValue: 'Available' },
  ];

  availability = '';

  constructor(
    private stockManagementService: StockManagementService,
    private matDialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.getAllStockWithPage();
    this.filtername.valueChanges.subscribe((data: any) => {
      this.searchName = data;
      this.getAllStockWithPage();
    });
  }

  getAllStockWithPage() {
    this.subs.sink = this.stockManagementService
      .getAllIngredientsWithPage(
        this.pageSize,
        this.pageIndex,
        this.searchName,
        this.availability,
        this.name_sort
      )
      .subscribe(
        (data: any) => {
          this.ingredients =
            data?.data?.GetAllIngredients?.data?.ingredient_data;
          this.ingredientsLength =
            data.data.GetAllIngredients.data.info_page[0].count;
          this.dataSource = new MatTableDataSource(
            data?.data?.GetAllIngredients?.data?.ingredient_data
          );
        },
        (err) => {
          Swal.fire({
            title: 'No ingredient',
            text: err.message,
            icon: 'error',
          });
        }
      );
  }

  onFilterAvailability(event: any) {
    this.availability = event;
    this.getAllStockWithPage();
  }

  indexingPage(event: any) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.getAllStockWithPage();
  }

  onSort() {
    if (this.name_sort === 1) {
      this.name_sort = -1;
    } else {
      this.name_sort = 1;
    }

    this.getAllStockWithPage();
  }

  onAdd() {
    openAddStockDialog(this.matDialog)
      .pipe(filter((val) => !!val))
      .subscribe((val) => {
        this.stockManagementService.createIngredient(val).subscribe(
          (data: any) => {
            Swal.fire({
              title: 'Ingredient is Added',
              icon: 'success',
              text: data.data.CreateIngredient.message,
            }).then(() => {
              this.getAllStockWithPage();
            });
          },
          (err) => {
            Swal.fire({
              title: 'Ingredient is not Added',
              icon: 'error',
              text: err.message,
            });
          }
        );
      });
  }

  onUpdate(ingredient: any) {
    openEditStockDialog(this.matDialog, ingredient)
      .pipe(filter((val) => !!val))
      .subscribe((val: any) => {
        this.stockManagementService.updateIngredient(val).subscribe(
          (data: any) => {
            Swal.fire({
              title: 'Ingredient is updated',
              icon: 'success',
              text: data.data.UpdateIngredient.message,
            }).then(() => {
              this.getAllStockWithPage();
            });
          },
          (err) => {
            Swal.fire({
              title: 'Ingredient is not updated',
              icon: 'error',
              text: err.message,
            });
          }
        );
      });
  }

  onDelete(element: any) {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
    }).then((confirm: any) => {
      if (confirm.isConfirmed) {
        this.stockManagementService.deleteIngredient(element).subscribe(
          (data: any) => {
            Swal.fire({
              icon: 'success',
              title: data?.data?.DeleteIngredient?.message,
            });
            this.getAllStockWithPage();
          },
          (err) =>
            Swal.fire({
              icon: 'error',
              title: 'Oops...',
              text: err.message,
            })
        );
      } else {
        this.getAllStockWithPage();
      }
    });
  }
}
