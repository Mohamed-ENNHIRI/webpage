# martin-thebault.fr

The personal research site of **Martin Thebault**, CNRS Research Scientist at
LOCIE (UMR 5271, CNRS / Université Savoie Mont Blanc), working on solar energy
in buildings, cities and territories.

Static HTML, CSS and JavaScript, generated from Markdown. No framework, no
client-side rendering, no tracking.

## Running it

```bash
npm install
npm run dev      # http://localhost:4321, rebuilds as you edit
npm run build    # writes _site/
npm run hal      # refresh data/publications.json from HAL
```

Node 20 or later. Two build-time dependencies, `marked` and `js-yaml`; nothing
ships to the browser but the CSS, one small script and the fonts.

## How it fits together

```
content/{en,fr}/…        Markdown + front matter — the words
data/site.json           name, affiliation, links
data/publications.json   mirrored from HAL, refreshed nightly
        │
        ▼  npm run build
_site/                   plain static files
```

```
build/
  build.mjs        renders every page
  hal.mjs          mirrors HAL into data/publications.json
  serve.mjs        development server
  lib/
    content.mjs    reads the Markdown tree
    routes.mjs     URL construction
    layout.mjs     head, header, footer
    components.mjs publications, people, projects, themes, news
    html.mjs       escaping, icons, author formatting
    i18n.mjs       interface strings
content/{en,fr}/{pages,themes,projects,people,news}/*.md
data/                    site settings and the publication mirror
static/{css,js,fonts}    stylesheet, script, self-hosted Inter
uploads/                 photos and figures
```

## Publications

The list is read from **HAL**, the open archive French public research already
deposits into, using the idHAL in `data/site.json`. A scheduled workflow reads
it every morning and commits only when something changed. Deposit a paper in
HAL and it appears here on its own.

Anything HAL does not hold — a plain-language summary, links to code or data,
the "selected publication" star — lives in `data/publication-extras.json`, keyed
by HAL id. The sync never touches that file.

## Languages

English at the root, French under `/fr/`. Every page, project, research theme
and person exists in both as its own Markdown file, with its own URL, so the
French reads as French: `/fr/recherche/`, `/fr/travaux/`, `/fr/equipe/`.

Publications are not translated — a paper has one title, in the language it was
published in. The labels around them are, from `build/lib/i18n.mjs`.

## Editing

Content is Markdown with YAML front matter. Edit a file — in any text editor,
or directly on GitHub — and push; the site rebuilds and republishes itself.

Images go in `uploads/` and are referenced as `/uploads/file-name.jpg`.

## Notes

- **Fonts are self-hosted and icons are inline SVG**, so a visitor's browser
  makes no third-party request. There is no analytics and no cookie.
- **The hero visual** is an abstract solar cadastre drawn on a canvas: rooftops
  shaded by the sunlight each receives, with shadows moving as the sun comes
  round. It is the subject of the research rather than decoration, and it holds
  still when the visitor asks for reduced motion.
- **Dark mode** follows the system, with a toggle to override it.
- The site works without JavaScript: only the publication filters and the hero
  animation are lost.
