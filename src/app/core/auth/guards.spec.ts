import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  Router,
  type ActivatedRouteSnapshot,
  type CanActivateFn,
  type RouterStateSnapshot,
  type UrlTree,
} from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './guards';
import { SessionStore, type Session } from './session.store';

const customer: Session = {
  token: 'tok',
  user: {
    id: 'u1',
    firstName: 'A',
    lastName: 'B',
    email: 'a@b.id',
    role: 'CUSTOMER',
    creditIdr: 0,
  },
};
const admin: Session = { ...customer, user: { ...customer.user, role: 'ADMIN' } };

const route = {} as ActivatedRouteSnapshot;
const stateAt = (url: string) => ({ url }) as RouterStateSnapshot;

describe('route guards', () => {
  let session: SessionStore;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    session = TestBed.inject(SessionStore);
    router = TestBed.inject(Router);
  });

  afterEach(() => localStorage.clear());

  const run = (guard: CanActivateFn, url = '/x'): boolean | UrlTree =>
    TestBed.runInInjectionContext(() => guard(route, stateAt(url))) as boolean | UrlTree;

  const urlOf = (result: boolean | UrlTree): string => router.serializeUrl(result as UrlTree);

  describe('authGuard', () => {
    it('sends a guest to login and remembers where they were going', () => {
      expect(urlOf(run(authGuard, '/cart'))).toBe('/login?returnUrl=%2Fcart');
    });

    it('lets a signed-in user through', () => {
      session.signIn(customer);
      expect(run(authGuard)).toBe(true);
    });
  });

  describe('adminGuard', () => {
    it('sends a guest to login', () => {
      expect(urlOf(run(adminGuard, '/admin/menu'))).toBe('/login?returnUrl=%2Fadmin%2Fmenu');
    });

    it('sends a customer home', () => {
      session.signIn(customer);
      expect(urlOf(run(adminGuard))).toBe('/');
    });

    it('lets an admin through', () => {
      session.signIn(admin);
      expect(run(adminGuard)).toBe(true);
    });
  });

  describe('guestGuard', () => {
    it('lets a guest through', () => {
      expect(run(guestGuard)).toBe(true);
    });

    it('sends a signed-in user home', () => {
      session.signIn(customer);
      expect(urlOf(run(guestGuard))).toBe('/');
    });
  });
});
