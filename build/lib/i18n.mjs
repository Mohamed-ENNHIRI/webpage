/**
 * Interface strings, and which languages the site is built in.
 *
 * These are labels the site itself needs — "Journal articles", "Read more" —
 * as distinct from content, which lives in Markdown. Keeping them here rather
 * than in the CMS means Martin is never asked to translate a button.
 */

import { readFileSync } from 'node:fs';

/*
 * The default language sits at the site root; the other lives under its own
 * prefix. Both are read from data/site.json so the choice is made in one place,
 * outside the code.
 */
const site = JSON.parse(readFileSync('data/site.json', 'utf8'));

export const DEFAULT_LANGUAGE = site.default_language ?? 'fr';

/** Default first: that order drives the URL layout and the switcher. */
export const LANGUAGES = [
  DEFAULT_LANGUAGE,
  ...Object.keys(site.languages).filter((code) => code !== DEFAULT_LANGUAGE),
];

const STRINGS = {
  en: {
    skipToContent: 'Skip to content',
    menu: 'Menu',
    language: 'Language',
    theme: 'Switch between light and dark',

    selectedPublications: 'Selected publications',
    allPublications: 'All publications',
    latestNews: 'News',
    allNews: 'All news',
    research: 'Research',
    readMore: 'Read more',
    backTo: 'Back to',

    filterLabel: 'Show',
    filterAll: 'Everything',
    abstract: 'Abstract',
    publicationsFrom: 'Read from HAL',
    lastUpdated: 'last updated',

    pubTypes: {
      article: ['Journal article', 'Journal articles'],
      chapter: ['Book chapter', 'Book chapters'],
      book: ['Book', 'Books'],
      conference: ['Conference paper', 'Conference papers'],
      poster: ['Poster', 'Posters'],
      report: ['Report', 'Reports'],
      thesis: ['Thesis', 'Theses'],
      hdr: ['Habilitation (HDR)', 'Habilitation (HDR)'],
      preprint: ['Preprint', 'Preprints'],
      other: ['Other', 'Other publications'],
    },

    roles: {
      pi: ['Principal investigator', 'Principal investigator'],
      postdoc: ['Postdoctoral researcher', 'Postdoctoral researchers'],
      phd: ['PhD student', 'PhD students'],
      engineer: ['Research engineer', 'Research engineers'],
      master: ['Master student', 'Master students'],
      collaborator: ['Collaborator', 'Collaborators'],
    },

    formerMembers: 'Former members',
    coSupervised: 'Co-supervised with',
    nowAt: 'Now',
    role: 'Role',
    funding: 'Funding',
    partners: 'Partners',
    projectWebsite: 'Project website',
    ongoing: 'Ongoing',
    completed: 'Completed',
    present: 'present',

    onThisTheme: 'Publications on this theme',
    projectsOnTheme: 'Projects on this theme',
    address: 'Address',
    email: 'Email',
    nothingYet: 'Nothing here yet.',

    sunPathTitle: 'The sun over Le Bourget-du-Lac',
    sunPathCaption: 'Where the sun stands in the sky through the year, at the latitude of the laboratory. Every curve is one month; the marked path is today. This geometry is where all of the work below begins.',
    sunPathToday: 'today',

    kinds: { platform: 'Platform', code: 'Code', dataset: 'Dataset' },
    openIt: 'Open',
    viewCode: 'Source code',
    viewDataset: 'Dataset',
    sunPathSummer: 'June solstice',
    sunPathWinter: 'December solstice',

    notFoundTitle: 'This page does not exist',
    notFoundBody: 'The address may have changed. Start again from the home page.',
  },

  fr: {
    skipToContent: 'Aller au contenu',
    menu: 'Menu',
    language: 'Langue',
    theme: 'Basculer entre le thème clair et sombre',

    selectedPublications: 'Publications choisies',
    allPublications: 'Toutes les publications',
    latestNews: 'Actualités',
    allNews: 'Toutes les actualités',
    research: 'Recherche',
    readMore: 'En savoir plus',
    backTo: 'Retour à',

    filterLabel: 'Afficher',
    filterAll: 'Tout',
    abstract: 'Résumé',
    publicationsFrom: 'Lu dans HAL',
    lastUpdated: 'mis à jour le',

    pubTypes: {
      article: ['Article de revue', 'Articles de revue'],
      chapter: ['Chapitre d’ouvrage', 'Chapitres d’ouvrage'],
      book: ['Ouvrage', 'Ouvrages'],
      conference: ['Communication', 'Communications'],
      poster: ['Poster', 'Posters'],
      report: ['Rapport', 'Rapports'],
      thesis: ['Thèse', 'Thèses'],
      hdr: ['Habilitation (HDR)', 'Habilitation (HDR)'],
      preprint: ['Prépublication', 'Prépublications'],
      other: ['Autre', 'Autres publications'],
    },

    roles: {
      pi: ['Responsable scientifique', 'Responsable scientifique'],
      postdoc: ['Chercheur postdoctoral', 'Chercheurs postdoctoraux'],
      phd: ['Doctorant', 'Doctorants'],
      engineer: ['Ingénieur de recherche', 'Ingénieurs de recherche'],
      master: ['Étudiant en master', 'Étudiants en master'],
      collaborator: ['Collaborateur', 'Collaborateurs'],
    },

    formerMembers: 'Anciens membres',
    coSupervised: 'Co-encadrement avec',
    nowAt: 'Aujourd’hui',
    role: 'Rôle',
    funding: 'Financement',
    partners: 'Partenaires',
    projectWebsite: 'Site du projet',
    ongoing: 'En cours',
    completed: 'Terminé',
    present: 'aujourd’hui',

    onThisTheme: 'Publications sur cet axe',
    projectsOnTheme: 'Projets sur cet axe',
    address: 'Adresse',
    email: 'Courriel',
    nothingYet: 'Rien pour l’instant.',

    sunPathTitle: 'Le soleil au Bourget-du-Lac',
    sunPathCaption: 'La position du soleil dans le ciel au fil de l’année, à la latitude du laboratoire. Chaque courbe est un mois ; le tracé marqué est celui d’aujourd’hui. C’est de cette géométrie que partent tous les travaux ci-dessous.',
    sunPathToday: 'aujourd’hui',

    kinds: { platform: 'Plateforme', code: 'Code', dataset: 'Jeu de données' },
    openIt: 'Ouvrir',
    viewCode: 'Code source',
    viewDataset: 'Jeu de données',
    sunPathSummer: 'solstice de juin',
    sunPathWinter: 'solstice de décembre',

    notFoundTitle: 'Cette page n’existe pas',
    notFoundBody: 'L’adresse a peut-être changé. Reprenez depuis la page d’accueil.',
  },
};

