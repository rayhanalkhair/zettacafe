import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { CombinedGraphQLErrors } from '@apollo/client';
import { GlobalErrorHandler } from '@core/errors/global-error-handler';
import { LanguageStore } from '@core/i18n/language.store';
import { ConfirmService } from './confirm.service';
import { NotificationService } from './notification.service';

function translations(): void {
  const translate = TestBed.inject(TranslateService);
  translate.setTranslation('en', {
    common: { confirm: 'Confirm', cancel: 'Cancel', close: 'Dismiss' },
    errors: {
      UNKNOWN: 'Something went wrong.',
      INSUFFICIENT_CREDIT: 'You are short by {{shortfall}}.',
    },
    greet: { title: 'Delete {{name}}?', body: 'This cannot be undone.' },
    saved: 'Saved.',
  });
  translate.use('en');
}

describe('NotificationService', () => {
  let snackBar: { open: ReturnType<typeof vi.fn> };
  let service: NotificationService;

  beforeEach(() => {
    localStorage.clear();
    snackBar = { open: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideTranslateService({ fallbackLang: 'en' }),
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    translations();
    service = TestBed.inject(NotificationService);
  });
  afterEach(() => localStorage.clear());

  it('translates the key, and the dismiss label, before showing it', async () => {
    service.success('saved');
    await vi.waitFor(() =>
      expect(snackBar.open).toHaveBeenCalledWith(
        'Saved.',
        'Dismiss',
        expect.objectContaining({ politeness: 'polite' }),
      ),
    );
  });

  it('announces errors assertively and keeps them up longer', async () => {
    service.success('saved');
    service.error('errors.UNKNOWN');
    await vi.waitFor(() => expect(snackBar.open).toHaveBeenCalledTimes(2));
    const [success, error] = snackBar.open.mock.calls.map(
      (call) => call[2] as Record<string, unknown>,
    );
    expect(error?.['politeness']).toBe('assertive');
    expect(error!['duration'] as number).toBeGreaterThan(success!['duration'] as number);
  });

  it('turns a server error into a translated message with formatted money', async () => {
    TestBed.inject(LanguageStore);
    const error = new CombinedGraphQLErrors({
      data: null,
      errors: [
        {
          message: 'ignored',
          extensions: { code: 'INSUFFICIENT_CREDIT', shortfallIdr: 12_000, requiredIdr: 40_000 },
        },
      ],
    });
    service.fromError(error);
    await vi.waitFor(() => expect(snackBar.open).toHaveBeenCalled());
    expect(snackBar.open.mock.calls[0]?.[0]).toBe('You are short by Rp 12,000.');
  });

  it('shows a generic message for an error it does not recognise', async () => {
    service.fromError(new Error('boom'));
    await vi.waitFor(() => expect(snackBar.open).toHaveBeenCalled());
    expect(snackBar.open.mock.calls[0]?.[0]).toBe('Something went wrong.');
  });
});

describe('ConfirmService', () => {
  const ask = async (
    result: unknown,
  ): Promise<{ answer: boolean; open: ReturnType<typeof vi.fn> }> => {
    const open = vi.fn().mockReturnValue({ afterClosed: () => of(result) });
    TestBed.configureTestingModule({
      providers: [
        provideTranslateService({ fallbackLang: 'en' }),
        { provide: MatDialog, useValue: { open } },
      ],
    });
    translations();
    const answer = await TestBed.inject(ConfirmService).ask({
      titleKey: 'greet.title',
      messageKey: 'greet.body',
      params: { name: 'Rendang' },
      tone: 'danger',
    });
    return { answer, open };
  };

  it('resolves true only when the user confirmed', async () => {
    expect((await ask(true)).answer).toBe(true);
  });

  // v1's publish toggle ran its mutation on the "No" branch too.
  it.each([false, undefined, null, 'yes', 1])(
    'resolves false for %s (cancel, Escape, backdrop)',
    async (result) => {
      expect((await ask(result)).answer).toBe(false);
    },
  );

  it('translates the text and passes the tone through', async () => {
    const { open } = await ask(true);
    const data = (open.mock.calls[0] as [unknown, { data: Record<string, string> }])[1].data;
    expect(data).toEqual({
      title: 'Delete Rendang?',
      message: 'This cannot be undone.',
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
      tone: 'danger',
    });
  });
});

describe('GlobalErrorHandler', () => {
  let handler: ErrorHandler;
  let error: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    error = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: ErrorHandler, useClass: GlobalErrorHandler },
        { provide: NotificationService, useValue: { error } },
      ],
    });
    handler = TestBed.inject(ErrorHandler);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('logs the real error and tells the person something plain', () => {
    const boom = new Error('secret internals');
    handler.handleError(boom);
    expect(console.error).toHaveBeenCalledWith(boom);
    expect(error).toHaveBeenCalledWith('errors.UNKNOWN');
  });

  it('shows at most one notice per window, so a render loop cannot flood the screen', () => {
    for (let i = 0; i < 20; i++) handler.handleError(new Error(`loop ${i}`));
    expect(error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(20);

    vi.advanceTimersByTime(5001);
    handler.handleError(new Error('later'));
    expect(error).toHaveBeenCalledTimes(2);
  });

  it('never throws while reporting an error', () => {
    error.mockImplementation(() => {
      throw new Error('snackbar is gone');
    });
    expect(() => handler.handleError(new Error('x'))).not.toThrow();
  });
});
