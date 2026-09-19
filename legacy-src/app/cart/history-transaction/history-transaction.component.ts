import { Component, Input, OnInit } from '@angular/core';
import {
  MatDialog,
  MatDialogConfig,
  MatDialogRef,
} from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { CartService } from '../cart.service';

@Component({
  selector: 'app-history-transaction',
  templateUrl: './history-transaction.component.html',
  styleUrls: ['./history-transaction.component.css'],
})
export class HistoryTransactionComponent implements OnInit {
  transactions = [];
  displayedColumns: string[] = [
    'role',
    'order_date',
    'menu',
    'note',
    'order_status',
    'total_price',
  ];

  financeBalance: number;
  isAdmin: boolean = false;

  pageEvent: any;
  pageSize: number = 3;
  pageIndex: number = 0;
  historyLength: number;

  dataSource = new MatTableDataSource();

  constructor(
    public dialogRef: MatDialogRef<HistoryTransactionComponent>,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    this.getAllTransactions();
    if (JSON.parse(localStorage.getItem('role')) === 'Admin') {
      this.isAdmin = true;
      this.getFinanceManagement();
    } else {
      this.isAdmin = false;
    }
  }

  onClose() {
    this.dialogRef.close();
  }

  getFinanceManagement() {
    this.cartService.getFinanceManagement().subscribe((data: any) => {
      this.financeBalance = data?.data?.FinanceManagement?.balance;
    });
  }

  getAllTransactions() {
    this.cartService
      .getHistoryTransaction(this.pageIndex, this.pageSize)
      .subscribe((data: any) => {
        this.transactions = data?.data?.transaction_data;
        this.historyLength = data?.data?.info_page[0]?.count;
        this.dataSource = new MatTableDataSource(this.transactions);
      });
  }

  indexingPage(event: PageEvent): any {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.getAllTransactions();
  }
}

export function openHistoryTransactionDialog(matDialog: MatDialog) {
  const config = new MatDialogConfig();

  config.disableClose = true;
  config.autoFocus = true;
  config.width = 'fit-content';
  config.height = 'fit-content';

  const dialogRef = matDialog.open(HistoryTransactionComponent, config);

  return dialogRef.afterClosed();
}
