#!/usr/bin/env node
/**
 * Bundle boundary check.
 *
 * v1's defining performance failure was declaring feature modules lazy in the
 * router while also importing them eagerly in AppModule: lazy loading silently
 * did nothing and main.js reached 1.10 MB.
 *
 * v2 has the same hazard in a new shape. The in-browser GraphQL server (resolvers,
 * seeds, business rules) must stay behind the dynamic import in core/graphql. A
 * single static import of anything under @server/* would pull all of it into the
 * initial bundle. ESLint's import boundary is the first defence; this checks the
 * artifact that actually ships.
 *
 * It asserts three things:
 *   1. No initial chunk contains server code (markers below).
 *   2. Some lazy chunk DOES contain it. Without this the check passes vacuously if
 *      the server vanished from the build entirely.
 *   3. No chunk of any kind contains dev-only tooling.
 *
 * Known and accepted: graphql's own executor and validation code IS in an initial
 * chunk (about 31 kB gzipped). esbuild hoists graphql's whole module graph into a
 * shared chunk because the main bundle reaches graphql's barrel file. It
 * reproduces with plain esbuild and with graphql 17, so it is not fixable from
 * here. That is library code, not this app's server, so it is not asserted against.
 *
 * Run: node scripts/check-bundle.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = join(process.cwd(), 'dist', 'zettacafe', 'browser');

/** Strings that only exist in this app's server code. They survive minification. */
const SERVER_MARKERS = [
  { pattern: 'zettacafe123', why: 'seed data (the demo accounts) must stay lazily loaded' },
  // Not an error CODE: the client legitimately lists those (core/errors). This is
  // the server's own message text, which the client never contains.
  {
    pattern: 'Wrong email or password.',
    why: 'resolvers and business rules must stay lazily loaded',
  },
  { pattern: 'pbkdf2$', why: 'password hashing must stay lazily loaded' },
];

/** Markers that must not appear in ANY chunk of a production build. */
const DEV_ONLY = [
  { pattern: 'zc-tokens-page', why: 'dev-only tooling must be compiled out' },
  { pattern: 'zc-graphql-console', why: 'dev-only tooling must be compiled out' },
  { pattern: 'zc-kitchen-sink-page', why: 'dev-only tooling must be compiled out' },
  { pattern: 'zc-session-page', why: 'dev-only tooling must be compiled out' },
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

// Initial chunks are the ones index.html loads: script tags and modulepreloads.
// Everything else is lazily loaded and may legitimately contain the server.
const index = readFileSync(indexPath, 'utf8');
const initial = [
  ...new Set(
    [...index.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)]
      .map((m) => m[1].replace(/^\//, ''))
      .filter((f) => existsSync(join(DIST, f))),
  ),
];

if (initial.length === 0) {
  console.error(red('Could not identify any initial chunks from index.html.'));
  process.exit(1);
}

const allJs = readdirSync(DIST).filter((f) => f.endsWith('.js'));
const initialJs = initial.filter((f) => f.endsWith('.js'));
const lazyJs = allJs.filter((f) => !initialJs.includes(f));
const read = (file) => readFileSync(join(DIST, file), 'utf8');

const problems = [];
let initialBytes = 0;

for (const file of initial) {
  initialBytes += statSync(join(DIST, file)).size;
  if (!file.endsWith('.js')) continue;
  const content = read(file);
  for (const { pattern, why } of SERVER_MARKERS) {
    if (content.includes(pattern)) {
      problems.push(`initial chunk ${file} contains "${pattern}": ${why}.`);
    }
  }
}

// The server must exist somewhere, or check 1 proves nothing.
const serverChunks = lazyJs.filter((file) => {
  const content = read(file);
  return SERVER_MARKERS.every(({ pattern }) => content.includes(pattern));
});
if (serverChunks.length === 0) {
  problems.push(
    'no lazy chunk contains the server. Either it was dropped from the build or the ' +
      'markers are stale, and the "initial chunks are clean" result would be meaningless.',
  );
}

for (const file of allJs) {
  const content = read(file);
  for (const { pattern, why } of DEV_ONLY) {
    if (content.includes(pattern)) problems.push(`${file} contains "${pattern}": ${why}.`);
  }
}

if (problems.length) {
  console.error(red(`Bundle boundary check failed (${problems.length} problem(s)):`));
  for (const p of problems) console.error(`  - ${p}`);
  console.error(dim('\n  The server must be reached only via the dynamic import in core/graphql.'));
  process.exit(1);
}

const serverFile = serverChunks[0];
console.log(
  green('Bundle boundary check passed') +
    dim(
      ` — initial: ${initialJs.length} js, ${(initialBytes / 1024).toFixed(1)} kB raw; ` +
        `server in lazy chunk ${serverFile} (${(statSync(join(DIST, serverFile)).size / 1024).toFixed(1)} kB)`,
    ),
);
