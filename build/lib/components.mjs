/**
 * The repeated pieces of the site: publications, people, projects, themes, news.
 *
 * Every function takes a context carrying the language, its string table and
 * its URL helpers, so the same component renders correctly in both languages.
 */

import { esc, cls, icon, formatAuthors, join } from './html.mjs';
import { pubTypeLabel, roleLabel, yearRange, formatDate, PUB_TYPE_ORDER, ROLE_ORDER } from './i18n.mjs';

/**
 * A section heading with an optional trailing link.
 *
 * @param {string} title Heading text.
 * @param {{href?: string, label?: string}} [more] Optional link.
 * @returns {string}
 */
export function sectionHeading(title, more) {
  const link = more?.href
    ? `<a class="section__more" href="${esc(more.href)}">${esc(more.label)} ${icon('arrow')}</a>`
    : '';
  return `<div class="section__head"><h2 class="section__title">${esc(title)}</h2>${link}</div>`;
}

/**
 * The DOI / PDF / HAL / code / data links under a publication.
 *
 * @param {object} pub Publication, already merged with its extras.
 * @param {object} ctx Rendering context.
 * @returns {string}
 */
export function publicationLinks(pub, ctx) {
  const links = [];
  if (pub.doi) links.push({ href: `https://doi.org/${pub.doi.replace(/^\/+/, '')}`, label: 'DOI', icon: 'link' });
  if (pub.pdf) links.push({ href: pub.pdf, label: 'PDF', icon: 'pdf' });
  if (pub.hal) links.push({ href: pub.hal, label: 'HAL', icon: 'hal' });
  if (pub.code) links.push({ href: pub.code, label: 'Code', icon: 'github' });
  if (pub.data) links.push({ href: pub.data, label: ctx.t.filterLabel === 'Show' ? 'Data' : 'Données', icon: 'download' });

  if (!links.length) return '';

  return `<p class="chips">${links.map((l) => (
    `<a class="chip" href="${esc(l.href)}" rel="noopener">${icon(l.icon)}<span>${esc(l.label)}</span></a>`
  )).join('')}</p>`;
}

/**
 * One publication.
 *
 * @param {object} pub Publication merged with its extras.
 * @param {object} ctx Rendering context.
 * @param {{showAbstract?: boolean}} [options] Rendering options.
 * @returns {string}
 */
export function publicationItem(pub, ctx, { showAbstract = false } = {}) {
  const meta = join([
    pub.venue && `<em class="pub__venue">${esc(pub.venue)}</em>`,
    pub.details && esc(pub.details),
    pub.year && `<span class="pub__year">${esc(pub.year)}</span>`,
  ], ' · ');

  const abstract = showAbstract && pub.abstract
    ? `<details class="pub__abstract"><summary>${esc(ctx.t.abstract)}</summary><p>${esc(pub.abstract)}</p></details>`
    : '';

  // HAL renders the first page of each deposit. Three quarters of them have one.
  const preview = pub.thumb
    ? `<div class="pub__thumb"><img src="/img/publications/${esc(pub.id)}.png" alt="" loading="lazy" width="170" height="240" /></div>`
    : '';

  return `
<article class="pub ${cls(`pub--${pub.type}`, preview && 'pub--illustrated')}" data-type="${esc(pub.type)}">
  ${preview}
  <div class="pub__body">
    <h3 class="pub__title">${pub.featured ? `<span class="pub__star" aria-hidden="true">${icon('star')}</span>` : ''}${esc(pub.title)}</h3>
    ${pub.authors?.length ? `<p class="pub__authors">${formatAuthors(pub.authors, ctx.site.name)}</p>` : ''}
    ${meta ? `<p class="pub__meta">${meta}</p>` : ''}
    ${pub.summary ? `<p class="pub__summary">${esc(pub.summary)}</p>` : ''}
    ${publicationLinks(pub, ctx)}
    ${abstract}
  </div>
</article>`.trim();
}

