/**
 * Contrôle la prose du site contre les règles d'écriture.
 *
 * Refusé : tirets longs, points-virgules, et une liste de mots anglais.
 * Signalé sans être refusé : les phrases de plus de 32 mots.
 *
 * Les pages sont du HTML. Le script en retire les commentaires, les scripts,
 * les styles, les icônes et les balises, et ne lit que le texte visible.
 *
 * Les publications échappent au contrôle : elles ne sont pas dans les pages,
 * elles viennent de HAL. Leurs titres appartiennent au dossier publié, et les
 * réécrire fausserait la référence.
 *
 * La liste de mots interdits est anglaise, elle ne s'applique donc qu'à en/.
 * Les règles de ponctuation valent pour les deux langues.
 *
 *   node tools/style-check.mjs
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const BANNED = ['can', 'may', 'just', 'that', 'very', 'really', 'literally', 'actually',
  'certainly', 'probably', 'basically', 'could', 'maybe', 'delve', 'embark', 'enlightening',
  'esteemed', 'craft', 'crafting', 'imagine', 'realm', 'unlock', 'discover', 'skyrocket',
  'abyss', 'revolutionize', 'disruptive', 'utilize', 'utilizing', 'tapestry', 'illuminate',
  'unveil', 'pivotal', 'intricate', 'elucidate', 'hence', 'furthermore', 'however', 'harness',
  'exciting', 'groundbreaking', 'remarkable', 'navigating', 'landscape', 'stark', 'testament',
  'moreover', 'boost', 'skyrocketing', 'powerful', 'inquiries'];

const PHRASES = [/shed light/i, /dive deep/i, /game-?changer/i, /not alone/i,
  /in a world where/i, /remains to be seen/i, /glimpse into/i, /cutting-?edge/i,
  /ever-?evolving/i, /opened up/i, /in conclusion/i, /in summary/i, /in closing/i,
  /not just .{1,40}, but also/i];

/** Les pages du site : celles de la racine, et celles de en/. */
function pages(dir = '.') {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith('.')) return [];
    const path = dir === '.' ? entry.name : join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'en' ? pages(path) : [];
    return entry.name.endsWith('.html') ? [path] : [];
  });
}

/**
 * Le texte que le visiteur lit vraiment.
 *
 * On retire d'abord ce qui n'est pas de la prose, puis les balises, et donc
 * tous les attributs. Ce qui reste est du texte.
 */
function visibleText(html) {
  // Seul le contenu de <main> est de la prose. L'en-tete et le pied sont des
  // etiquettes de navigation, sans ponctuation : les compter fausserait la
  // mesure des phrases longues.
  const main = /<main[^>]*>([\s\S]*?)<\/main>/i.exec(html);
  return (main ? main[1] : html)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const files = pages();
let hard = 0;
let warn = 0;

for (const file of files) {
  const prose = visibleText(readFileSync(file, 'utf8'));
  const english = file.startsWith('en/');
  const problems = [];

  const em = (prose.match(/—/g) ?? []).length;
  if (em) problems.push(`${em} tiret${em > 1 ? 's' : ''} long${em > 1 ? 's' : ''}`);

  const semi = (prose.match(/;/g) ?? []).length;
  if (semi) problems.push(`${semi} point-virgule${semi > 1 ? 's' : ''}`);

  if (english) {
    const hits = BANNED.filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(prose));
    if (hits.length) problems.push(`mots interdits : ${hits.join(', ')}`);
    const phrases = PHRASES.filter((p) => p.test(prose));
    if (phrases.length) problems.push(`${phrases.length} tournure(s) interdite(s)`);
  }

  if (problems.length) {
    hard += 1;
    console.log(`  ${file}`);
    problems.forEach((p) => console.log(`      ${p}`));
  }

  const long = prose.split(/(?<=[.!?])\s+/).filter((s) => s.split(/\s+/).length > 32);
  warn += long.length;
}

console.log(`\n  ${files.length} pages contrôlées`);
console.log(`  ${hard} avec un problème`);
console.log(`  ${warn} phrases de plus de 32 mots`);

process.exit(hard ? 1 : 0);
