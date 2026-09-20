import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { expectNoAxeViolations } from '../../../testing/a11y';
import { provideTestTranslations } from '../../../testing/translate';
import { fieldErrorMessage } from './field-errors';
import { NumberField } from './number-field';
import { PasswordField } from './password-field';
import { SearchField, SEARCH_DEBOUNCE_MS } from './search-field';
import { SelectField } from './select-field';
import { TextareaField } from './textarea-field';
import { TextField } from './text-field';
import { atLeast, httpUrl, integer, uniqueBy } from './validators';

describe('fieldErrorMessage', () => {
  const errorsOf = (control: FormControl) => control.errors;

  it('is null for a valid control', () => {
    expect(fieldErrorMessage(null)).toBeNull();
  });

  it('maps required', () => {
    const c = new FormControl('', Validators.required);
    expect(fieldErrorMessage(errorsOf(c))).toEqual({ key: 'forms.errors.required', params: {} });
  });

  it('maps minlength with its length', () => {
    const c = new FormControl('ab', Validators.minLength(8));
    expect(fieldErrorMessage(errorsOf(c))).toEqual({
      key: 'forms.errors.minlength',
      params: { requiredLength: 8 },
    });
  });

  it('maps min and max with their bounds', () => {
    expect(fieldErrorMessage(errorsOf(new FormControl(0, Validators.min(1))))?.params).toEqual({
      min: 1,
    });
    expect(fieldErrorMessage(errorsOf(new FormControl(9, Validators.max(5))))?.params).toEqual({
      max: 5,
    });
  });

  it('maps email and pattern', () => {
    expect(fieldErrorMessage(errorsOf(new FormControl('x', Validators.email)))?.key).toBe(
      'forms.errors.email',
    );
    expect(
      fieldErrorMessage(errorsOf(new FormControl('x', Validators.pattern(/^\d+$/))))?.key,
    ).toBe('forms.errors.pattern');
  });

  it('reports the first problem in a fixed order', () => {
    const c = new FormControl('', [Validators.required, Validators.minLength(8)]);
    expect(fieldErrorMessage(errorsOf(c))?.key).toBe('forms.errors.required');
  });

  it('uses the message a custom validator supplies', () => {
    const errors = { taken: { messageKey: 'auth.emailTaken', params: { email: 'a@b.id' } } };
    expect(fieldErrorMessage(errors)).toEqual({
      key: 'auth.emailTaken',
      params: { email: 'a@b.id' },
    });
  });

  it('falls back to a generic message for an unknown error', () => {
    expect(fieldErrorMessage({ mystery: true })?.key).toBe('forms.errors.invalid');
  });
});

@Component({
  imports: [TextField, NumberField, PasswordField],
  template: `
    <form>
      <zc-text-field
        [control]="email"
        label="Email"
        type="email"
        autocomplete="email"
        hint="We never share it."
      />
      <zc-password-field [control]="password" label="Password" autocomplete="new-password" />
      <zc-number-field
        [control]="servings"
        label="Servings"
        suffix="portions"
        [min]="1"
        [max]="50"
      />
    </form>
  `,
})
class FormHost {
  email = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });
  password = new FormControl('', { nonNullable: true, validators: [Validators.minLength(8)] });
  servings = new FormControl<number | null>(null, [Validators.min(1)]);
}

describe('form fields', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideTestTranslations()] }));

  const render = async () => {
    const fixture = TestBed.createComponent(FormHost);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement, host: fixture.componentInstance };
  };

  it('labels every input and has no accessibility violations', async () => {
    const { el } = await render();
    for (const input of Array.from(el.querySelectorAll('input'))) {
      expect(el.querySelector(`label[for="${input.id}"]`)).not.toBeNull();
    }
    await expectNoAxeViolations(el);
  });

  it('passes the autocomplete token through', async () => {
    const { el } = await render();
    const inputs = el.querySelectorAll('input');
    expect(inputs[0]?.getAttribute('autocomplete')).toBe('email');
    expect(inputs[1]?.getAttribute('autocomplete')).toBe('new-password');
  });

  it('shows a translated error only once the field is touched', async () => {
    const { fixture, el, host } = await render();
    expect(el.querySelector('mat-error')).toBeNull();

    host.email.markAsTouched();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.querySelector('mat-error')?.textContent).toContain('This field is required.');
  });

  it('updates the message as the value changes, without the parent re-rendering', async () => {
    const { fixture, el, host } = await render();
    host.email.markAsTouched();
    host.email.setValue('not-an-email');
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.querySelector('mat-error')?.textContent).toContain('valid email');
  });

  it('interpolates parameters into the message', async () => {
    const { fixture, el, host } = await render();
    host.password.setValue('short');
    host.password.markAsTouched();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.querySelector('mat-error')?.textContent).toContain('at least 8 characters');
  });

  describe('PasswordField', () => {
    it('hides the password until asked, and reports the toggle state', async () => {
      const { fixture, el } = await render();
      const input = el.querySelectorAll('input')[1] as HTMLInputElement;
      const toggle = el.querySelector('button.toggle') as HTMLButtonElement;

      expect(input.type).toBe('password');
      expect(toggle.getAttribute('aria-pressed')).toBe('false');
      expect(toggle.type).toBe('button');

      toggle.click();
      await fixture.whenStable();
      expect(input.type).toBe('text');
      expect(toggle.getAttribute('aria-pressed')).toBe('true');
    });
  });

  describe('NumberField', () => {
    it('holds a number, not a string', async () => {
      const { fixture, el, host } = await render();
      const input = el.querySelector('input[type="number"]') as HTMLInputElement;
      input.value = '12';
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      expect(host.servings.value).toBe(12);
      expect(el.textContent).toContain('portions');
    });
  });
});

