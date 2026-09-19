import { Component, Inject, OnInit } from '@angular/core';
import {
  MatDialog,
  MatDialogConfig,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-menu-detail',
  templateUrl: './menu-detail.component.html',
  styleUrls: ['./menu-detail.component.css'],
})
export class MenuDetailComponent implements OnInit {
  selectedRecipe = [];
  displayedColumns: string[] = ['ingredients', 'stock_used'];

  dataSource = new MatTableDataSource();
  constructor(
    private dialogRef: MatDialogRef<MenuDetailComponent>,
    @Inject(MAT_DIALOG_DATA) private recipe: any
  ) {}

  ngOnInit(): void {
    this.selectedRecipe = this.recipe.ingredients;
    this.dataSource = new MatTableDataSource(this.selectedRecipe);
  }

  onClose() {
    this.dialogRef.close();
  }
}

export function openDetailMenuDialog(matDialog: MatDialog, recipe: any) {
  const config = new MatDialogConfig();
  config.disableClose = true;
  config.autoFocus = true;

  config.data = {
    ...recipe,
  };

  const dialogRef = matDialog.open(MenuDetailComponent, config);

  return dialogRef.afterClosed();
}
