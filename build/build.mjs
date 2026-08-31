/**
 * Build the static site into _site/.
 *
 * Reads the Markdown content tree and the HAL publication mirror, renders every
 * page in every language, and copies the static assets. No server, no database:
 * the output is plain HTML, CSS and JavaScript.
 */

import { mkdirSync, writeFileSync, cpSync, rmSync, renameSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { loadCollection, loadPages, loadSite, loadPublications, markdown } from './lib/content.mjs';
import { LANGUAGES, DEFAULT_LANGUAGE, t, formatDate, yearRange, roleLabel, pubTypeLabel } from './lib/i18n.mjs';
import { routesFor, outputPath } from './lib/routes.mjs';
import { esc, icon, plain, join as joinParts } from './lib/html.mjs';
import { layout } from './lib/layout.mjs';
import { columnChart, barChart } from './lib/charts.mjs';
import {
  sectionHeading, publicationList, publicationItem, personCard, peopleByRole,
  projectCard, themeCard, newsItem, profileLinks, publicationLinks, toolCard, personLinks,
} from './lib/components.mjs';

/*
 * Build into a scratch directory unique to this process, then swap it in. Two
 * builds running at once (a manual one and the dev server's watcher, say) must
 * not share the scratch path or they overwrite each other.
 */
const FINAL = '_site';
const OUT = `_site.tmp.${process.pid}`;
const written = [];

/**
 * Write one file into the output directory.
 *
 * @param {string} path     Path relative to the output root.
 * @param {string} contents File contents.
 */
function emit(path, contents) {
  const full = join(OUT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, contents);
  written.push(path);
}

/**
 * Assemble everything one language needs to render.
 *
 * @param {string} lang        Language code.
 * @param {object} site        Site settings.
 * @param {object[]} pubs      Publications merged with their extras.
 * @returns {object} Rendering context plus that language's content.
 */
function buildContext(lang, site, pubs) {
  const pages = loadPages(lang);
  const url = routesFor(lang, pages);

  return {
    lang,
    t: t(lang),
    site,
    pages,
    url,
    themes: loadCollection(lang, 'themes'),
    projects: loadCollection(lang, 'projects'),
    people: loadCollection(lang, 'people'),
    news: loadCollection(lang, 'news').sort((a, b) => String(b.date).localeCompare(String(a.date))),
    tools: loadCollection(lang, 'tools'),
    publications: pubs,
  };
}

/**
 * The same page's URL in every language, for hreflang and the switcher.
 *
 * @param {Record<string, object>} contexts All language contexts.
 * @param {Function} resolve One context to that page's URL, or null.
 * @returns {Record<string, string>}
 */
function alternatesFor(contexts, resolve) {
  const out = {};
  for (const [code, ctx] of Object.entries(contexts)) {
    const href = resolve(ctx);
    if (href) out[code] = href;
  }
  return out;
}

/* ------------------------------------------------------------------ pages */

/** The home page. */
function homePage(ctx, contexts) {
  const page = ctx.pages.home;
  const featured = ctx.publications.filter((p) => p.featured).slice(0, 5);
  const themes = ctx.themes.filter((th) => th.featured);
  const news = ctx.news.slice(0, 3);

  const body = `
<section class="hero">
  <div class="wrap hero__inner">
    <div class="hero__text">
      <p class="hero__eyebrow">${esc(ctx.site.languages[ctx.lang].position)} · LOCIE</p>
      <h1 class="hero__title">${esc(page.headline)}</h1>
      <p class="hero__lede">${esc(page.lede)}</p>
      ${profileLinks(ctx)}
    </div>
    <figure class="hero__viz">
      <div class="sunpath" data-sunpath data-lat="45.64" data-lon="5.87"
        data-tz="Europe/Paris"
        data-labels="${esc(JSON.stringify({
          now: ctx.t.sunNow, atLab: ctx.t.sunAtLab, below: ctx.t.sunBelow,
          height: ctx.t.sunHeight, bearing: ctx.t.sunBearing, compass: ctx.t.compass,
        }))}">
        <canvas class="sunpath__canvas" role="img"
          aria-label="${esc(ctx.t.sunPathTitle)}"></canvas>
        <div class="sunpath__now" data-sunpath-now hidden>
          <p class="sunpath__now-label"></p>
          <p class="sunpath__now-value"></p>
        </div>
      </div>
      <figcaption class="hero__caption">
        <strong>${esc(ctx.t.sunPathTitle)}.</strong> ${esc(ctx.t.sunPathCaption)}
      </figcaption>
    </figure>
  </div>
</section>

<div class="wrap">
  ${news.length ? `<section class="section">
    ${sectionHeading(ctx.t.latestNews, { href: ctx.url.page('news'), label: ctx.t.allNews })}
    <div class="news-list">${news.map((n) => newsItem(n, ctx)).join('')}</div>
  </section>` : ''}

  ${themes.length ? `<section class="section">
    ${sectionHeading(ctx.t.research, { href: ctx.url.page('research'), label: ctx.pages.research.title })}
    <div class="grid grid--themes">${themes.map((th, i) => themeCard(th, ctx, i)).join('')}</div>
  </section>` : ''}

  ${featured.length ? `<section class="section">
    ${sectionHeading(ctx.t.selectedPublications, { href: ctx.url.page('publications'), label: ctx.t.allPublications })}
    ${publicationList(featured, ctx, { groupByYear: false })}
  </section>` : ''}
</div>`;

  return {
    url: ctx.url.page('home'),
    title: page.title,
    description: plain(page.lede),
    body,
    home: true,
    bodyClass: 'page-home',
    alternates: alternatesFor(contexts, (c) => c.url.page('home')),
  };
}

/** A simple list page built from a collection. */
function listPage(ctx, contexts, key, inner, bodyClass = '') {
  const page = ctx.pages[key];
  return {
    url: ctx.url.page(key),
    title: page.title,
    description: plain(page.lede || page.title),
    bodyClass,
    body: `<div class="wrap">
  <header class="page-head">
    <h1 class="page-head__title">${esc(page.title)}</h1>
    ${page.lede ? `<p class="page-head__lede">${esc(page.lede)}</p>` : ''}
  </header>
  ${inner}
</div>`,
    alternates: alternatesFor(contexts, (c) => c.url.page(key)),
  };
}

/** A detail page for one item in a collection. */
function detailPage(ctx, contexts, collection, item, inner, { title, description }) {
  const backKey = { themes: 'research', projects: 'projects', people: 'team', news: 'news' }[collection];
  return {
    url: ctx.url.item(collection, item.id),
    title,
    description,
    bodyClass: `page-detail page-${collection}`,
    body: `<div class="wrap wrap--narrow">
  <a class="back-link" href="${esc(ctx.url.page(backKey))}">${icon('arrow', { className: 'icon--back' })} ${esc(ctx.pages[backKey].title)}</a>
  ${inner}
</div>`,
    alternates: alternatesFor(contexts, (c) => {
      const exists = c[collection]?.some((other) => other.id === item.id);
      return exists ? c.url.item(collection, item.id) : null;
    }),
  };
}

/* ------------------------------------------------------------------- main */

function main() {
  const started = Date.now();
  const site = loadSite();

  const { items: rawPubs, fetched } = loadPublications();
  const openalex = existsSync('data/openalex.json')
    ? JSON.parse(readFileSync('data/openalex.json', 'utf8'))
    : null;
  const extras = existsSync('data/publication-extras.json')
    ? JSON.parse(readFileSync('data/publication-extras.json', 'utf8'))
    : {};

  // HAL owns the bibliographic fields; the extras file owns everything else.
  const publications = rawPubs.map((pub) => ({ ...pub, ...(extras[pub.id] ?? {}) }));

  const contexts = {};
  for (const lang of LANGUAGES) {
    contexts[lang] = buildContext(lang, site, publications);
    contexts[lang].openalex = openalex;
  }

  if (existsSync(OUT)) rmSync(OUT, { recursive: true });
  mkdirSync(OUT, { recursive: true });

  for (const lang of LANGUAGES) {
    const ctx = contexts[lang];
    const pages = [];

    pages.push(homePage(ctx, contexts));

    // Research
    pages.push(listPage(ctx, contexts, 'research',
      `<div class="grid grid--themes">${ctx.themes.map((th, i) => themeCard(th, ctx, i)).join('')}</div>`));

    for (const theme of ctx.themes) {
      const related = ctx.publications.filter((p) => (p.themes ?? []).includes(theme.key));
      const projects = ctx.projects.filter((p) => (p.themes ?? []).includes(theme.key));
      pages.push(detailPage(ctx, contexts, 'themes', theme, `
  <article class="prose">
    <h1>${esc(theme.title)}</h1>
    ${theme.excerpt ? `<p class="lede">${esc(theme.excerpt)}</p>` : ''}
    ${theme.image ? `<img class="prose__figure" src="${esc(theme.image)}" alt="" loading="lazy" />` : ''}
    ${theme.html}
  </article>
  ${related.length ? `<section class="section">${sectionHeading(ctx.t.onThisTheme)}${publicationList(related, ctx, { groupByYear: false })}</section>` : ''}
  ${projects.length ? `<section class="section">${sectionHeading(ctx.t.projectsOnTheme)}<div class="grid grid--projects">${projects.map((p) => projectCard(p, ctx)).join('')}</div></section>` : ''}`,
        { title: theme.title, description: plain(theme.excerpt || theme.body) }));
    }

    // Projects
    pages.push(listPage(ctx, contexts, 'projects',
      `<div class="grid grid--projects">${ctx.projects.map((p) => projectCard(p, ctx)).join('')}</div>`));

    for (const project of ctx.projects) {
      const facts = [
        project.role && [ctx.t.role, esc(project.role)],
        project.funder && [ctx.t.funding, esc(project.funder)],
        project.partners?.length && [ctx.t.partners, project.partners.map(esc).join('<br />')],
      ].filter(Boolean);

      pages.push(detailPage(ctx, contexts, 'projects', project, `
  <article class="prose">
    <p class="detail-badges">
      <span class="badge badge--${esc(project.status || 'ongoing')}">${esc(project.status === 'completed' ? ctx.t.completed : ctx.t.ongoing)}</span>
      ${yearRange(project.start_year, project.end_year, ctx.lang) ? `<span class="card__years">${esc(yearRange(project.start_year, project.end_year, ctx.lang))}</span>` : ''}
    </p>
    <h1>${esc(project.title)}</h1>
    ${project.excerpt ? `<p class="lede">${esc(project.excerpt)}</p>` : ''}
    ${facts.length ? `<dl class="deflist">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>` : ''}
    ${project.html}
    ${project.url ? `<p class="chips"><a class="chip" href="${esc(project.url)}" rel="noopener">${icon('link')}<span>${esc(ctx.t.projectWebsite)}</span></a></p>` : ''}
  </article>`,
        { title: project.title, description: plain(project.excerpt || project.body) }));
    }

    // Publications
    pages.push(listPage(ctx, contexts, 'publications',
      citationCharts(ctx)
      + publicationList(ctx.publications, ctx, { groupByYear: true, filters: true, showAbstract: true }),
      'page-publications'));

    // Tools, datasets and platforms
    pages.push(listPage(ctx, contexts, 'tools',
      ctx.tools.length
        ? `<div class="grid grid--projects">${ctx.tools.map((t) => toolCard(t, ctx)).join('')}</div>`
        : `<p class="empty">${esc(ctx.t.nothingYet)}</p>`));

    // Team
    const current = ctx.people.filter((p) => !p.alumni);
    const alumni = ctx.people.filter((p) => p.alumni);
    pages.push(listPage(ctx, contexts, 'team', `
  ${peopleByRole(current, ctx)}
  ${alumni.length ? `<section class="section">${sectionHeading(ctx.t.formerMembers)}<div class="people">${alumni.map((p) => personCard(p, ctx)).join('')}</div></section>` : ''}`));

    for (const person of ctx.people) {
      const related = ctx.publications.filter((p) => (p.authors ?? []).some((a) => sameName(a, person.name)));
      pages.push(detailPage(ctx, contexts, 'people', person, `
  <article class="prose person-detail">
    ${person.photo ? `<img class="person-detail__photo" src="${esc(person.photo)}" alt="" width="140" height="140" />` : ''}
    <h1>${esc(person.name)}</h1>
    <p class="person__role">${esc(joinParts([person.role_custom || roleLabel(ctx.lang, person.role), yearRange(person.start_year, person.end_year, ctx.lang)], ' · '))}</p>
    ${person.topic ? `<p class="lede">${esc(person.topic)}</p>` : ''}
    ${person.cosupervisors ? `<p class="person__note">${esc(ctx.t.coSupervised)} ${esc(person.cosupervisors)}</p>` : ''}
    ${person.alumni && person.current_position ? `<p class="person__note">${esc(ctx.t.nowAt)}: ${esc(person.current_position)}</p>` : ''}
    ${personLinks(person, ctx)}
    ${person.html}
  </article>
  ${related.length ? `<section class="section">${sectionHeading(ctx.pages.publications.title)}${publicationList(related, ctx, { groupByYear: false })}</section>` : ''}`,
        {
          title: person.name,
          // Without a stated topic, say who they are rather than repeat the name.
          description: plain(
            person.topic
            || `${person.name}, ${roleLabel(ctx.lang, person.role)}, ${ctx.site.languages[ctx.lang].affiliation}`,
          ),
        }));
    }

    // News
    pages.push(listPage(ctx, contexts, 'news',
      ctx.news.length
        ? `<div class="news-list news-list--full">${ctx.news.map((n) => newsItem(n, ctx)).join('')}</div>`
        : `<p class="empty">${esc(ctx.t.nothingYet)}</p>`));

    for (const item of ctx.news) {
      pages.push(detailPage(ctx, contexts, 'news', item, `
  <article class="prose">
    <p class="news__date"><time datetime="${esc(item.date)}">${esc(formatDate(item.date, ctx.lang))}</time></p>
    <h1>${esc(item.title)}</h1>
    ${item.image ? `<img class="prose__figure" src="${esc(item.image)}" alt="" loading="lazy" />` : ''}
    ${item.html}
  </article>`,
        { title: item.title, description: plain(item.body) }));
    }

    // Contact
    const profile = ctx.site.languages[ctx.lang];
    pages.push(listPage(ctx, contexts, 'contact', `
  <div class="contact">
    <div class="contact__block">
      <h2 class="contact__label">${esc(ctx.t.email)}</h2>
      <p><a href="mailto:${esc(ctx.site.email)}">${esc(ctx.site.email)}</a></p>
      ${profileLinks(ctx)}
    </div>
    <div class="contact__block">
      <h2 class="contact__label">${esc(ctx.t.address)}</h2>
      <p>${esc(profile.address).replace(/\n/g, '<br />')}</p>
    </div>
  </div>`));

    for (const page of pages) {
      emit(outputPath(page.url), layout({ ctx, ...page }));
    }

    emit(`${ctx.url.prefix}/news/feed.xml`.replace(/^\//, ''), feed(ctx));
  }

  // Root-level files.
  emit('404.html', notFound(contexts[DEFAULT_LANGUAGE], contexts));
  emit('sitemap.xml', sitemap(site, written));
  emit('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: https://${site.domain}/sitemap.xml\n`);
  emit('CNAME', `${site.domain}\n`);
  emit('.nojekyll', '');

  for (const dir of ['css', 'js', 'fonts', 'img']) {
    const from = join('static', dir);
    if (existsSync(from)) cpSync(from, join(OUT, dir), { recursive: true });
  }
  if (existsSync('static/favicon.svg')) cpSync('static/favicon.svg', join(OUT, 'favicon.svg'));
  // Images added through GitHub. The folder's own README is a note to the
  // person uploading, not part of the site, so it stays behind.
  if (existsSync('uploads')) {
    cpSync('uploads', join(OUT, 'uploads'), {
      recursive: true,
      filter: (src) => !src.endsWith('.md'),
    });
  }

  // Swap the finished build in, then clear the old one away.
  const previous = `${FINAL}.old.${process.pid}`;
  if (existsSync(FINAL)) renameSync(FINAL, previous);
  renameSync(OUT, FINAL);
  if (existsSync(previous)) rmSync(previous, { recursive: true });

  const html = written.filter((p) => p.endsWith('.html')).length;
  console.log(`Built ${html} pages in ${Date.now() - started} ms`);
  console.log(`  languages   ${LANGUAGES.join(', ')}`);
  console.log(`  publications ${publications.length}${fetched ? ` (HAL, ${fetched.slice(0, 10)})` : ''}`);
}

/**
 * The three charts above the publication list.
 *
 * Drawn from OpenAlex, which records what the literature did with the work.
 * Absent that file the section simply does not appear.
 *
 * @param {object} ctx Rendering context.
 * @returns {string}
 */
function citationCharts(ctx) {
  const data = ctx.openalex;
  if (!data?.byYear?.length) return '';

  const thisYear = new Date().getFullYear();
  const region = new Intl.DisplayNames([ctx.lang], { type: 'region' });

  const citations = data.byYear.map((row) => ({
    label: row.year,
    value: row.citations,
    // A year still in progress is drawn back, so nobody reads it as a fall.
    note: row.year >= thisYear ? ctx.t.chartCitationsNote : '',
  }));

  const works = data.byYear.map((row) => ({ label: row.year, value: row.works }));

  const countries = data.countries.filter((c) => c.count >= 2).map((c) => {
    let name = c.code;
    try {
      name = region.of(c.code) ?? c.code;
    } catch { /* an unknown code keeps its two letters */ }
    return { label: name, value: c.count };
  });

  return `<section class="section charts">
  ${columnChart({ id: 'cit', data: citations, unit: ctx.t.citations,
    title: ctx.t.chartCitations, caption: ctx.t.chartCitationsNote })}
  ${columnChart({ id: 'wrk', data: works, unit: ctx.t.worksUnit,
    title: ctx.t.chartWorks, caption: ctx.t.chartWorksNote })}
  ${barChart({ id: 'ctr', data: countries, unit: ctx.t.worksWith,
    title: ctx.t.chartCountries, caption: `${ctx.t.chartCountriesNote} ${ctx.t.chartTail}` })}
</section>`;
}

/** Whether two names refer to the same person, ignoring accents and initials. */
function sameName(a, b) {
  const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  const x = norm(a).split(' ');
  const y = norm(b).split(' ');
  if (x.length < 2 || y.length < 2) return false;
  return x.at(-1) === y.at(-1) && x[0][0] === y[0][0];
}

/** The 404 page, served by GitHub Pages for any unknown path. */
function notFound(ctx, contexts) {
  return layout({
    ctx,
    title: ctx.t.notFoundTitle,
    description: ctx.t.notFoundBody,
    url: '/404.html',
    alternates: {},
    bodyClass: 'page-404',
    body: `<div class="wrap wrap--narrow">
  <article class="prose">
    <h1>${esc(ctx.t.notFoundTitle)}</h1>
    <p class="lede">${esc(ctx.t.notFoundBody)}</p>
    <p><a class="chip" href="/">${icon('arrow')}<span>${esc(ctx.pages.home.title)}</span></a></p>
  </article>
</div>`,
  });
}

/** An RSS feed of the news, per language. */
function feed(ctx) {
  const items = ctx.news.slice(0, 20).map((item) => `
    <item>
      <title>${esc(item.title)}</title>
      <link>https://${ctx.site.domain}${ctx.url.item('news', item.id)}</link>
      <guid isPermaLink="true">https://${ctx.site.domain}${ctx.url.item('news', item.id)}</guid>
      <pubDate>${new Date(item.date).toUTCString()}</pubDate>
      <description>${esc(plain(item.body, 400))}</description>
    </item>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>${esc(ctx.site.name)} · ${esc(ctx.pages.news.title)}</title>
  <link>https://${ctx.site.domain}${ctx.url.page('news')}</link>
  <description>${esc(ctx.site.languages[ctx.lang].position)}</description>
  <language>${esc(ctx.lang)}</language>${items}
</channel></rss>
`;
}

/** A sitemap listing every page that was written. */
function sitemap(site, paths) {
  const urls = paths
    .filter((p) => p.endsWith('index.html'))
    .map((p) => `/${p.replace(/index\.html$/, '')}`)
    .sort()
    .map((u) => `  <url><loc>https://${site.domain}${u}</loc></url>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

main();