describe('SearchField', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideTestTranslations()] });
  });
  afterEach(() => vi.useRealTimers());

  const create = () => {
    const fixture = TestBed.createComponent(SearchField);
    fixture.componentRef.setInput('label', 'Search recipes');
    const terms: string[] = [];
    fixture.componentInstance.search.subscribe((t) => terms.push(t));
    fixture.detectChanges();
    const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    const type = (value: string) => {
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    return { fixture, terms, type, input };
  };

  it('is a labelled search landmark with no violations', async () => {
    const { fixture } = create();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="search"]')).not.toBeNull();
    await vi.advanceTimersByTimeAsync(0);
    vi.useRealTimers(); // axe schedules with timers of its own
    await expectNoAxeViolations(el);
  });

  // v1 queried the server on every keystroke.
  it('emits once typing pauses, not on every keystroke', async () => {
    const { terms, type } = create();
    type('r');
    await vi.advanceTimersByTimeAsync(100);
    type('re');
    await vi.advanceTimersByTimeAsync(100);
    type('ren');
    expect(terms).toEqual([]);

    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
    expect(terms).toEqual(['ren']);
  });

  it('trims the term and ignores an unchanged one', async () => {
    const { terms, type } = create();
    type('  soto ');
    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
    type('soto');
    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
    expect(terms).toEqual(['soto']);
  });

  it('sets the box from the value input without emitting', async () => {
    const { fixture, terms, input } = create();
    fixture.componentRef.setInput('value', 'rawon');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
    expect(input.value).toBe('rawon');
    expect(terms).toEqual([]);
  });
});

describe('validators', () => {
  const control = (value: unknown) => new FormControl(value);

  it('integer accepts whole numbers and empty, refuses fractions', () => {
    expect(integer(control(3))).toBeNull();
    expect(integer(control(0))).toBeNull();
    expect(integer(control(null))).toBeNull();
    expect(integer(control(2.5))).toEqual({ integer: true });
  });

  it('httpUrl accepts web addresses and empty, refuses anything else', () => {
    expect(httpUrl(control('https://example.com/a.jpg'))).toBeNull();
    expect(httpUrl(control('http://example.com'))).toBeNull();
    expect(httpUrl(control(''))).toBeNull();
    expect(httpUrl(control('   '))).toBeNull();
    expect(httpUrl(control('example.com'))).toEqual({ url: true });
    expect(httpUrl(control('javascript:alert(1)'))).toEqual({ url: true });
    expect(httpUrl(control('ftp://example.com'))).toEqual({ url: true });
  });

  it('uniqueBy refuses a repeated key and ignores blanks', () => {
    const rule = uniqueBy<{ id: string }>((r) => r.id, 'x.duplicate');
    expect(rule(control([{ id: 'a' }, { id: 'b' }]))).toBeNull();
    expect(rule(control([{ id: 'a' }, { id: 'a' }]))).toEqual({
      duplicate: { messageKey: 'x.duplicate' },
    });
    expect(rule(control([{ id: '' }, { id: '' }]))).toBeNull();
  });

  it('atLeast needs enough rows', () => {
    const rule = atLeast(1, 'x.tooFew');
    expect(rule(control([]))).toEqual({ tooFew: { messageKey: 'x.tooFew' } });
    expect(rule(control([1]))).toBeNull();
  });

  it('maps the new built-in errors to messages', () => {
    expect(fieldErrorMessage({ integer: true })?.key).toBe('forms.errors.integer');
    expect(fieldErrorMessage({ url: true })?.key).toBe('forms.errors.url');
  });
});

@Component({
  imports: [SelectField, TextareaField],
  template: `
    <zc-select-field [control]="category" label="Category" [options]="options" hint="Pick one." />
    <zc-textarea-field [control]="notes" label="Notes" [rows]="4" hint="Optional." />
  `,
})
class ChoiceHost {
  category = new FormControl('FOOD', { nonNullable: true, validators: [Validators.required] });
  notes = new FormControl('', { nonNullable: true, validators: [Validators.maxLength(5)] });
  options = [
    { value: 'FOOD', labelKey: 'forms.errors.required' },
    { value: 'DRINK', label: 'Drink' },
  ];
}

describe('select and textarea fields', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideTestTranslations()] }));

  const render = async () => {
    const fixture = TestBed.createComponent(ChoiceHost);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement, host: fixture.componentInstance };
  };

  it('has no accessibility violations', async () => {
    const { el } = await render();
    await expectNoAxeViolations(el);
  });

  it('labels the select and the textarea', async () => {
    const { el } = await render();
    expect(el.querySelector('mat-select')?.getAttribute('role')).toBe('combobox');
    expect(el.querySelector('textarea')?.getAttribute('rows')).toBe('4');
    const labels = Array.from(el.querySelectorAll('label')).map((l) => l.textContent.trim());
    expect(labels).toEqual(['Category', 'Notes']);
  });

  it('shows the selected option, translating a key and using a literal label as is', async () => {
    const { fixture, el, host } = await render();
    expect(el.querySelector('.mat-mdc-select-value-text')?.textContent).toContain(
      'This field is required.',
    );
    host.category.setValue('DRINK');
    await fixture.whenStable();
    expect(el.querySelector('.mat-mdc-select-value-text')?.textContent).toContain('Drink');
  });

  it('shows the validation message of the textarea once touched', async () => {
    const { fixture, el, host } = await render();
    host.notes.setValue('too long for it');
    host.notes.markAsTouched();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.querySelector('mat-error')?.textContent).toContain('at most 5 characters');
  });
});