/**
 * A publication list, optionally grouped by year and filterable by type.
 *
 * @param {object[]} pubs Publications.
 * @param {object} ctx    Rendering context.
 * @param {{groupByYear?: boolean, filters?: boolean, showAbstract?: boolean}} [options] Options.
 * @returns {string}
 */
export function publicationList(pubs, ctx, { groupByYear = true, filters = false, showAbstract = false } = {}) {
  if (!pubs.length) return `<p class="empty">${esc(ctx.t.nothingYet)}</p>`;

  const bar = filters ? filterBar(pubs, ctx) : '';

  if (!groupByYear) {
    return `${bar}<div class="pub-list">${pubs.map((p) => publicationItem(p, ctx, { showAbstract })).join('')}</div>`;
  }

  const byYear = new Map();
  for (const pub of pubs) {
    const year = pub.year ?? ctx.t.undated;
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(pub);
  }

  const years = [...byYear.keys()].sort((a, b) => Number(b) - Number(a));
  const groups = years.map((year) => `
<section class="pub-year">
  <h2 class="pub-year__label"><span>${esc(year)}</span></h2>
  <div class="pub-year__items">${byYear.get(year).map((p) => publicationItem(p, ctx, { showAbstract })).join('')}</div>
</section>`.trim()).join('');

  return `${bar}<div class="pub-list pub-list--grouped">${groups}</div>`;
}

/**
 * The type filter buttons above a publication list.
 *
 * @param {object[]} pubs Publications being shown.
 * @param {object} ctx    Rendering context.
 * @returns {string}
 */
function filterBar(pubs, ctx) {
  const present = new Set(pubs.map((p) => p.type));
  if (present.size < 2) return '';

  const buttons = [
    `<button type="button" class="filter is-active" data-filter="all" aria-pressed="true">${esc(ctx.t.filterAll)}</button>`,
    ...PUB_TYPE_ORDER.filter((type) => present.has(type)).map((type) => (
      `<button type="button" class="filter" data-filter="${esc(type)}" aria-pressed="false">${esc(pubTypeLabel(ctx.lang, type, true))}</button>`
    )),
  ];

  return `<div class="filters" data-filters>
  <span class="filters__label">${esc(ctx.t.filterLabel)}</span>
  ${buttons.join('')}
</div>`;
}

/**
 * The icon links for one person.
 *
 * Only the fields filled in appear, so a person with no public profile shows
 * no row at all.
 *
 * @param {object} person Person.
 * @param {object} ctx    Rendering context.
 * @returns {string}
 */
export function personLinks(person, ctx) {
  const entries = [
    person.email && { href: `mailto:${person.email}`, icon: 'email', label: ctx.t.email },
    person.website && { href: person.website, icon: 'link', label: 'LOCIE' },
    person.scholar && { href: person.scholar, icon: 'scholar', label: 'Google Scholar' },
    person.orcid && { href: person.orcid, icon: 'orcid', label: 'ORCID' },
    person.hal && { href: person.hal, icon: 'hal', label: 'HAL' },
    person.linkedin && { href: person.linkedin, icon: 'linkedin', label: 'LinkedIn' },
  ].filter(Boolean);

  if (!entries.length) return '';

  return `<p class="person__links">${entries.map((e) => (
    `<a class="iconlink" href="${esc(e.href)}" rel="noopener" aria-label="${esc(e.label)}" title="${esc(e.label)}">${icon(e.icon)}</a>`
  )).join('')}</p>`;
}

/**
 * One team member.
 *
 * @param {object} person Person.
 * @param {object} ctx    Rendering context.
 * @returns {string}
 */
