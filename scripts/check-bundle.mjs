#!/usr/bin/env node
/**
 * Bundle boundary check.
 *
 * v1's defining performance failure was declaring feature modules lazy in the
 * router while also importing them eagerly in AppModule: lazy loading silently
 * did nothing and main.js reached 1.10 MB.
 *
 * v2 has the same hazard in a new shape. The in-browser GraphQL server
 * (graphql + @graphql-tools + idb + resolvers + seeds) is well over 200 kB and
 * must stay behind the dynamic import in core/graphql. A single static import
 * of anything under @server/* would pull all of it into the initial bundle.
 *
 * ESLint's import boundary is the first defence; this is the second, because it
 * checks the artifact that actually ships.
 *
 * Run: node scripts/check-bundle.mjs
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = join(process.cwd(), 'dist', 'zettacafe', 'browser');

/** Markers that must never appear in an initial chunk. */
const FORBIDDEN = [
  { pattern: '@graphql-tools', why: 'the in-browser GraphQL server must stay lazily loaded' },
  { pattern: 'makeExecutableSchema', why: 'the executable schema must stay lazily loaded' },
  { pattern: 'ZETTACAFE_SEED_MARKER', why: 'seed data must stay lazily loaded' },
];

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

if (!existsSync(DIST)) {
  console.error(red(`No build output at ${DIST}. Run "npm run build" first.`));
  process.exit(1);
}

const indexPath = join(DIST, 'index.html');
if (!existsSync(indexPath)) {
  console.error(red(`No index.html in ${DIST}.`));
  process.exit(1);
}

// Initial chunks are the ones index.html references directly. Everything else
// is lazily loaded and may legitimately contain the server.
const index = readFileSync(indexPath, 'utf8');
const initial = [...index.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)]
  .map((m) => m[1].replace(/^\//, ''))
  .filter((f) => existsSync(join(DIST, f)));

if (initial.length === 0) {
  console.error(red('Could not identify any initial chunks from index.html.'));
  process.exit(1);
}

const problems = [];
let initialBytes = 0;

for (const file of initial) {
  const full = join(DIST, file);
  initialBytes += statSync(full).size;
  const content = readFileSync(full, 'utf8');
  for (const { pattern, why } of FORBIDDEN) {
    if (content.includes(pattern)) {
      problems.push(`${file} contains "${pattern}" — ${why}.`);
    }
  }
}

const allFiles = readdirSync(DIST).filter((f) => f.endsWith('.js'));
const lazyCount = allFiles.length - initial.filter((f) => f.endsWith('.js')).length;

if (problems.length) {
  console.error(red(`Bundle boundary check failed (${problems.length} problem(s)):`));
  for (const p of problems) console.error(`  - ${p}`);
  console.error(dim('\n  The server must be reached only via the dynamic import in core/graphql.'));
  process.exit(1);
}

console.log(
  green('Bundle boundary check passed') +
    dim(
      ` — ${initial.length} initial chunk(s), ${(initialBytes / 1024).toFixed(1)} kB raw, ${lazyCount} lazy chunk(s)`,
    ),
);
