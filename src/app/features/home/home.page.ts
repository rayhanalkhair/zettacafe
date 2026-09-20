import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PageShell } from '@shared/ui/page-shell/page-shell';
import { SectionHeading } from '@shared/ui/section-heading/section-heading';

/** A landing page for now. The home feature replaces it with the featured dishes. */
@Component({
  selector: 'zc-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageShell, SectionHeading, TranslatePipe],
  template: `
    <zc-page-shell>
      <zc-section-heading [level]="1" [heading]="'home.title' | translate" />
      <p>{{ 'home.tagline' | translate }}</p>
    </zc-page-shell>
  `,
})
export class HomePage {}
