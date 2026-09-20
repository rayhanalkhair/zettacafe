import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { SessionStore } from '@core/auth/session.store';
import { expectNoAxeViolations } from '../../../../testing/a11y';
import { DEMO_ACCOUNTS } from '../../../../testing/apollo';
import { fill, renderRoute } from '../../../../testing/app-harness';
import { TopUpDialog } from './top-up.dialog';

const CUSTOMER_CREDIT = 250_000;

async function openDialog() {
  const page = await renderRoute('/', []);
  await TestBed.inject(AuthService).signIn(DEMO_ACCOUNTS.customer);
  const ref = TestBed.inject(MatDialog).open(TopUpDialog);
  await vi.waitFor(() => expect(document.querySelector('zc-top-up-dialog')).not.toBeNull());
  const el = document.querySelector('zc-top-up-dialog') as HTMLElement;
  // Everything, including the translated text, has rendered once the title has.
  await vi.waitFor(() => expect(el.querySelector('h2')?.textContent).toBe('Add credit'));
  await vi.waitFor(() => expect(el.querySelector('label')?.textContent).toContain('Amount'));
  return { page, ref, el };
}

const submit = (el: HTMLElement) => el.querySelector<HTMLButtonElement>('button[type="submit"]')!;

describe('TopUpDialog', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    localStorage.clear();
  });

  it('is named, labelled and has no accessibility violations', async () => {
    const { el } = await openDialog();
    expect(el.querySelector('h2')?.textContent).toBe('Add credit');
    expect(el.textContent).toContain('Rp 1,000');
    expect(el.textContent).toContain('Rp 10,000,000');
    await expectNoAxeViolations(el);
  });

  it('fills the amount from a quick amount, and stays editable', async () => {
    const { el } = await openDialog();
    const preset = Array.from(el.querySelectorAll('.presets button')).find((b) =>
      b.textContent.includes('50,000'),
    ) as HTMLButtonElement;
    preset.click();
    const input = el.querySelector('input') as HTMLInputElement;
    await vi.waitFor(() => expect(input.value).toBe('50000'));
  });

  it('adds the credit, updates the header balance, thanks the person and closes', async () => {
    const { el, ref } = await openDialog();
    const session = TestBed.inject(SessionStore);
    fill(el, 'Amount', '50000');
    submit(el).click();

    await vi.waitFor(() => expect(session.creditIdr()).toBe(CUSTOMER_CREDIT + 50_000));
    await vi.waitFor(() => expect(document.body.textContent).toContain('Added Rp 50,000'));
    await firstValueFrom(ref.afterClosed());
  });

  it.each([
    ['nothing', '', 'required'],
    ['less than the minimum', '500', 'at least'],
    ['more than the maximum', '20000000', 'at most'],
  ])('refuses %s without asking the server', async (_name, value, message) => {
    const { el } = await openDialog();
    const session = TestBed.inject(SessionStore);
    fill(el, 'Amount', value);
    submit(el).click();

    await vi.waitFor(() =>
      expect(el.querySelector('mat-error')?.textContent ?? '').toContain(message),
    );
    expect(session.creditIdr()).toBe(CUSTOMER_CREDIT);
  });
});
