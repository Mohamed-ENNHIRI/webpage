/**
 * Small HTML helpers and the icon set.
 *
 * Icons are inline SVG rather than a font from a CDN, so a visitor's browser
 * never makes a third-party request — which is what CNIL guidance asks of a
 * French public-research site.
 */

/**
 * Escape text for use in HTML.
 *
 * @param {unknown} value Any value.
 * @returns {string}
 */
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Join class names, dropping anything falsy.
 *
 * @param {...(string|false|null|undefined)} names Candidate class names.
 * @returns {string}
 */
export function cls(...names) {
  return names.filter(Boolean).join(' ');
}

/**
 * Render a list of parts, dropping anything empty.
 *
 * @param {Array<string|false|null|undefined>} parts Fragments.
 * @param {string} separator Separator.
 * @returns {string}
 */
export function join(parts, separator = '') {
  return parts.filter(Boolean).join(separator);
}

const ICONS = {
  email: '<path d="M2 5.5A2.5 2.5 0 0 1 4.5 3h15A2.5 2.5 0 0 1 22 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 18.5v-13Zm2.2-.3 7.8 6.1 7.8-6.1H4.2Z"/>',
  scholar: '<path d="M12 2 1 8.5l11 6.5 9-5.3v6.8h2V8.5L12 2Zm-6 11.2v3.9c0 1.9 2.7 3.4 6 3.4s6-1.5 6-3.4v-3.9l-6 3.5-6-3.5Z"/>',
  orcid: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM8.4 6.2a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Zm.9 3.3v8.1H7.5V9.5h1.8Zm2.3 0h3.2c2.6 0 4.2 1.7 4.2 4s-1.6 4.1-4.2 4.1h-3.2V9.5Zm1.8 1.6v4.9h1.3c1.6 0 2.5-1 2.5-2.5s-.9-2.4-2.5-2.4h-1.3Z"/>',
  hal: '<path d="M3 4h3.2v6.1h5.6V4H15v16h-3.2v-6.6H6.2V20H3V4Zm14.2 0H21l-3.4 16h-3.2L17.2 4Z"/>',
  linkedin: '<path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM2.4 21V9.5h5.2V21H2.4Zm8 0V9.5h5v1.6c.7-1.2 2.1-1.9 3.8-1.9 3 0 4.8 1.9 4.8 5.5V21h-5.2v-5.5c0-1.5-.6-2.4-1.9-2.4-1.1 0-1.8.7-2.1 1.5-.1.3-.1.7-.1 1V21h-5.2Z"/>',
  github: '<path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.3-3.4-1.3-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 3 .8.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 4.9.4.3.7 1 .7 2v3c0 .3.2.6.7.5A10 10 0 0 0 12 2Z"/>',
  bluesky: '<path d="M12 10.8C10.9 8.6 7.9 4.6 5.2 2.7 2.6.9 1.6 1.2 1 1.5.2 1.9 0 3.1 0 3.8c0 .7.4 5.9.7 6.8.9 2.9 4 3.9 6.8 3.6h.4c-2.8.4-5.3 1.5-2 5.1 3.6 3.8 5-.8 5.7-3.2.7 2.4 1.5 6.8 5.6 3.2 3-3.3.8-4.6-2-5.1h.4c2.8.3 5.9-.7 6.8-3.6.3-.9.7-6.1.7-6.8 0-.7-.2-1.9-1-2.3-.6-.3-1.6-.6-4.2 1.2-2.7 1.9-5.7 5.9-6.9 8.1Z"/>',
  pdf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm-1 7V3.5L18.5 9H13Zm-4 3h6v2H9v-2Zm0 4h6v2H9v-2Z"/>',
  link: '<path d="M10.6 13.4a1 1 0 0 1 0-1.4l1.4-1.4a1 1 0 0 1 1.4 1.4l-1.4 1.4a1 1 0 0 1-1.4 0Zm-3 6a4.8 4.8 0 0 1 0-6.8l2.8-2.8 1.4 1.4-2.8 2.8a2.8 2.8 0 0 0 4 4l2.8-2.8 1.4 1.4-2.8 2.8a4.8 4.8 0 0 1-6.8 0Zm9.2-9.2-1.4-1.4 2.8-2.8a2.8 2.8 0 0 0-4-4L11.4 4.8 10 3.4l2.8-2.8a4.8 4.8 0 0 1 6.8 6.8l-2.8 2.8Z"/>',
  arrow: '<path d="M13.2 5.2 20 12l-6.8 6.8-1.4-1.4 4.4-4.4H4v-2h12.2l-4.4-4.4 1.4-1.4Z"/>',
  download: '<path d="M11 3h2v9.2l3.6-3.6 1.4 1.4-6 6-6-6 1.4-1.4L11 12.2V3ZM4 19h16v2H4v-2Z"/>',
  sun: '<path d="M12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-13.5V1h0v2.5Zm0 17V23v-2.5ZM3.5 12H1h2.5Zm19.5 0h-2.5H23ZM5.6 5.6 3.9 3.9l1.7 1.7Zm12.8 12.8 1.7 1.7-1.7-1.7Zm0-12.8 1.7-1.7-1.7 1.7ZM5.6 18.4l-1.7 1.7 1.7-1.7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  moon: '<path d="M21 13.2A9 9 0 1 1 10.8 3a7 7 0 0 0 10.2 10.2Z"/>',
  star: '<path d="m12 2.5 2.9 6.2 6.6.9-4.8 4.7 1.2 6.7L12 17.8 6.1 21l1.2-6.7-4.8-4.7 6.6-.9L12 2.5Z"/>',
};

