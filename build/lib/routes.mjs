/**
 * URL construction.
 *
 * The default language sits at the root and the other under its own prefix:
 * /research/ and /fr/recherche/. Page slugs come from each page's front matter,
 * so the French URLs read as French rather than as translated English.
 */

import { DEFAULT_LANGUAGE } from './i18n.mjs';

/** Collections that get a page of their own per item. */
export const DETAIL_COLLECTIONS = {
  themes: 'research',
  projects: 'projects',
  people: 'team',
  news: 'news',
};

/**
 * Build the URL helpers for one language.
 *
 * @param {string} lang  Language code.
 * @param {object} pages Pages for that language, keyed by file name.
 * @returns {{ prefix: string, page: Function, item: Function, asset: Function }}
 */
export function routesFor(lang, pages) {
  const prefix = lang === DEFAULT_LANGUAGE ? '' : `/${lang}`;

  /**
   * URL of a top-level page.
   *
   * @param {string} key Page key, e.g. "research". "home" gives the root.
   * @returns {string}
   */
  const page = (key) => {
    if (key === 'home') return `${prefix}/`;
    const slug = pages[key]?.slug || key;
    return `${prefix}/${slug}/`;
  };

  /**
   * URL of a single item inside a collection.
   *
   * @param {string} collection Collection name, e.g. "themes".
   * @param {string} id         Item identifier.
   * @returns {string}
   */
  const item = (collection, id) => {
    const pageKey = DETAIL_COLLECTIONS[collection];
    if (!pageKey) return `${prefix}/`;
    const slug = pages[pageKey]?.slug || pageKey;
    return `${prefix}/${slug}/${id}/`;
  };

  /**
   * URL of a static asset. Always absolute from the site root.
   *
   * @param {string} path Path under /static or the site root.
   * @returns {string}
   */
  const asset = (path) => `/${String(path).replace(/^\/+/, '')}`;

  return { prefix, page, item, asset };
}

/**
 * Turn a site-absolute URL into the file path it is written to.
 *
 * @param {string} url URL such as "/fr/recherche/".
 * @returns {string} Path such as "fr/recherche/index.html".
 */
export function outputPath(url) {
  const clean = url.replace(/^\/+/, '').replace(/\/+$/, '');
  return clean ? `${clean}/index.html` : 'index.html';
}
