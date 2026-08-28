/**
 * Reading the content tree.
 *
 * Every piece of content is a Markdown file with YAML front matter, under
 * content/<language>/<collection>/. That is the whole data model: no database,
 * no build cache, and a shape the CMS can edit directly.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import yaml from 'js-yaml';
import { marked } from 'marked';

export const CONTENT_DIR = 'content';

marked.setOptions({ mangle: false, headerIds: false, breaks: false });

/**
 * Split a Markdown file into its front matter and its body.
 *
 * @param {string} raw File contents.
 * @returns {{data: object, body: string}}
 */
export function parseFrontMatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) return { data: {}, body: raw.trim() };

  let data = {};
  try {
    data = yaml.load(match[1]) || {};
  } catch (error) {
    throw new Error(`Invalid front matter: ${error.message}`);
  }
  return { data, body: (match[2] || '').trim() };
}

/**
 * Render a Markdown string to HTML.
 *
 * @param {string} md Markdown source.
 * @returns {string} HTML.
 */
export function markdown(md) {
  return md ? marked.parse(md).trim() : '';
}

/**
 * Render Markdown that must stay on one line — no wrapping <p>.
 *
 * @param {string} md Markdown source.
 * @returns {string} HTML.
 */
export function markdownInline(md) {
  return md ? marked.parseInline(md).trim() : '';
}

/**
 * Load every item in one collection, for one language.
 *
 * @param {string} lang       Language code.
 * @param {string} collection Directory name under the language.
 * @returns {object[]} Items, each with its front matter plus `body` and `html`.
 */
export function loadCollection(lang, collection) {
  const dir = join(CONTENT_DIR, lang, collection);
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => {
      const raw = readFileSync(join(dir, name), 'utf8');
      let parsed;
      try {
        parsed = parseFrontMatter(raw);
      } catch (error) {
        throw new Error(`${join(dir, name)}: ${error.message}`);
      }
      return {
        ...parsed.data,
        file: name,
        id: parsed.data.slug || parsed.data.key || basename(name, '.md'),
        body: parsed.body,
        html: markdown(parsed.body),
      };
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.id).localeCompare(String(b.id)));
}

/**
 * Load the pages for one language, keyed by their file name.
 *
 * @param {string} lang Language code.
 * @returns {Record<string, object>}
 */
export function loadPages(lang) {
  const pages = {};
  for (const page of loadCollection(lang, 'pages')) {
    pages[basename(page.file, '.md')] = page;
  }
  return pages;
}

/**
 * Load the site-wide settings.
 *
 * @returns {object}
 */
export function loadSite() {
  return JSON.parse(readFileSync('data/site.json', 'utf8'));
}

/**
 * Load the publications mirrored from HAL.
 *
 * Missing or unreadable data is not fatal: the site still builds, with an empty
 * publication list, rather than failing a deploy over an upstream hiccup.
 *
 * @returns {{fetched: string|null, items: object[]}}
 */
export function loadPublications() {
  const path = 'data/publications.json';
  if (!existsSync(path)) {
    console.warn('  ! data/publications.json is missing — run `npm run hal`');
    return { fetched: null, items: [] };
  }
  try {
    const data = JSON.parse(readFileSync(path, 'utf8'));
    return { fetched: data.fetched ?? null, items: data.items ?? [] };
  } catch (error) {
    console.warn(`  ! data/publications.json could not be read (${error.message})`);
    return { fetched: null, items: [] };
  }
}
