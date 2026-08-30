/**
 * The page shell: head, header, footer.
 *
 * Everything a page needs that is not its own content — metadata, navigation,
 * the language switcher and the theme toggle.
 */

import { esc, icon, cls } from './html.mjs';
import { LANGUAGES } from './i18n.mjs';

/** Pages that appear in the navigation, in order. */
const NAV_KEYS = ['research', 'projects', 'publications', 'tools', 'team', 'news', 'contact'];

/**
 * Render a complete HTML document.
 *
 * @param {object} options Page options.
 * @param {object} options.ctx         Rendering context.
 * @param {string} options.title       Page title, without the site name.
 * @param {string} options.description Meta description.
 * @param {string} options.body        Main content HTML.
 * @param {string} options.url         This page's own URL.
 * @param {Record<string,string>} [options.alternates] Same page in other languages.
 * @param {string} [options.bodyClass] Extra class on <body>.
 * @param {boolean} [options.home]     Whether this is the home page.
 * @returns {string} A full HTML document.
 */
export function layout({ ctx, title, description, body, url, alternates = {}, bodyClass = '', home = false }) {
  const { site, lang, t } = ctx;
  const profile = site.languages[lang];
  const fullTitle = home ? `${site.name} — ${profile.position}` : `${title} — ${site.name}`;
  const canonical = `https://${site.domain}${url}`;

  const hreflang = Object.entries(alternates)
    .map(([code, href]) => `<link rel="alternate" hreflang="${esc(code)}" href="https://${esc(site.domain)}${esc(href)}" />`)
    .join('\n  ');

  return `<!doctype html>
<html lang="${esc(lang)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(fullTitle)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${esc(canonical)}" />
  ${hreflang}
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${esc(fullTitle)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${esc(canonical)}" />
  <meta property="og:locale" content="${lang === 'fr' ? 'fr_FR' : 'en_GB'}" />
  <meta name="twitter:card" content="summary" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="alternate" type="application/rss+xml" title="${esc(site.name)}" href="${esc(ctx.url.prefix)}/news/feed.xml" />
  <link rel="preload" href="/fonts/inter-latin-400.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/fonts/inter-latin-600.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="stylesheet" href="/css/site.css" />
  <script>
    // Applied before first paint so the page never flashes the wrong theme.
    (function () {
      try {
        var saved = localStorage.getItem('theme');
        if (saved === 'light' || saved === 'dark') {
          document.documentElement.dataset.theme = saved;
        }
      } catch (e) {}
    })();
  </script>
</head>
<body class="${cls(bodyClass)}">
  <a class="skip-link" href="#main">${esc(t.skipToContent)}</a>
  ${header(ctx, url, alternates)}
  <main id="main" class="main">
${body}
  </main>
  ${footer(ctx)}
  <script src="/js/site.js" defer></script>
</body>
</html>
`;
}

/**
 * The site header: wordmark, navigation, language switcher, theme toggle.
 *
 * @param {object} ctx        Rendering context.
 * @param {string} current    The current page URL.
 * @param {Record<string,string>} alternates Same page in other languages.
 * @returns {string}
 */
function header(ctx, current, alternates) {
  const { site, lang, t, pages, url } = ctx;

  const nav = NAV_KEYS
    .filter((key) => pages[key])
    .map((key) => {
      const href = url.page(key);
      const active = current === href || (href !== url.page('home') && current.startsWith(href));
      return `<a class="nav__link${active ? ' is-active' : ''}"${active ? ' aria-current="page"' : ''} href="${esc(href)}">${esc(pages[key].nav || pages[key].title)}</a>`;
    })
    .join('');

  const langLinks = LANGUAGES.map((code) => {
    const href = code === lang ? current : alternates[code];
    if (!href) return '';
    return code === lang
      ? `<span class="lang__item is-current" aria-current="true">${esc(code.toUpperCase())}</span>`
      : `<a class="lang__item" href="${esc(href)}" lang="${esc(code)}" hreflang="${esc(code)}">${esc(code.toUpperCase())}</a>`;
  }).filter(Boolean).join('<span class="lang__sep" aria-hidden="true">/</span>');

  return `<header class="header">
    <div class="header__inner wrap">
      <a class="wordmark" href="${esc(url.page('home'))}">
        <span class="wordmark__name">${esc(site.name)}</span>
      </a>

      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="${esc(ctx.t.menu)}">
        <span class="nav-toggle__bar"></span><span class="nav-toggle__bar"></span>
      </button>

      <nav class="nav" id="site-nav" aria-label="${esc(ctx.t.menu)}">
        ${nav}
        <div class="header__tools">
          <nav class="lang" aria-label="${esc(t.language)}">${langLinks}</nav>
          <button class="theme-toggle" type="button" aria-label="${esc(t.theme)}" title="${esc(t.theme)}">
            ${icon('sun', { className: 'theme-toggle__sun' })}${icon('moon', { className: 'theme-toggle__moon' })}
          </button>
        </div>
      </nav>
    </div>
  </header>`;
}

/**
 * The site footer.
 *
 * @param {object} ctx Rendering context.
 * @returns {string}
 */
function footer(ctx) {
  const { site, lang } = ctx;
  const profile = site.languages[lang];
  const address = esc(profile.address).replace(/\n/g, '<br />');

  return `<footer class="footer">
    <div class="wrap footer__inner">
      <div class="footer__block">
        <p class="footer__name">${esc(site.name)}</p>
        <p class="footer__line">${esc(profile.position)}</p>
        <p class="footer__line">${esc(profile.affiliation)}</p>
      </div>
      <div class="footer__block">
        <p class="footer__line">${address}</p>
      </div>
      <div class="footer__block footer__block--links">
        ${profileLinksFooter(ctx)}
        <p class="footer__fine">© ${new Date().getFullYear()} ${esc(site.name)}</p>
      </div>
    </div>
  </footer>`;
}

/** The icon row in the footer. Imported lazily to avoid a circular import. */
function profileLinksFooter(ctx) {
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

  return `<p class="profile-links">${entries.map((e) => (
    `<a class="iconlink" href="${esc(e.href)}" rel="noopener" aria-label="${esc(e.label)}" title="${esc(e.label)}">${icon(e.icon)}</a>`
  )).join('')}</p>`;
}