export function personCard(person, ctx) {
  const role = person.role_custom || roleLabel(ctx.lang, person.role);
  const years = yearRange(person.start_year, person.end_year, ctx.lang);
  const line = join([role, years], ' · ');

  const photo = person.photo
    ? `<img src="${esc(person.photo)}" alt="" loading="lazy" width="96" height="96" />`
    : `<span class="person__initials" aria-hidden="true">${esc(initials(person.name))}</span>`;

  return `
<article class="person${person.alumni ? ' person--alumni' : ''}">
  <a class="person__photo" href="${esc(ctx.url.item('people', person.id))}" tabindex="-1" aria-hidden="true">${photo}</a>
  <div class="person__body">
    <h3 class="person__name"><a href="${esc(ctx.url.item('people', person.id))}">${esc(person.name)}</a></h3>
    ${line ? `<p class="person__role">${esc(line)}</p>` : ''}
    ${person.topic ? `<p class="person__topic">${esc(person.topic)}</p>` : ''}
    ${person.cosupervisors ? `<p class="person__note">${esc(ctx.t.coSupervised)} ${esc(person.cosupervisors)}</p>` : ''}
    ${person.alumni && person.current_position ? `<p class="person__note">${esc(ctx.t.nowAt)}: ${esc(person.current_position)}</p>` : ''}
    ${personLinks(person, ctx)}
  </div>
</article>`.trim();
}

/**
 * A team list grouped by role.
 *
 * @param {object[]} people People to show.
 * @param {object} ctx      Rendering context.
 * @returns {string}
 */
export function peopleByRole(people, ctx) {
  if (!people.length) return `<p class="empty">${esc(ctx.t.nothingYet)}</p>`;

  return ROLE_ORDER
    .map((role) => {
      const group = people.filter((p) => (p.role || 'collaborator') === role);
      if (!group.length) return '';
      return `<div class="people-group">
  <h3 class="people-group__label">${esc(roleLabel(ctx.lang, role, true))}</h3>
  <div class="people">${group.map((p) => personCard(p, ctx)).join('')}</div>
</div>`;
    })
    .filter(Boolean)
    .join('');
}

/**
 * One project card.
 *
 * @param {object} project Project.
 * @param {object} ctx     Rendering context.
 * @returns {string}
 */
export function projectCard(project, ctx) {
  const years = yearRange(project.start_year, project.end_year, ctx.lang);
  const status = project.status === 'completed' ? ctx.t.completed : ctx.t.ongoing;

  return `
<article class="card card--project">
  ${project.image ? `<a class="card__media" href="${esc(ctx.url.item('projects', project.id))}"><img src="${esc(project.image)}" alt="" loading="lazy" /></a>` : ''}
  <div class="card__body">
    <p class="card__badges">
      <span class="badge badge--${esc(project.status || 'ongoing')}">${esc(status)}</span>
      ${years ? `<span class="card__years">${esc(years)}</span>` : ''}
    </p>
    <h3 class="card__title"><a href="${esc(ctx.url.item('projects', project.id))}">${esc(project.title)}</a></h3>
    ${project.role ? `<p class="card__role">${esc(ctx.t.role)}: ${esc(project.role)}</p>` : ''}
    ${project.excerpt ? `<p class="card__text">${esc(project.excerpt)}</p>` : ''}
    ${project.funder ? `<p class="card__foot">${esc(project.funder)}</p>` : ''}
  </div>
</article>`.trim();
}

/**
 * One research theme card.
 *
 * @param {object} theme Theme.
 * @param {object} ctx   Rendering context.
 * @param {number} index Position, used for the numbering.
 * @returns {string}
 */
export function themeCard(theme, ctx, index = 0) {
  const href = ctx.url.item('themes', theme.id);
  return `
<article class="card card--theme">
  <a class="card__link" href="${esc(href)}">
    <span class="card__index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
    <h3 class="card__title">${esc(theme.title)}</h3>
    ${theme.excerpt ? `<p class="card__text">${esc(theme.excerpt)}</p>` : ''}
    <span class="card__cta">${esc(ctx.t.readMore)} ${icon('arrow')}</span>
  </a>
</article>`.trim();
}

/**
 * One tool, dataset or platform.
 *
 * These all point outwards — to a repository, a DOI, a running site — so the
 * card is the whole thing; there is no detail page behind it.
 *
 * @param {object} tool Tool entry.
 * @param {object} ctx  Rendering context.
 * @returns {string}
 */
