/**
 * Development server.
 *
 * Serves _site/ and rebuilds when anything under content/, data/, static/ or
 * build/ changes. Nothing here ships: the deployed site is plain static files.
 *
 * Usage: npm run dev
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = '_site';
const PORT = Number(process.env.PORT ?? 4321);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
};

/** Run a full build, reporting failures without killing the server. */
function build() {
  const started = Date.now();
  const result = spawnSync('node', ['build/build.mjs'], { encoding: 'utf8' });
  if (result.status !== 0) {
    console.error(`\nBuild failed:\n${result.stderr || result.stdout}`);
    return false;
  }
  console.log(`  rebuilt in ${Date.now() - started} ms`);
  return true;
}

/** Resolve a URL path to a file inside the output directory. */
async function resolve(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  const candidates = [join(ROOT, clean)];

  if (!extname(clean)) {
    candidates.push(join(ROOT, clean, 'index.html'), `${join(ROOT, clean)}.html`);
  }

  for (const candidate of candidates) {
    try {
      const info = await stat(candidate);
      if (info.isFile()) return candidate;
    } catch { /* try the next candidate */ }
  }
  return null;
}

if (!existsSync(ROOT)) build();

createServer(async (request, response) => {
  const file = await resolve(request.url ?? '/');

  if (!file) {
    const notFound = join(ROOT, '404.html');
    const body = existsSync(notFound) ? await readFile(notFound) : 'Not found';
    response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(body);
    return;
  }

  response.writeHead(200, {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  response.end(await readFile(file));
}).listen(PORT, () => {
  console.log(`\n  http://localhost:${PORT}\n`);
});

// Rebuild on change, debounced so a burst of edits triggers one build.
let pending = null;
for (const dir of ['content', 'data', 'static', 'build', 'admin']) {
  if (!existsSync(dir)) continue;
  watch(dir, { recursive: true }, (_event, name) => {
    if (name && name.startsWith('.')) return;
    clearTimeout(pending);
    pending = setTimeout(() => {
      console.log(`\n  changed: ${name}`);
      build();
    }, 120);
  });
}
