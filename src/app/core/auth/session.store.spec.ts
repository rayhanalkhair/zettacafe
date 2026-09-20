import { TestBed } from '@angular/core/testing';
import { StorageKeys } from '@core/storage/local-storage.service';
import { isSession, SessionStore, type Session } from './session.store';

const session: Session = {
  token: 'tok_1',
  user: {
    id: 'usr_1',
    firstName: 'Sari',
    lastName: 'Dewi',
    email: 'sari@example.com',
    role: 'CUSTOMER',
    creditIdr: 100_000,
  },
};

const admin: Session = { ...session, user: { ...session.user, role: 'ADMIN' } };

/** A fresh store, as after a page reload: new injector, same localStorage. */
function createStore(): SessionStore {
  TestBed.resetTestingModule();
  return TestBed.inject(SessionStore);
}

const flags = (store: SessionStore): boolean[] => [
  store.isAuthenticated(),
  store.isCustomer(),
  store.isAdmin(),
];

describe('SessionStore', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('starts as a guest', () => {
    const store = createStore();
    expect(store.isAuthenticated()).toBe(false);
    expect(store.token()).toBeNull();
    expect(store.creditIdr()).toBe(0);
    expect(store.displayName()).toBe('');
  });

  it('derives every flag from the one session, so they cannot disagree', () => {
    const store = createStore();
    store.signIn(session);
    expect(flags(store)).toEqual([true, true, false]);

    store.signIn(admin);
    expect(flags(store)).toEqual([true, false, true]);

    store.signOut();
    expect(flags(store)).toEqual([false, false, false]);
  });

  it('exposes the token, credit and display name', () => {
    const store = createStore();
    store.signIn(session);
    expect(store.token()).toBe('tok_1');
    expect(store.creditIdr()).toBe(100_000);
    expect(store.displayName()).toBe('Sari Dewi');
  });

  it('patches the user without touching the token', () => {
    const store = createStore();
    store.signIn(session);
    store.patchUser({ creditIdr: 40_000 });
    expect(store.creditIdr()).toBe(40_000);
    expect(store.token()).toBe('tok_1');
  });

  it('ignores a patch when nobody is signed in', () => {
    const store = createStore();
    store.patchUser({ creditIdr: 40_000 });
    expect(store.isAuthenticated()).toBe(false);
  });

  it('persists to storage and restores after a reload', () => {
    const first = createStore();
    first.signIn(session);
    TestBed.tick();
    expect(JSON.parse(localStorage.getItem(StorageKeys.session) ?? 'null')).toEqual(session);

    const second = createStore();
    expect(second.session()).toEqual(session);
  });

  it('clears storage on sign out', () => {
    const store = createStore();
    store.signIn(session);
    TestBed.tick();
    store.signOut();
    TestBed.tick();
    expect(localStorage.getItem(StorageKeys.session)).toBeNull();
  });

  it('does not restore a session it cannot trust', () => {
    localStorage.setItem(StorageKeys.session, 'undefined');
    expect(createStore().isAuthenticated()).toBe(false);

    localStorage.setItem(StorageKeys.session, JSON.stringify({ token: 'tok', user: { id: 1 } }));
    expect(createStore().isAuthenticated()).toBe(false);
  });
});

describe('isSession', () => {
  it('accepts a complete session', () => {
    expect(isSession(session)).toBe(true);
  });

  it.each([
    ['null', null],
    ['a string', 'undefined'],
    ['an empty token', { ...session, token: '' }],
    ['no user', { token: 'tok' }],
    ['an unknown role', { ...session, user: { ...session.user, role: 'OWNER' } }],
    ['a string credit', { ...session, user: { ...session.user, creditIdr: '1' } }],
  ])('rejects %s', (_name, value) => {
    expect(isSession(value)).toBe(false);
  });
});
