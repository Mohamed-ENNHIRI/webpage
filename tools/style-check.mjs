/**
 * Check the site's prose against the writing rules in rule.md.
 *
 * Hard failures: em dashes, semicolons, banned words. Warnings: long sentences.
 *
 * Publication titles and abstracts are excluded. They come from HAL and belong
 * to the published record, so rewriting them would misstate the literature.
 * The banned-word list is English, so it is applied to English content only;
 * the punctuation and sentence-length rules apply to both languages.
 *
 * Usage: node tools/style-check.mjs
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BANNED = ['can','may','just','that','very','really','literally','actually','certainly',
  'probably','basically','could','maybe','delve','embark','enlightening','esteemed',
  'craft','crafting','imagine','realm','unlock','discover','skyrocket','abyss',
  'revolutionize','disruptive','utilize','utilizing','tapestry','illuminate','unveil',
  'pivotal','intricate','elucidate','hence','furthermore','however','harness','exciting',
  'groundbreaking','remarkable','navigating','landscape','stark','testament','moreover',
  'boost','skyrocketing','powerful','inquiries'];

const PHRASES = [/shed light/i, /dive deep/i, /game-?changer/i, /not alone/i,
  /in a world where/i, /remains to be seen/i, /glimpse into/i, /cutting-?edge/i,
  /ever-?evolving/i, /opened up/i, /in conclusion/i, /in summary/i, /in closing/i,
  /not just .{1,40}, but also/i];

const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const f = join(dir, n);
  return statSync(f).isDirectory() ? walk(f) : [f];
});

const files = [
  ...walk('content'),
  'data/site.json',
].filter((f) => f.endsWith('.md') || f.endsWith('.json'));

/*
 * Interface strings are prose the visitor reads, so they follow the same rules.
 * Only the quoted values are checked; code and comments around them are not.
 */
const strings = readFileSync('build/lib/i18n.mjs', 'utf8')
  .split('\n')
  .filter((line) => /^\s+[a-zA-Z]+: '/.test(line))
  .join('\n');

const stringProblems = [];
if (strings.includes('—')) stringProblems.push('em dash');
if (strings.includes(';')) stringProblems.push('semicolon');
for (const w of BANNED) {
  if (new RegExp(`\\b${w}\\b`).test(strings)) stringProblems.push(`banned: ${w}`);
}
if (stringProblems.length) {
  console.log('  build/lib/i18n.mjs (interface strings)');
  stringProblems.forEach((p) => console.log(`      ${p}`));
}

let hard = 0;
let warn = 0;

for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  const english = file.includes('/en/');
  const problems = [];

  // Ignore YAML keys and URLs; only the prose matters.
  const prose = raw
    .replace(/^[a-z_]+:/gm, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\b10\.\d{4,}\/\S+/g, '');

  const em = (prose.match(/—/g) ?? []).length;
  if (em) problems.push(`${em} em dash${em > 1 ? 'es' : ''}`);

  const semi = (prose.match(/;/g) ?? []).length;
  if (semi) problems.push(`${semi} semicolon${semi > 1 ? 's' : ''}`);

  if (english) {
    const hits = BANNED.filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(prose));
    if (hits.length) problems.push(`banned: ${hits.join(', ')}`);
    const phrases = PHRASES.filter((p) => p.test(prose));
    if (phrases.length) problems.push(`banned phrase x${phrases.length}`);
  }

  if (problems.length) {
    hard += 1;
    console.log(`  ${file}`);
    problems.forEach((p) => console.log(`      ${p}`));
  }

  // Sentence length, as a warning only.
  const body = raw.split(/^---$/m).slice(2).join('').trim();
  const long = body.split(/(?<=[.!?])\s+/).filter((s) => s.split(/\s+/).length > 32);
  if (long.length) {
    warn += long.length;
  }
}

console.log(`\n  ${files.length} files checked`);
console.log(`  ${hard + (stringProblems.length ? 1 : 0)} with hard failures`);
console.log(`  ${warn} sentences over 32 words`);
process.exit(hard || stringProblems.length ? 1 : 0);