/**
 * The string table for one language.
 *
 * @param {string} lang Language code.
 * @returns {object}
 */
export function t(lang) {
  return STRINGS[lang] ?? STRINGS[DEFAULT_LANGUAGE];
}

/**
 * Label for a publication type.
 *
 * @param {string} lang   Language code.
 * @param {string} type   Type slug.
 * @param {boolean} plural Use the plural form.
 * @returns {string}
 */
export function pubTypeLabel(lang, type, plural = false) {
  const table = t(lang).pubTypes;
  const entry = table[type] ?? table.other;
  return entry[plural ? 1 : 0];
}

/**
 * Label for a team role.
 *
 * @param {string} lang    Language code.
 * @param {string} role    Role slug.
 * @param {boolean} plural Use the plural form.
 * @returns {string}
 */
export function roleLabel(lang, role, plural = false) {
  const entry = t(lang).roles[role];
  return entry ? entry[plural ? 1 : 0] : '';
}

/** Order in which publication types are listed. */
export const PUB_TYPE_ORDER = [
  'article', 'chapter', 'book', 'conference',
  'poster', 'report', 'thesis', 'hdr', 'preprint', 'other',
];

/** Order in which team roles are listed. */
export const ROLE_ORDER = ['pi', 'postdoc', 'phd', 'engineer', 'master', 'collaborator'];

/**
 * Format a date for display, in the language's own convention.
 *
 * @param {string} iso  ISO date string.
 * @param {string} lang Language code.
 * @returns {string}
 */
export function formatDate(iso, lang) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);
  return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    year: 'numeric',
    month: 'long',
  }).format(date);
}

/**
 * Build a year range label such as "2021–2024" or "2021–present".
 *
 * @param {string|number} start Start year.
 * @param {string|number} end   End year, empty when ongoing.
 * @param {string} lang         Language code.
 * @returns {string}
 */
export function yearRange(start, end, lang) {
  const from = String(start ?? '').trim();
  const to = String(end ?? '').trim();
  if (!from && !to) return '';
  if (!to) return `${from}–${t(lang).present}`;
  if (!from || from === to) return from || to;
  return `${from}–${to}`;
}
