import { Component, OnInit, Inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  MatDialog,
  MatDialogConfig,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { Recipe } from 'src/app/model/recipe.model';

import { MenuManagementService } from '../../menu-management.service';

@Component({
  selector: 'app-menu-edit',
  templateUrl: './menu-edit.component.html',
  styleUrls: ['./menu-edit.component.css'],
})
export class MenuEditComponent implements OnInit {
  allIngredients: any = [];

  menuForm: any;
  dataRecipe: any;

  arr = [];

  isDeleted = false;

  constructor(
    private fb: FormBuilder,
    private menuManagementService: MenuManagementService,
    private dialogRef: MatDialogRef<MenuEditComponent>,
    @Inject(MAT_DIALOG_DATA) private recipe: any
  ) {}

  ngOnInit(): void {
    this.menuManagementService
      .getOneRecipe(this.recipe)
      .subscribe((data: any) => {
        this.dataRecipe = data.data.GetOneRecipe.data;
      });

    this.initForm();

    let tempIngeridient = {
      recipe_name: this.recipe.recipe_name,
      link_recipe: this.recipe.link_recipe,
      price: this.recipe.price,
      discount: this.recipe.discount,
    };

    let ingredients = [];

    if (this.recipe?.ingredients?.length) {
      this.recipe.ingredients.forEach((ingredient) => {
        ingredients.push({
          ingredient_id: ingredient.ingredient_id._id,
          stock_used: ingredient.stock_used,
        });
        this.addIngredient();
      });
      const temp = {
        ...tempIngeridient,
        ingredients: ingredients,
      };

      this.menuForm.patchValue(temp);
    }

    this.menuManagementService.getAllIngredients().subscribe((data: any) => {
      let ingredientData = data.data.GetAllIngredients.data.ingredient_data;
      this.allIngredients = ingredientData.filter(
        (val) => val.available === true
      );
    });
  }

  initForm() {
    this.menuForm = new FormGroup({
      recipe_name: this.fb.control(
        this.recipe.recipe_name,
        Validators.required
      ),
      link_recipe: this.fb.control(
        this.recipe.link_recipe,
        Validators.required
      ),
      price: this.fb.control(this.recipe.price, Validators.required),
      discount: this.fb.control(this.recipe.price),
      ingredients: this.fb.array([]),
    });
  }

  onSubmit() {
    if (this.isDeleted) {
      this.menuManagementService
        .deleteIngredientUpdateRecipe(this.recipe, this.arr)
        .subscribe((data) => {});
      this.dialogRef.close({ ...this.menuForm.value, _id: this.recipe._id });
    } else {
      this.dialogRef.close({ ...this.menuForm.value, _id: this.recipe._id });
    }
    this.isDeleted = false;
  }

  onClose() {
    this.dialogRef.close();
  }

  get ingredients(): FormArray {
    return this.menuForm.get('ingredients') as FormArray;
  }

  createIngredient(): FormGroup {
    return this.fb.group({
      ingredient_id: this.fb.control('', Validators.required),
      stock_used: this.fb.control('', [Validators.required, Validators.min(1)]),
    });
  }

  addIngredient() {
    this.ingredients.push(this.createIngredient());
  }

  removeIngredient(i: number, _id: any) {
    let arrCheck = _id;
    this.arr.push(arrCheck);
    this.isDeleted = true;
    this.ingredients.removeAt(i);
  }
}

export function openEditMenuDialog(matDialog: MatDialog, recipe: Recipe) {
  const config = new MatDialogConfig();
  config.disableClose = true;
  config.autoFocus = true;
  config.width = '590px';

  config.data = {
    ...recipe,
  };

  const dialogRef = matDialog.open(MenuEditComponent, config);

  return dialogRef.afterClosed();
}
