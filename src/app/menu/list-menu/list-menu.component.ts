import { Component, OnInit } from '@angular/core';
import { MenuService } from '../menu.service';
import { SubSink } from 'subsink/dist/subsink';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-list-menu',
  templateUrl: './list-menu.component.html',
  styleUrls: ['./list-menu.component.css'],
})
export class ListMenuComponent implements OnInit {
  menu: any = [];
  menuLength: number;
  subs = new SubSink();
  page = 1;
  constructor(private menuService: MenuService) {}

  ngOnInit(): void {
    this.getAllRecipesOnMenu();
  }

  onNext() {
    const maxPage = Math.ceil(this.menuLength / 10);
    if (this.page === maxPage) {
      this.page = maxPage;
    } else {
      this.page += 1;
      this.getAllRecipesOnMenu();
    }
  }

  onPrevious() {
    if (this.page === 1) {
      this.page = 1;
    } else {
      this.page -= 1;
      this.getAllRecipesOnMenu();
    }
  }

  getAllRecipesOnMenu() {
    this.subs.sink = this.menuService.getPublishRecipes(this.page).subscribe(
      (data: any) => {
        this.menu = data?.data?.recipe_data;
        this.menuLength = data?.data?.info_page[0]?.count;
      },
      (err) => {
        Swal.fire({
          title: err.message,
          icon: 'error',
        });
      }
    );
  }
}
