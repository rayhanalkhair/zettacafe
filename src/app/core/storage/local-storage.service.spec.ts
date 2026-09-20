import { TestBed } from '@angular/core/testing';
import { LocalStorageService, StorageKeys } from './local-storage.service';

const isString = (value: unknown): value is string => typeof value === 'string';

describe('LocalStorageService', () => {
  let service: LocalStorageService;

  beforeEach(() => {
    localStorage.clear();
    service = TestBed.inject(LocalStorageService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('round-trips a valid value', () => {
    service.write(StorageKeys.language, 'id');
    expect(service.read(StorageKeys.language, isString)).toBe('id');
  });

  it('returns null when nothing is stored', () => {
    expect(service.read(StorageKeys.session, isString)).toBeNull();
  });

  // v1 stored the four-character string "undefined" after a failed login, and every
  // guard treated it as a token.
  it('treats the string "undefined" as nothing', () => {
    localStorage.setItem(StorageKeys.session, 'undefined');
    expect(service.read(StorageKeys.session, isString)).toBeNull();
  });

  it('treats corrupt JSON as nothing', () => {
    localStorage.setItem(StorageKeys.session, '{not json');
    expect(service.read(StorageKeys.session, isString)).toBeNull();
  });

  it('rejects a value of the wrong shape', () => {
    localStorage.setItem(StorageKeys.language, JSON.stringify({ language: 'id' }));
    expect(service.read(StorageKeys.language, isString)).toBeNull();
  });

  it('removes the key when writing null or undefined', () => {
    service.write(StorageKeys.language, 'id');
    service.write(StorageKeys.language, null);
    expect(localStorage.getItem(StorageKeys.language)).toBeNull();

    service.write(StorageKeys.language, 'en');
    service.write(StorageKeys.language, undefined);
    expect(localStorage.getItem(StorageKeys.language)).toBeNull();
  });

  it('does not throw when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(service.read(StorageKeys.language, isString)).toBeNull();
    expect(() => service.write(StorageKeys.language, 'id')).not.toThrow();
  });
});
