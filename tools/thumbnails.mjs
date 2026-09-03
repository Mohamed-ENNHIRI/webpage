/**
 * Download the first-page preview HAL renders for each deposit.
 *
 * The previews are served from thumb.ccsd.cnrs.fr. Hotlinking them would make
 * every visitor's browser call a third party, so the build copies them into
 * static/img/publications and the site serves them from its own domain.
 *
 * Only deposits with a file have a preview, so coverage sits near 75 percent.
 * Run after `npm run hal`. Usage: node tools/thumbnails.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'img/publications';
const SIZE = 'medium';

async function main() {
  const { items } = JSON.parse(readFileSync('data/publications.json', 'utf8'));
  mkdirSync(OUT, { recursive: true });

  const wanted = new Set();
  let fetched = 0;
  let kept = 0;
  let failed = 0;

  for (const pub of items) {
    if (!pub.thumb) continue;
    const name = `${pub.id}.png`;
    wanted.add(name);

    const path = join(OUT, name);
    if (existsSync(path)) {
      kept += 1;
      continue;
    }

    try {
      const response = await fetch(`https://thumb.ccsd.cnrs.fr/${pub.thumb}/${SIZE}`, {
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 500) throw new Error('too small to be a preview');
      writeFileSync(path, bytes);
      fetched += 1;
      process.stdout.write(`\r  downloaded ${fetched}`);
    } catch (error) {
      failed += 1;
      console.warn(`\n  ${pub.id}: ${error.message}`);
    }
  }

  // Drop previews for records HAL no longer returns.
  let removed = 0;
  for (const file of readdirSync(OUT)) {
    if (file.endsWith('.png') && !wanted.has(file)) {
      unlinkSync(join(OUT, file));
      removed += 1;
    }
  }

  console.log(`\n  ${fetched} downloaded, ${kept} already present, ${failed} failed, ${removed} removed`);
  console.log(`  ${wanted.size} of ${items.length} publications have a preview`);
}

main().catch((error) => {
  console.error(`Thumbnail fetch failed: ${error.message}`);
  process.exit(1);
});
