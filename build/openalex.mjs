/**
 * Mirror the citation record from OpenAlex into data/openalex.json.
 *
 * HAL holds what he deposited. OpenAlex holds what the rest of the literature
 * did with it: citations per year, the topics the work is indexed under, and
 * the institutions and countries he publishes with. None of that is in HAL.
 *
 * Identified by ORCID, which is exact, rather than by name.
 *
 * Usage: node build/openalex.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';

const API = 'https://api.openalex.org';
const OUTPUT = 'data/openalex.json';

const site = JSON.parse(readFileSync('data/site.json', 'utf8'));
const ORCID = (site.links.orcid || '').replace(/^https?:\/\/orcid\.org\//, '');

/**
 * Call OpenAlex, identifying the caller as the polite pool asks.
 *
 * @param {string} path Path and query.
 * @returns {Promise<object>}
 */
async function get(path) {
  const url = new URL(API + path);
  url.searchParams.set('mailto', site.email);
  const response = await fetch(url, { signal: AbortSignal.timeout(40_000) });
  if (!response.ok) throw new Error(`OpenAlex answered HTTP ${response.status}`);
  return response.json();
}

async function main() {
  if (!ORCID) throw new Error('No ORCID in data/site.json');
  console.log(`Reading OpenAlex for ORCID ${ORCID}…`);

  const author = await get(`/authors/https://orcid.org/${ORCID}`);
  const works = await get(
    `/works?filter=author.orcid:${ORCID}&per-page=200`
    + '&select=id,title,doi,publication_year,cited_by_count,authorships,type,primary_location',
  );

  /*
   * OpenAlex indexes some works twice, typically a repository copy beside the
   * publisher's, and it carries anything claimed on the ORCID profile whether
   * or not it was ever published. Both inflate a count of output. Records with
   * neither a DOI nor a venue are dropped, and the rest are deduplicated on a
   * normalised title, keeping the copy that carries a DOI.
   */
  const byTitle = new Map();
  let dropped = 0;
  for (const work of works.results) {
    const venue = work.primary_location?.source?.display_name;
    if (!work.doi && !venue) {
      dropped += 1;
      continue;
    }
    const key = (work.title ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 70);
    const held = byTitle.get(key);
    if (!held || (!held.doi && work.doi)) byTitle.set(key, work);
  }
  const deduped = [...byTitle.values()];
  console.log(`  ${works.results.length} records, ${dropped} without a DOI or venue, `
    + `${works.results.length - dropped - deduped.length} duplicates, ${deduped.length} kept`);

  // Works and countries per year, counted once per work.
  const perYear = new Map();
  const countries = new Map();
  const institutions = new Map();

  for (const work of deduped) {
    const year = work.publication_year;
    if (year) perYear.set(year, (perYear.get(year) ?? 0) + 1);

    const seenCountry = new Set();
    const seenInstitution = new Set();
    for (const authorship of work.authorships ?? []) {
      for (const institution of authorship.institutions ?? []) {
        if (institution.country_code) seenCountry.add(institution.country_code);
        if (institution.display_name) seenInstitution.add(institution.display_name);
      }
    }
    for (const c of seenCountry) countries.set(c, (countries.get(c) ?? 0) + 1);
    for (const i of seenInstitution) institutions.set(i, (institutions.get(i) ?? 0) + 1);
  }

  const byYear = (author.counts_by_year ?? [])
    .map((row) => ({
      year: row.year,
      works: perYear.get(row.year) ?? 0,
      citations: row.cited_by_count ?? 0,
    }))
    .sort((a, b) => a.year - b.year);

  // Years OpenAlex reports no citations for are still years he published in.
  for (const [year, count] of perYear) {
    if (!byYear.some((r) => r.year === year)) byYear.push({ year, works: count, citations: 0 });
  }
  byYear.sort((a, b) => a.year - b.year);

  // A leading year with neither a work nor a citation is an empty bar.
  while (byYear.length && byYear[0].works === 0 && byYear[0].citations === 0) byYear.shift();

  const output = {
    source: 'https://openalex.org',
    orcid: ORCID,
    fetched: new Date().toISOString().slice(0, 10),
    totals: {
      works: deduped.length,
      worksReportedByOpenAlex: author.works_count ?? null,
      citations: author.cited_by_count ?? 0,
      hIndex: author.summary_stats?.h_index ?? null,
      i10: author.summary_stats?.i10_index ?? null,
    },
    byYear,
    topics: (author.topics ?? []).slice(0, 6)
      .map((t) => ({ name: t.display_name, count: t.count })),
    countries: [...countries.entries()]
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count),
    institutions: [...institutions.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  };

  writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);

  console.log(`  ${output.totals.works} works, ${output.totals.citations} citations, h-index ${output.totals.hIndex}`);
  console.log(`  ${output.byYear.length} years, ${output.countries.length} countries`);
  console.log(`  written to ${OUTPUT}`);
}

main().catch((error) => {
  console.error(`OpenAlex fetch failed: ${error.message}`);
  process.exit(1);
});
