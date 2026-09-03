/**
 * La liste des publications.
 *
 * Les 55 références ne sont écrites dans aucune page. Elles vivent dans
 * data/publications.json, que GitHub recopie depuis HAL chaque matin. Ce
 * fichier les met en page.
 *
 * Une page demande une liste en posant une div vide :
 *
 *   <div class="pub-list" data-publications></div>
 *   <div class="pub-list" data-publications data-grouped data-with-filters></div>
 *   <div class="pub-list" data-publications data-theme="resource"></div>
 *   <div class="pub-list" data-publications data-featured data-limit="5"></div>
 *
 * Rien d'autre à savoir pour modifier le site. Ce fichier ne se touche que
 * pour changer la présentation d'une référence.
 */

(function () {
  'use strict';

  var slots = document.querySelectorAll('[data-publications]');
  if (!slots.length) return;

  var EN = document.documentElement.lang === 'en';

  // Les pages anglaises vivent dans en/, il leur faut remonter d'un cran.
  var base = EN ? '../' : '';

  var LABELS = EN ? {
    types: {
      article: 'Journal articles', book: 'Books', conference: 'Conference papers',
      poster: 'Posters', report: 'Reports', thesis: 'Theses', hdr: 'Habilitation (HDR)',
    },
    all: 'Everything', show: 'Show', abstract: 'Abstract', data: 'Data',
    empty: 'Nothing yet.',
    loading: 'Loading publications…',
    failed: 'The publication list could not be loaded. If you opened this file '
      + 'straight from your disk, that is expected: the browser will not read '
      + 'data/publications.json. Read the page online instead.',
  } : {
    types: {
      article: 'Articles de revue', book: 'Ouvrages', conference: 'Communications',
      poster: 'Posters', report: 'Rapports', thesis: 'Thèses', hdr: 'Habilitation (HDR)',
    },
    all: 'Tout', show: 'Afficher', abstract: 'Résumé', data: 'Données',
    empty: 'Rien pour l’instant.',
    loading: 'Chargement des publications…',
    failed: 'La liste des publications n’a pas pu être chargée. Si vous avez ouvert '
      + 'ce fichier directement depuis votre disque, c’est normal : le navigateur '
      + 'refuse de lire data/publications.json. Consultez la page en ligne.',
  };

  var TYPE_ORDER = ['article', 'book', 'conference', 'poster', 'report', 'thesis', 'hdr'];
  var OWNER = 'Martin Thebault';

  /* ------------------------------------------------------------- une fiche */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  /** Le nom de Martin ressort en gras au milieu de ses co-auteurs. */
  function authorLine(list) {
    var p = el('p', 'pub__authors');
    (list || []).forEach(function (name, i) {
      if (i) p.appendChild(document.createTextNode(', '));
      if (name === OWNER) p.appendChild(el('b', 'author-self', name));
      else p.appendChild(document.createTextNode(name));
    });
    return p;
  }

  function chip(href, label) {
    var a = el('a', 'chip');
    a.href = href;
    a.rel = 'noopener';
    a.appendChild(el('span', null, label));
    return a;
  }

  function item(pub) {
    var article = el('article', 'pub pub--' + pub.type);
    article.dataset.type = pub.type;

    if (pub.thumb) {
      article.className += ' pub--illustrated';
      var thumb = el('div', 'pub__thumb');
      var img = el('img');
      img.src = base + 'img/publications/' + pub.id + '.png';
      img.alt = '';
      img.loading = 'lazy';
      img.width = 170;
      img.height = 240;
      thumb.appendChild(img);
      article.appendChild(thumb);
    }

    var body = el('div', 'pub__body');

    var title = el('h3', 'pub__title');
    if (pub.featured) {
      var star = el('span', 'pub__star');
      star.setAttribute('aria-hidden', 'true');
      star.innerHTML = '<svg class="icon icon--star" aria-hidden="true" '
        + 'focusable="false" fill="currentColor"><use href="#i-star"/></svg>';
      title.appendChild(star);
      title.appendChild(document.createTextNode(' '));
    }
    title.appendChild(document.createTextNode(pub.title));
    body.appendChild(title);

    body.appendChild(authorLine(pub.authors));

    var meta = el('p', 'pub__meta');
    if (pub.venue) meta.appendChild(el('em', 'pub__venue', pub.venue));
    if (pub.details) {
      if (meta.childNodes.length) meta.appendChild(document.createTextNode(' · '));
      meta.appendChild(document.createTextNode(pub.details));
    }
    if (pub.year) {
      if (meta.childNodes.length) meta.appendChild(document.createTextNode(' · '));
      meta.appendChild(el('span', 'pub__year', pub.year));
    }
    body.appendChild(meta);

    if (pub.summary) body.appendChild(el('p', 'pub__summary', pub.summary));

    var chips = el('p', 'chips');
    if (pub.doi) chips.appendChild(chip('https://doi.org/' + pub.doi, 'DOI'));
    if (pub.pdf) chips.appendChild(chip(pub.pdf, 'PDF'));
    else if (pub.hal) chips.appendChild(chip(pub.hal, 'HAL'));
    if (pub.code) chips.appendChild(chip(pub.code, 'Code'));
    if (pub.data) chips.appendChild(chip(pub.data, LABELS.data));
    if (chips.childNodes.length) body.appendChild(chips);

    if (pub.abstract) {
      var details = el('details', 'pub__abstract');
      details.appendChild(el('summary', null, LABELS.abstract));
      details.appendChild(el('p', null, pub.abstract));
      body.appendChild(details);
    }

    article.appendChild(body);
    return article;
  }

  /* ------------------------------------------------------------ une liste */

  function fill(slot, all) {
    var list = all.slice();

    if (slot.hasAttribute('data-featured')) {
      list = list.filter(function (p) { return p.featured; });
    }
    var theme = slot.getAttribute('data-theme');
    if (theme) {
      list = list.filter(function (p) { return (p.themes || []).indexOf(theme) !== -1; });
    }

    list.sort(function (a, b) { return (b.year || 0) - (a.year || 0); });

    var limit = Number(slot.getAttribute('data-limit')) || 0;
    if (limit) list = list.slice(0, limit);

    slot.textContent = '';

    if (!list.length) {
      slot.appendChild(el('p', 'empty', LABELS.empty));
      return;
    }

    if (slot.hasAttribute('data-with-filters')) buildFilters(slot, list);

    if (!slot.hasAttribute('data-grouped')) {
      list.forEach(function (p) { slot.appendChild(item(p)); });
      return;
    }

    slot.classList.add('pub-list--grouped');
    var years = [];
    list.forEach(function (p) { if (years.indexOf(p.year) === -1) years.push(p.year); });

    years.forEach(function (year) {
      var section = el('section', 'pub-year');

      // La feuille de style range l'année dans une colonne et les références
      // dans l'autre. Il faut donc le libellé enveloppé et ce conteneur.
      var label = el('h2', 'pub-year__label');
      label.appendChild(el('span', null, year));
      section.appendChild(label);

      var items = el('div', 'pub-year__items');
      list.filter(function (p) { return p.year === year; })
        .forEach(function (p) { items.appendChild(item(p)); });
      section.appendChild(items);

      slot.appendChild(section);
    });
  }

  /** La barre de filtres, posée juste avant la liste. */
  function buildFilters(slot, list) {
    var present = TYPE_ORDER.filter(function (type) {
      return list.some(function (p) { return p.type === type; });
    });
    if (present.length < 2) return;

    var bar = el('div', 'filters');
    bar.setAttribute('data-filters', '');
    bar.appendChild(el('span', 'filters__label', LABELS.show));

    [['all', LABELS.all]].concat(present.map(function (type) {
      return [type, LABELS.types[type] || type];
    })).forEach(function (pair, i) {
      var button = el('button', 'filter' + (i === 0 ? ' is-active' : ''), pair[1]);
      button.type = 'button';
      button.setAttribute('data-filter', pair[0]);
      button.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      bar.appendChild(button);
    });

    slot.parentNode.insertBefore(bar, slot);
  }

  /* ------------------------------------------------------------- lecture */

  slots.forEach(function (slot) {
    slot.appendChild(el('p', 'empty', LABELS.loading));
  });

  function readJson(path, fallback) {
    return fetch(base + path)
      .then(function (r) { return r.ok ? r.json() : fallback; })
      .catch(function () { return fallback; });
  }

  fetch(base + 'data/publications.json')
    .then(function (response) {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    })
    .then(function (data) {
      return readJson('data/publication-extras.json', {}).then(function (extras) {
        var items = (data.items || []).map(function (pub) {
          var extra = (extras || {})[pub.id] || {};
          var merged = {};
          for (var k in pub) merged[k] = pub[k];
          for (var j in extra) merged[j] = extra[j];
          return merged;
        });
        slots.forEach(function (slot) { fill(slot, items); });
        document.dispatchEvent(new CustomEvent('publications:ready'));
      });
    })
    .catch(function () {
      slots.forEach(function (slot) {
        slot.textContent = '';
        slot.appendChild(el('p', 'empty', LABELS.failed));
      });
    });
})();
