import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The page frame: the `<main>` landmark and the centred content column.
 *
 * v1 copied the same absolutely positioned `.container { height: 110%; padding: 6rem 0 }`
 * block into seven stylesheets, which is the root of its layout fragility, and never
 * had a `<main>` at all. `id="main"` is the target of the skip link; `tabindex="-1"`
 * lets the router move focus here after navigation without adding a tab stop.
 */
@Component({
  selector: 'zc-page-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main id="main" tabindex="-1" [class.narrow]="width() === 'narrow'">
      <ng-content />
    </main>
  `,
  styleUrl: './page-shell.scss',
})
export class PageShell {
  /** `narrow` suits forms and the cart; `default` suits the menu and admin tables. */
  readonly width = input<'default' | 'narrow'>('default');
}
