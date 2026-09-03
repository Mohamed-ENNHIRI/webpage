# martin-thebault.fr

Le site personnel de Martin Thebault, chargé de recherche CNRS au LOCIE.

**Ce dépôt est le site.** Les fichiers `.html` que vous voyez sont exactement
les pages servies. Il n'y a rien à construire, rien à installer, aucune étape
intermédiaire. Vous modifiez un fichier, vous l'enregistrez, et une minute plus
tard la modification est en ligne.

## Les fichiers

```
index.html            l'accueil
recherche.html        les trois axes, l'un sous l'autre
projets.html          les projets, l'un sous l'autre
travaux.html          les publications (remplies par le navigateur, voir plus bas)
outils.html           le code et les jeux de données
equipe.html           l'équipe et les anciens membres
actualites.html       les actualités
me-contacter.html     le contact
404.html              la page servie pour une adresse inconnue

en/                   les huit mêmes pages, en anglais

css/site.css          toutes les couleurs et toute la mise en page
js/site.js            le thème sombre, le menu, les filtres, le soleil
js/publications.js    construit la liste des publications
data/                 les publications lues dans HAL
uploads/              les photos et les figures
img/publications/     l'image de première page de chaque article
fonts/                la police Inter, servie depuis le site
tools/                les trois scripts d'entretien
```

## Modifier une page

Ouvrez le fichier, changez le texte, enregistrez. C'est tout.

Chaque page porte trois repères en commentaire : `EN-TÊTE`, la zone de contenu,
et `PIED DE PAGE`. Le texte se trouve entre les deux. L'en-tête et le pied sont
identiques d'un fichier à l'autre dans une même langue : si vous changez le
menu, faites la même correction dans les huit fichiers de la langue.

**Chaque contenu existe deux fois**, une fois à la racine en français et une
fois sous `en/` en anglais. Si vous modifiez l'un, modifiez l'autre.

Pour voir une page avant de publier, double-cliquez simplement dessus. Les
chemins sont relatifs, la page s'affiche telle quelle depuis le disque. Seules
les publications ne s'afficheront pas ainsi, le navigateur refusant de lire un
fichier de données en local.

## Les publications se gèrent seules

Les 55 références ne sont écrites dans aucune page. Elles vivent dans
`data/publications.json`, que GitHub recopie depuis HAL chaque matin.
`js/publications.js` les met en page dans le navigateur.

Une page demande une liste en posant une div vide :

```html
<div class="pub-list" data-publications data-grouped data-with-filters></div>
<div class="pub-list" data-publications data-theme="resource"></div>
<div class="pub-list" data-publications data-featured data-limit="5"></div>
```

Vous ne saisissez donc jamais une référence à la main. Vous déposez dans HAL,
et elle paraît le lendemain.

`data/publication-extras.json` reste sous votre contrôle et n'est jamais
écrasé. Chaque publication y est repérée par son identifiant HAL :

```json
{
  "hal-03135327": {
    "featured": true,
    "summary": "Une phrase pour un lecteur non spécialiste.",
    "themes": ["integration"]
  }
}
```

## Les scripts d'entretien

Ils n'utilisent que Node, sans aucune dépendance à installer.

| | |
|---|---|
| `node tools/hal.mjs` | relit HAL et réécrit `data/publications.json` |
| `node tools/thumbnails.mjs` | télécharge l'image de première page des nouveaux dépôts |
| `node tools/style-check.mjs` | signale les phrases qui s'écartent du style du site |

Les deux premiers tournent seuls chaque matin. Le troisième tourne à chaque
publication, sans jamais la bloquer.

## Les deux tâches automatiques

- `.github/workflows/deploy.yml` remet le dépôt à GitHub Pages à chaque
  poussée sur `main`.
- `.github/workflows/hal-sync.yml` relit HAL chaque matin, et n'enregistre que
  si quelque chose a changé.

Le premier peut disparaître : dans **Settings → Pages**, choisir *Deploy from a
branch*, branche `main`, dossier `/ (root)`. GitHub sert alors le dépôt
directement.

## L'hébergement

GitHub Pages, gratuit tant que le dépôt est public. Le nom de domaine est chez
OVH, qui ne sert que le nom. Le certificat HTTPS est délivré et renouvelé par
GitHub.

---

Le guide complet destiné à Martin, en PDF, est tenu hors du dépôt.
