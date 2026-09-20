#!/usr/bin/env node
/**
 * Colour contrast gate (WCAG 2.2 AA).
 *
 * Reads the light-dark() colour tokens from src/styles/_tokens.scss and asserts
 * every meaningful foreground/background pairing in BOTH themes:
 *
 *   1.4.3  Contrast (Minimum)      text                       >= 4.5:1
 *   1.4.11 Non-text Contrast       UI boundaries, focus ring  >= 3:1
 *
 * This runs at token-definition time, so a failing palette is caught before any
 * component consumes it. v1 had ~18 ad-hoc colours and no contrast checking.
 *
 * Add a pair to PAIRS whenever a token is used as a text or UI colour on a
 * given surface. Decorative-only tokens (e.g. --zc-rule) are intentionally
 * absent: WCAG does not require contrast for purely decorative lines.
 *
 * Run: npm run contrast:check
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const TOKENS_FILE = join(process.cwd(), 'src', 'styles', '_tokens.scss');
const TOKENS_PAGE = join(process.cwd(), 'src', 'app', 'dev', 'tokens', 'tokens.page.ts');

const TEXT = 4.5; // 1.4.3
const UI = 3; // 1.4.11

/** [foreground, background, minimum ratio, what it is] */
const PAIRS = [
  // Body copy on each surface
  ['ink', 'paper', TEXT, 'body text on page'],
  ['ink', 'surface', TEXT, 'body text on raised surface'],
  ['ink', 'surface-sunken', TEXT, 'body text on sunken surface'],
  ['ink-soft', 'paper', TEXT, 'secondary text on page'],
  ['ink-soft', 'surface', TEXT, 'secondary text on raised surface'],
  ['ink-soft', 'surface-sunken', TEXT, 'secondary text on sunken surface'],

  // Brand colours used AS TEXT (links, prices, status words)
  ['aren', 'paper', TEXT, 'link/accent text on page'],
  ['aren', 'surface', TEXT, 'link/accent text on raised surface'],
  ['aren', 'surface-sunken', TEXT, 'link/accent text on sunken surface'],
  ['pandan', 'paper', TEXT, 'success text on page'],
  ['pandan', 'surface', TEXT, 'success text on raised surface'],
  ['pandan', 'surface-sunken', TEXT, 'success text on sunken surface'],
  ['sambal', 'paper', TEXT, 'error text on page'],
  ['sambal', 'surface', TEXT, 'error text on raised surface'],
  ['sambal', 'surface-sunken', TEXT, 'error text on sunken surface'],

  // Text on tinted containers (banners, selected rows)
  ['ink', 'aren-tint', TEXT, 'body text on aren tint'],
  ['ink', 'pandan-tint', TEXT, 'body text on pandan tint'],
  ['ink', 'sambal-tint', TEXT, 'body text on sambal tint'],
  ['aren', 'aren-tint', TEXT, 'accent text on aren tint'],
  ['pandan', 'pandan-tint', TEXT, 'success text on pandan tint'],
  ['sambal', 'sambal-tint', TEXT, 'error text on sambal tint'],

  // Text ON filled brand colours (buttons, badges)
  ['on-aren', 'aren', TEXT, 'label on primary button'],
  ['on-pandan', 'pandan', TEXT, 'label on success fill'],
  ['on-kunyit', 'kunyit', TEXT, 'label on discount badge'],
  ['on-sambal', 'sambal', TEXT, 'label on destructive button'],

  // Non-text: control boundaries and focus
  ['outline', 'paper', UI, 'input border on page'],
  ['outline', 'surface', UI, 'input border on raised surface'],
  ['focus', 'paper', UI, 'focus ring on page'],
  ['focus', 'surface', UI, 'focus ring on raised surface'],
  ['focus', 'surface-sunken', UI, 'focus ring on sunken surface'],
  ['aren', 'paper', UI, 'primary button edge against page'],
  ['aren', 'surface', UI, 'primary button edge against raised surface'],
];

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

// --- Parse tokens -----------------------------------------------------------
const source = readFileSync(TOKENS_FILE, 'utf8');
const tokens = { light: {}, dark: {} };
const re = /--zc-([a-z0-9-]+)\s*:\s*light-dark\(\s*(#[0-9a-f]{6})\s*,\s*(#[0-9a-f]{6})\s*\)/gi;
for (const m of source.matchAll(re)) {
  tokens.light[m[1]] = m[2].toLowerCase();
  tokens.dark[m[1]] = m[3].toLowerCase();
}

if (Object.keys(tokens.light).length === 0) {
  console.error(red(`No light-dark() colour tokens found in ${TOKENS_FILE}`));
  process.exit(1);
}

// --- WCAG relative luminance and contrast ----------------------------------
function channel(v) {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function luminance(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// --- Every defined colour token must be shown on /dev/tokens ----------------
// A token nobody can see is a token nobody reviews. This keeps the reference
// page from drifting behind the source of truth.
const undisplayed = [];
if (existsSync(TOKENS_PAGE)) {
  const page = readFileSync(TOKENS_PAGE, 'utf8');
  const shown = new Set([...page.matchAll(/token:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]));
  for (const name of Object.keys(tokens.light)) {
    if (!shown.has(name)) undisplayed.push(name);
  }
}

// --- Evaluate ---------------------------------------------------------------
const failures = [];
const missing = new Set();
const rows = [];

for (const theme of ['light', 'dark']) {
  for (const [fg, bg, min, what] of PAIRS) {
    const f = tokens[theme][fg];
    const b = tokens[theme][bg];
    if (!f) missing.add(fg);
    if (!b) missing.add(bg);
    if (!f || !b) continue;
    const ratio = contrast(f, b);
    const ok = ratio >= min;
    rows.push({ theme, fg, bg, min, ratio, ok, what, f, b });
    if (!ok) failures.push({ theme, fg, bg, min, ratio, what, f, b });
  }
}

if (missing.size) {
  console.error(red(`Tokens referenced by PAIRS but not defined: ${[...missing].join(', ')}`));
  process.exit(1);
}

if (process.argv.includes('--table')) {
  for (const r of rows) {
    const mark = r.ok ? green('PASS') : red('FAIL');
    console.log(
      `${mark}  ${r.theme.padEnd(5)} ${r.fg.padEnd(15)} on ${r.bg.padEnd(15)} ` +
        `${r.ratio.toFixed(2).padStart(5)}:1  ${dim(`(min ${r.min}) ${r.f} / ${r.b}  ${r.what}`)}`,
    );
  }
}

if (undisplayed.length) {
  console.error(
    red(`Colour token(s) defined but not shown on /dev/tokens: ${undisplayed.join(', ')}`),
  );
  process.exit(1);
}

if (failures.length) {
  console.error(red(`\nContrast check failed (${failures.length} pair(s) below AA):`));
  for (const f of failures) {
    console.error(
      `  - [${f.theme}] --zc-${f.fg} (${f.f}) on --zc-${f.bg} (${f.b}): ` +
        `${f.ratio.toFixed(2)}:1, needs ${f.min}:1  ${dim(f.what)}`,
    );
  }
  process.exit(1);
}

const lowest = rows.reduce((a, b) => (b.ratio / b.min < a.ratio / a.min ? b : a));
console.log(
  green('Contrast check passed') +
    dim(
      ` — ${rows.length} pairs across 2 themes; tightest: ${lowest.fg}/${lowest.bg} ` +
        `[${lowest.theme}] ${lowest.ratio.toFixed(2)}:1 (min ${lowest.min})`,
    ),
);
