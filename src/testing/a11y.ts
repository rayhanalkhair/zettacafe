import axe from 'axe-core';
import { expect } from 'vitest';

/**
 * Fails when axe finds a violation in the element. Colour contrast is not checked
 * here: jsdom does no layout or painting, so axe cannot compute it. Contrast is
 * enforced at the token level by scripts/check-contrast.mjs instead.
 */
export async function expectNoAxeViolations(element: Element): Promise<void> {
  const results = await axe.run(element, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  const report = results.violations.map(
    (v) => `${v.id}: ${v.help} -> ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
  expect(report).toEqual([]);
}
