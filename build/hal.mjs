/**
 * Mirror the publication list from HAL into data/publications.json.
 *
 * HAL is the deposit archive CNRS researchers already use, so it is the one
 * list guaranteed to stay current without extra work. A scheduled GitHub Action
 * runs this daily; new deposits appear on the site on their own.
 *
 * What HAL does not know about — a plain-language summary, a link to code, the
 * "selected publication" star — lives in data/publication-extras.json, which
 * this script never touches.
 *
 * Usage: node build/hal.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ENDPOINT = 'https://api.archives-ouvertes.fr/search/';
const PAGE_SIZE = 200;
const OUTPUT = 'data/publications.json';

const FIELDS = [
  'halId_s', 'uri_s', 'title_s', 'subTitle_s', 'authFullName_s', 'producedDateY_i',
  'journalTitle_s', 'conferenceTitle_s', 'bookTitle_s', 'city_s', 'country_s',
  'docType_s', 'doiId_s', 'fileMain_s', 'files_s', 'abstract_s', 'volume_s',
  'issue_s', 'page_s', 'publisher_s', 'openAccess_bool', 'keyword_s',
].join(',');

/** HAL document types mapped onto the types the site displays. */
const TYPE_MAP = {
  ART: 'article',
  COUV: 'chapter',
  OUV: 'book', DOUV: 'book',
  COMM: 'conference', PROCEEDINGS: 'conference',
  POSTER: 'poster',
  REPORT: 'report', REPACT: 'report', NOTE: 'report', PRESCONF: 'report',
  THESE: 'thesis', MEM: 'thesis',
  HDR: 'hdr',
  UNDEFINED: 'preprint', PREPRINT: 'preprint',
};

/** First element of a HAL field, which may be a scalar or an array. */
const first = (value) => {
  if (Array.isArray(value)) return value.length ? String(value[0]) : '';
  return value === undefined || value === null ? '' : String(value);
};

/**
 * Fetch every record for one idHAL, following pagination.
 *
 * @param {string} halId idHAL of the author.
 * @returns {Promise<object[]>} Raw HAL records.
 */
async function fetchAll(halId) {
  const docs = [];
  let start = 0;
  let total = null;

  for (let page = 0; page < 25; page += 1) {
    const url = new URL(ENDPOINT);
    url.searchParams.set('q', `authIdHal_s:"${halId}"`);
    url.searchParams.set('fl', FIELDS);
    url.searchParams.set('rows', String(PAGE_SIZE));
    url.searchParams.set('start', String(start));
    url.searchParams.set('sort', 'producedDateY_i desc');
    url.searchParams.set('wt', 'json');

    const response = await fetch(url, {
      headers: { 'User-Agent': 'martin-thebault.fr build (contact via the site)' },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(`HAL answered with HTTP ${response.status}`);
    }

    const body = await response.json();
    const batch = body?.response?.docs;
    if (!Array.isArray(batch)) {
      throw new Error('The answer from HAL could not be read');
    }

    docs.push(...batch);
    total = body.response.numFound ?? docs.length;
    start += PAGE_SIZE;
    if (docs.length >= total) break;
  }

  return docs;
}

/**
 * Turn one HAL record into the shape the site renders.
 *
 * @param {object} doc HAL record.
 * @returns {object}
 */
function mapRecord(doc) {
  const type = TYPE_MAP[String(doc.docType_s ?? '').toUpperCase()] ?? 'other';

  let title = first(doc.title_s);
  const subtitle = first(doc.subTitle_s);
  if (subtitle && subtitle.toLowerCase() !== title.toLowerCase()) {
    title += `. ${subtitle}`;
  }

  // Where it appeared: journal, then conference, then book, then publisher.
  const venue = ['journalTitle_s', 'conferenceTitle_s', 'bookTitle_s', 'publisher_s']
    .map((key) => first(doc[key]))
    .find(Boolean) ?? '';

  // Volume / issue / pages for articles; place for talks.
  const details = [];
  if (doc.volume_s) details.push(first(doc.volume_s));
  if (doc.issue_s) details.push(`(${first(doc.issue_s)})`);
  if (doc.page_s) details.push(first(doc.page_s));
  if (type === 'conference') {
    const place = [first(doc.city_s), first(doc.country_s).toUpperCase()].filter(Boolean);
    if (place.length) details.push(place.join(', '));
  }

  return {
    id: first(doc.halId_s),
    title,
    authors: Array.isArray(doc.authFullName_s) ? doc.authFullName_s.map(String) : [],
    year: doc.producedDateY_i ? Number(doc.producedDateY_i) : null,
    type,
    venue,
    details: details.join(', '),
    doi: first(doc.doiId_s),
    pdf: first(doc.fileMain_s) || first(doc.files_s),
    hal: first(doc.uri_s),
    openAccess: Boolean(doc.openAccess_bool),
    abstract: first(doc.abstract_s),
    keywords: Array.isArray(doc.keyword_s) ? doc.keyword_s.slice(0, 8).map(String) : [],
  };
}

async function main() {
  const site = JSON.parse(readFileSync('data/site.json', 'utf8'));
  const halId = site.hal_id;

  if (!halId) {
    console.error('No hal_id set in data/site.json');
    process.exit(1);
  }

  console.log(`Reading HAL for idHAL "${halId}"…`);

  const raw = await fetchAll(halId);
  const items = raw
    .map(mapRecord)
    .filter((item) => item.id && item.title)
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title));

  // Preserve the previous file's timestamp when nothing actually changed, so a
  // scheduled run does not produce an empty commit every single day.
  let previous = null;
  if (existsSync(OUTPUT)) {
    try {
      previous = JSON.parse(readFileSync(OUTPUT, 'utf8'));
    } catch {
      previous = null;
    }
  }

  const unchanged = previous
    && JSON.stringify(previous.items) === JSON.stringify(items);

  const output = {
    source: `https://cv.hal.science/${halId}`,
    fetched: unchanged ? previous.fetched : new Date().toISOString(),
    count: items.length,
    items,
  };

  writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);

  const byType = items.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`  ${items.length} publications${unchanged ? ' (unchanged)' : ''}`);
  for (const [type, n] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(n).padStart(3)}  ${type}`);
  }
}

main().catch((error) => {
  console.error(`HAL sync failed: ${error.message}`);
  process.exit(1);
});
