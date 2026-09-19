#!/usr/bin/env node
/**
 * i18n drift check.
 *
 * v1 shipped 8 templates with zero translation and 13 defined-but-unused keys,
 * because keys were added after the templates. This gate makes that impossible:
 *
 *   1. en.json and id.json must have identical key sets.
 *   2. Every key referenced in a template or in TS must exist in both.
 *   3. Every defined key must be referenced somewhere.
 *
 * Run: npm run i18n:check
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const I18N_DIR = join(ROOT, 'public', 'i18n');
const SRC_DIR = join(ROOT, 'src');
const LOCALES = ['en', 'id'];

/** Keys that are built dynamically and so cannot be found by a static scan. */
const DYNAMIC_ALLOWLIST = [/^errors\./];

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

function flatten(obj, prefix = '', out = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out.add(key);
  }
  return out;
}

function walk(dir, exts, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, exts, out);
    else if (exts.some((e) => entry.endsWith(e))) out.push(full);
  }
  return out;
}

/** Collect `'a.b' | translate`, translate.instant('a.b'), and *Key: 'a.b'. */
function collectUsedKeys(files) {
  const used = new Map();
  const patterns = [
    /['"`]([a-z][\w-]*(?:\.[\w-]+)+)['"`]\s*\|\s*translate/gi,
    /\btranslate\.(?:instant|get|stream)\(\s*['"`]([^'"`]+)['"`]/gi,
    /\b\w*[kK]ey\s*:\s*['"`]([a-z][\w-]*(?:\.[\w-]+)+)['"`]/g,
  ];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const re of patterns) {
      for (const m of text.matchAll(re)) {
        const key = m[1];
        if (!used.has(key)) used.set(key, new Set());
        used.get(key).add(relative(ROOT, file).split(sep).join('/'));
      }
    }
  }
  return used;
}

const problems = [];

// --- Load locales -----------------------------------------------------------
const keysByLocale = {};
for (const locale of LOCALES) {
  const path = join(I18N_DIR, `${locale}.json`);
  if (!existsSync(path)) {
    problems.push(`Missing locale file: ${relative(ROOT, path)}`);
    continue;
  }
  try {
    keysByLocale[locale] = flatten(JSON.parse(readFileSync(path, 'utf8')));
  } catch (err) {
    problems.push(`Invalid JSON in ${locale}.json: ${err.message}`);
  }
}

if (problems.length) {
  console.error(red('i18n check failed:'));
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

// --- 1. Locales must match --------------------------------------------------
const [base, ...rest] = LOCALES;
for (const locale of rest) {
  const missing = [...keysByLocale[base]].filter((k) => !keysByLocale[locale].has(k));
  const extra = [...keysByLocale[locale]].filter((k) => !keysByLocale[base].has(k));
  for (const k of missing)
    problems.push(`${locale}.json is missing key present in ${base}.json: ${k}`);
  for (const k of extra) problems.push(`${locale}.json has key not present in ${base}.json: ${k}`);
}

// --- 2 & 3. Cross-check against source -------------------------------------
const sourceFiles = walk(SRC_DIR, ['.html', '.ts']).filter((f) => !f.endsWith('.spec.ts'));
const used = collectUsedKeys(sourceFiles);
const defined = keysByLocale[base];

for (const [key, files] of used) {
  if (!defined.has(key)) {
    problems.push(`Key used but not defined: ${key} ${dim(`(${[...files].join(', ')})`)}`);
  }
}

for (const key of defined) {
  if (used.has(key)) continue;
  if (DYNAMIC_ALLOWLIST.some((re) => re.test(key))) continue;
  problems.push(`Key defined but never used: ${key}`);
}

// --- Report -----------------------------------------------------------------
if (problems.length) {
  console.error(red(`i18n check failed (${problems.length} problem(s)):`));
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(
  green(`i18n check passed`) +
    dim(
      ` — ${defined.size} key(s), ${LOCALES.length} locale(s), ${sourceFiles.length} source file(s) scanned`,
    ),
);
