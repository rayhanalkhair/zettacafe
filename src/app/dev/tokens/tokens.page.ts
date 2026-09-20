import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSlideToggle } from '@angular/material/slide-toggle';

export type ThemeMode = 'system' | 'light' | 'dark';

interface Swatch {
  readonly token: string;
  readonly use: string;
}

interface SwatchGroup {
  readonly title: string;
  readonly items: readonly Swatch[];
}

interface TypeStep {
  readonly token: string;
  readonly family: 'display' | 'body';
  readonly sample: string;
}

interface Pairing {
  readonly label: string;
  readonly fg: string;
  readonly bg: string;
}

/**
 * Dev-only design token reference, mounted at /dev/tokens.
 *
 * Renders every token in the active theme so a change to _tokens.scss can be
 * inspected at a glance. The Material sampler proves the bridge in _theme.scss:
 * those components pick up the brand colours purely through --mat-sys-* tokens.
 *
 * This route is compiled out of production builds (see app.routes.ts).
 */
@Component({
  selector: 'zc-tokens-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButton, MatCheckbox, MatFormField, MatInput, MatLabel, MatSlideToggle],
  templateUrl: './tokens.page.html',
  styleUrl: './tokens.page.scss',
})
export class TokensPage {
  private readonly root = inject(DOCUMENT).documentElement;

  protected readonly modes: readonly ThemeMode[] = ['system', 'light', 'dark'];
  protected readonly mode = signal<ThemeMode>('system');

  protected readonly colourGroups: readonly SwatchGroup[] = [
    {
      title: 'Surfaces',
      items: [
        { token: 'paper', use: 'Page background' },
        { token: 'surface', use: 'Raised: dialogs, menus, cart lines' },
        { token: 'surface-sunken', use: 'Sunken: table stripes, wells' },
      ],
    },
    {
      title: 'Ink and lines',
      items: [
        { token: 'ink', use: 'Body text' },
        { token: 'ink-soft', use: 'Secondary text' },
        { token: 'outline', use: 'Control borders (3:1)' },
        { token: 'rule', use: 'Decorative dividers only' },
      ],
    },
    {
      title: 'Brand',
      items: [
        { token: 'aren', use: 'Primary: actions, links' },
        { token: 'pandan', use: 'Success, available' },
        { token: 'kunyit', use: 'Discount, highlight' },
        { token: 'sambal', use: 'Destructive, errors' },
      ],
    },
    {
      title: 'On brand',
      items: [
        { token: 'on-aren', use: 'Text on aren' },
        { token: 'on-pandan', use: 'Text on pandan' },
        { token: 'on-kunyit', use: 'Text on kunyit' },
        { token: 'on-sambal', use: 'Text on sambal' },
      ],
    },
    {
      title: 'Tints and focus',
      items: [
        { token: 'aren-tint', use: 'Selected, container' },
        { token: 'pandan-tint', use: 'Success banner' },
        { token: 'sambal-tint', use: 'Error banner' },
        { token: 'focus', use: 'Focus ring (3:1)' },
      ],
    },
  ];

  protected readonly pairings: readonly Pairing[] = [
    { label: 'Body text on page', fg: 'ink', bg: 'paper' },
    { label: 'Secondary text on page', fg: 'ink-soft', bg: 'paper' },
    { label: 'Link on page', fg: 'aren', bg: 'paper' },
    { label: 'Success on raised', fg: 'pandan', bg: 'surface' },
    { label: 'Error on raised', fg: 'sambal', bg: 'surface' },
    { label: 'Label on primary', fg: 'on-aren', bg: 'aren' },
    { label: 'Label on discount', fg: 'on-kunyit', bg: 'kunyit' },
    { label: 'Label on destructive', fg: 'on-sambal', bg: 'sambal' },
    { label: 'Error on tint', fg: 'sambal', bg: 'sambal-tint' },
  ];

  protected readonly typeScale: readonly TypeStep[] = [
    { token: 'text-display', family: 'display', sample: 'Rasa yang pulang' },
    { token: 'text-3xl', family: 'display', sample: 'Nasi goreng kampung' },
    { token: 'text-2xl', family: 'display', sample: 'Rendang daging sapi' },
    { token: 'text-xl', family: 'display', sample: 'Es teh tarik gula aren' },
    { token: 'text-lg', family: 'body', sample: 'Smoked rice, bird’s-eye chilli, fried shallot' },
    {
      token: 'text-base',
      family: 'body',
      sample: 'Slow-cooked eight hours in coconut milk and kluwek.',
    },
    { token: 'text-sm', family: 'body', sample: '15 portions left today' },
    { token: 'text-xs', family: 'body', sample: 'Prices include tax' },
  ];

  protected readonly spacing: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  constructor() {
    // Force a theme for inspection. "System" removes the override so the OS
    // setting (and light-dark()) decides, with no JavaScript in the real app.
    effect(() => {
      const mode = this.mode();
      if (mode === 'system') {
        this.root.removeAttribute('data-theme');
      } else {
        this.root.setAttribute('data-theme', mode);
      }
    });
    inject(DestroyRef).onDestroy(() => this.root.removeAttribute('data-theme'));
  }

  protected setMode(mode: ThemeMode): void {
    this.mode.set(mode);
  }
}