/**
 * An inline SVG icon.
 *
 * @param {string} name Icon name.
 * @param {object} [options] Rendering options.
 * @param {string} [options.className] Extra class names.
 * @returns {string} SVG markup, or an empty string when unknown.
 */
export function icon(name, { className = '' } = {}) {
  const path = ICONS[name];
  if (!path) return '';
  return `<svg class="${cls('icon', `icon--${name}`, className)}" viewBox="0 0 24 24" `
    + `aria-hidden="true" focusable="false" fill="currentColor">${path}</svg>`;
}

/** Every icon name available, for validation in tests. */
export const ICON_NAMES = Object.keys(ICONS);

/**
 * Strip Markdown and tags down to plain text, for meta descriptions.
 *
 * @param {string} value Source text or HTML.
 * @param {number} limit Maximum length.
 * @returns {string}
 */
export function plain(value, limit = 180) {
  const text = String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[*_`#>[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).replace(/\s+\S*$/, '')}…`;
}

/**
 * Format an author list, marking the site owner.
 *
 * Names are compared with accents and punctuation removed, so "Ménézo" and
 * "Menezo" are the same person, and "M Thebault" matches "Martin Thebault".
 *
 * @param {string[]} authors   Author names in publication order.
 * @param {string} owner       The name to emphasise.
 * @returns {string} HTML.
 */
export function formatAuthors(authors, owner) {
  if (!Array.isArray(authors) || authors.length === 0) return '';
  const needle = normaliseName(owner);

  return authors
    .map((author) => {
      const name = String(author).trim();
      if (!name) return '';
      return namesMatch(name, needle)
        ? `<b class="author-self">${esc(name)}</b>`
        : esc(name);
    })
    .filter(Boolean)
    .join(', ');
}

/**
 * Strip accents, punctuation and case from a name.
 *
 * @param {string} name Raw name.
 * @returns {string}
 */
export function normaliseName(name) {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compare an author against an already-normalised name.
 *
 * @param {string} author Raw author name.
 * @param {string} needle Normalised name to look for.
 * @returns {boolean}
 */
export function namesMatch(author, needle) {
  const a = normaliseName(author);
  if (!a || !needle) return false;
  if (a === needle) return true;

  const want = needle.split(' ');
  const got = a.split(' ');
  if (want.length < 2 || got.length < 2) return false;

  const wantLast = want.at(-1);
  const wantFirst = want[0];
  let gotLast = got.at(-1);
  let gotFirst = got[0];

  // Accept "Thebault Martin" as well as "Martin Thebault".
  if (gotLast !== wantLast) {
    if (gotFirst !== wantLast) return false;
    [gotFirst, gotLast] = [gotLast, gotFirst];
  }

  return Boolean(gotFirst[0] && wantFirst[0] && gotFirst[0] === wantFirst[0]);
}
