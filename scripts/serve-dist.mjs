// A tiny static server for the production build, used by the end-to-end tests.
//
// It serves dist/zettacafe/browser and falls back to index.html for any path that is
// not a file, as a real SPA host does. It has no dependencies on purpose: the tests
// should exercise the build we ship, not a dev server, and a plain Node script keeps
// the test setup free of another package.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve('dist/zettacafe/browser');
const port = Number(process.env.PORT ?? 4300);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
};

async function fileFor(urlPath) {
  const candidate = normalize(join(root, decodeURIComponent(urlPath)));
  // Never serve anything outside the build directory.
  if (!candidate.startsWith(root)) return null;
  try {
    const info = await stat(candidate);
    return info.isFile() ? candidate : null;
  } catch {
    return null;
  }
}

createServer(async (request, response) => {
  const { pathname } = new URL(request.url ?? '/', 'http://localhost');
  const file = (await fileFor(pathname)) ?? join(root, 'index.html');
  try {
    const body = await readFile(file);
    response.writeHead(200, {
      'content-type': types[extname(file)] ?? 'application/octet-stream',
    });
    response.end(body);
  } catch {
    response.writeHead(500).end('Build the app first: npm run build');
  }
}).listen(port, () => console.log(`Serving ${root} on http://localhost:${port}`));
