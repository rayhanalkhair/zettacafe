import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MenuManagementGuard implements CanActivate {
  constructor(private router: Router) {}
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ):
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    let isToken = localStorage.getItem('token');
    let isAdmin = localStorage.getItem('role');

    if (isToken) {
      if (JSON.parse(isAdmin) !== 'Admin') {
        this.router.navigate(['home']);
        return false;
      } else {
        return true;
      }
    } else {
      this.router.navigate(['home']);
      return false;
    }
  }
}
