import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/**
 * Runs axe over the page as it is now and returns one readable line per violation.
 * An empty array is the pass condition, so a failure prints what broke and where.
 *
 * This runs in a real browser, so it checks colour contrast, which the jsdom axe runs
 * in the unit tests cannot compute.
 */
export async function violationsOf(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  return results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
  );
}