export function toolCard(tool, ctx) {
  const kind = ctx.t.kinds[tool.kind] ?? tool.kind;
  const href = tool.doi ? `https://doi.org/${tool.doi}` : tool.url;
  const label = tool.kind === 'code' ? ctx.t.viewCode
    : tool.kind === 'dataset' ? ctx.t.viewDataset
    : ctx.t.openIt;

  const facts = [
    tool.year && esc(tool.year),
    tool.licence && esc(tool.licence),
    tool.publisher && esc(tool.publisher),
  ].filter(Boolean).join(' · ');

  return `
<article class="card card--tool">
  <div class="card__body">
    <p class="card__badges">
      <span class="badge badge--${esc(tool.kind)}">${esc(kind)}</span>
      ${facts ? `<span class="card__years">${facts}</span>` : ''}
    </p>
    <h3 class="card__title">${href ? `<a href="${esc(href)}" rel="noopener">${esc(tool.title)}</a>` : esc(tool.title)}</h3>
    ${tool.excerpt ? `<p class="card__text">${esc(tool.excerpt)}</p>` : ''}
    ${tool.doi ? `<p class="card__doi"><code>${esc(tool.doi)}</code></p>` : ''}
    ${href ? `<p class="chips"><a class="chip" href="${esc(href)}" rel="noopener">${icon(tool.kind === 'code' ? 'github' : 'link')}<span>${esc(label)}</span></a></p>` : ''}
  </div>
</article>`.trim();
}

/**
 * One news entry.
 *
 * @param {object} item News item.
 * @param {object} ctx  Rendering context.
 * @param {{full?: boolean}} [options] Show the whole body.
 * @returns {string}
 */
export function newsItem(item, ctx, { full = false } = {}) {
  const href = ctx.url.item('news', item.id);
  return `
<article class="news">
  <p class="news__date"><time datetime="${esc(item.date)}">${esc(formatDate(item.date, ctx.lang))}</time></p>
  <h3 class="news__title"><a href="${esc(href)}">${esc(item.title)}</a></h3>
  <div class="news__body">${full ? item.html : firstParagraph(item.html)}</div>
</article>`.trim();
}

/**
 * The row of profile icons.
 *
 * @param {object} ctx Rendering context.
 * @returns {string}
 */
export function profileLinks(ctx) {
  const { links, email } = ctx.site;
  const entries = [
    email && { href: `mailto:${email}`, icon: 'email', label: ctx.t.email },
    links.scholar && { href: links.scholar, icon: 'scholar', label: 'Google Scholar' },
    links.orcid && { href: links.orcid, icon: 'orcid', label: 'ORCID' },
    links.hal && { href: links.hal, icon: 'hal', label: 'HAL' },
    links.linkedin && { href: links.linkedin, icon: 'linkedin', label: 'LinkedIn' },
    links.github && { href: links.github, icon: 'github', label: 'GitHub' },
    links.bluesky && { href: links.bluesky, icon: 'bluesky', label: 'Bluesky' },
  ].filter(Boolean);

  if (!entries.length) return '';

  return `<p class="profile-links">${entries.map((e) => (
    `<a class="iconlink" href="${esc(e.href)}" rel="noopener" aria-label="${esc(e.label)}" title="${esc(e.label)}">${icon(e.icon)}</a>`
  )).join('')}</p>`;
}

/** Two-letter initials, for a person with no photo. */
function initials(name) {
  const parts = String(name ?? '').trim().split(/\s+/);
  if (!parts[0]) return '';
  const last = parts.length > 1 ? parts.at(-1)[0] : '';
  return (parts[0][0] + last).toUpperCase();
}

/** The first paragraph of some rendered HTML. */
function firstParagraph(html) {
  const match = /<p>[\s\S]*?<\/p>/.exec(html ?? '');
  return match ? match[0] : '';
}
