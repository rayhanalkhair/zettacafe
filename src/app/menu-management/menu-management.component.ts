import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { SubSink } from 'subsink';
import Swal from 'sweetalert2';
import { openAddMenuDialog } from './menu-form/menu-form.component';
import { MenuManagementService } from './menu-management.service';
import { filter } from 'rxjs';
import { openEditMenuDialog } from './menu-form/menu-edit/menu-edit.component';
import { FormControl } from '@angular/forms';
import { openDetailMenuDialog } from './menu-detail/menu-detail.component';

@Component({
  selector: 'app-menu-management',
  templateUrl: './menu-management.component.html',
  styleUrls: ['./menu-management.component.css'],
})
export class MenuManagementComponent implements OnInit {
  publisheds: any[] = [
    { value: 'all', viewValue: 'All' },
    { value: 'Publish', viewValue: 'Publish' },
    { value: 'Unpublish', viewValue: 'Unpublish' },
  ];

  published = 'all';
  private subs = new SubSink();
  displayedColumns: string[] = [
    'name',
    'price',
    'discount',
    'publisher',
    'actions',
  ];
  recipes: any[] = [];
  dataSource = new MatTableDataSource();

  recipesLength: number;
  pageEvent: any;
  pageSize: number = 10;
  pageIndex: number = 0;

  filtername: any = new FormControl('');
  defaultFilter = '';
  searchName = '';

  constructor(
    private menuManagementService: MenuManagementService,
    private matDialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.getAllRecipesWithPage();
    this.filtername.valueChanges.subscribe((data: any) => {
      this.searchName = data;
      this.getAllRecipesWithPage();
    });
  }

  getAllRecipesWithPage() {
    this.subs.sink = this.menuManagementService
      .getAllRecipesWithPage(
        this.pageSize,
        this.pageIndex,
        this.published,
        this.searchName
      )
      .subscribe(
        (data: any) => {
          this.recipes = data?.data?.recipe_data;
          this.recipesLength = data?.data?.info_page[0]?.count;
          this.dataSource = new MatTableDataSource(this.recipes);
        },
        (err) => {
          Swal.fire({
            title: 'No recipe!',
            text: err.message,
            icon: 'error',
          });
        }
      );
  }

  indexingPage(event: any) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.getAllRecipesWithPage();
  }

  onAdd() {
    openAddMenuDialog(this.matDialog)
      .pipe(filter((val) => !!val))
      .subscribe((val) => {
        this.menuManagementService.createRecipe(val).subscribe(
          (data: any) => {
            Swal.fire({
              title: 'Recipe Added',
              icon: 'success',
              text: data.data.CreateRecipe.message,
            }).then(() => {
              this.getAllRecipesWithPage();
            });
          },
          (err) => {
            Swal.fire({
              title: 'Recipe has been listed',
              text: err.message,
              icon: 'error',
            });
          }
        );
      });
  }

  onDetail(recipe: any) {
    openDetailMenuDialog(this.matDialog, recipe)
      .pipe(filter((val) => !!val))
      .subscribe((val) => {});
  }

  onPublish(event: any, element: any) {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You can publish or unpublish recipe',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes',
    }).then((result) => {
      if (result.isConfirmed) {
        const data = {
          _id: element._id,
          published: event.checked ? 'Publish' : 'Unpublish',
        };
        this.menuManagementService
          .updatePublished(data)
          .subscribe((data: any) => {
            Swal.fire({
              icon: 'success',
              title: 'Recipe is updated',
              text: data.data.UpdateRecipe.message,
            }).then(() => {
              this.getAllRecipesWithPage();
            });
          });
      } else {
        const data = {
          _id: element._id,
          published: event.checked ? 'Unpublish' : 'Publish',
        };
        this.menuManagementService
          .updatePublished(data)
          .subscribe((data: any) => {
            this.getAllRecipesWithPage();
          });
      }
    });
  }

  onFilterPublished(event: any) {
    this.published = event;
    this.getAllRecipesWithPage();
  }

  onUpdate(recipe: any) {
    openEditMenuDialog(this.matDialog, recipe)
      .pipe(filter((val) => !!val))
      .subscribe((val: any) => {
        this.menuManagementService.updateRecipe(val).subscribe((data: any) => {
          Swal.fire({
            icon: 'success',
            title: 'Recipe is updated',
            text: data.data.UpdateRecipe.message,
          }).then(() => {
            this.getAllRecipesWithPage();
          });
        });
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
        this.menuManagementService.deleteRecipe(element).subscribe(
          (data: any) => {
            Swal.fire({
              icon: 'success',
              title: 'success',
              text: data.data.DeleteRecipe.message,
            }).then(() => {
              this.getAllRecipesWithPage();
            });
          },
          (err) =>
            Swal.fire({
              icon: 'error',
              title: 'Oops...',
              text: err.message,
            })
        );
      } else {
        this.getAllRecipesWithPage();
      }
    });
  }
}
