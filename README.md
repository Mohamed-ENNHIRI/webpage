# martin-thebault.fr

Le site personnel de Martin Thebault, chargé de recherche CNRS au LOCIE.

**Ce dépôt est le site.** Les fichiers `.html` que vous voyez sont exactement
les pages servies. Rien à construire, rien à installer. Vous modifiez un
fichier, vous l'enregistrez, et une minute plus tard c'est en ligne.

Le site est **en anglais uniquement** depuis septembre 2026. La version
française a été retirée.

## Les fichiers

```
index.html            l'accueil
research.html         les trois axes, l'un sous l'autre
projects.html         les projets, l'un sous l'autre
publications.html     les publications (remplies par le navigateur, voir plus bas)
tools.html            le code et les jeux de données
team.html             l'équipe et les anciens membres
news.html             les actualités
contact.html          le contact
404.html              la page servie pour une adresse inconnue

css/site.css          toutes les couleurs et toute la mise en page
js/site.js            le thème sombre, le menu, les filtres, le soleil
js/publications.js    construit la liste des publications
data/                 les publications lues dans HAL
img/people/           les portraits
img/figures/          les figures tirées des articles
img/logo/             CNRS, LOCIE, USMB, INES
img/publications/     l'image de première page de chaque article
fonts/                la police Inter, servie depuis le site
tools/                les trois scripts d'entretien
```

## Modifier une page

Ouvrez le fichier, changez le texte, enregistrez. C'est tout. Pour voir le
résultat avant de publier, double-cliquez sur le fichier : les chemins sont
relatifs, la page s'affiche telle quelle depuis le disque. Seules les
publications ne s'afficheront pas ainsi, le navigateur refusant de lire un
fichier de données en local.

Chaque page porte des repères en commentaire : l'en-tête, le contenu, le pied
de page. Le texte se trouve entre les deux.

**L'en-tête est identique sur les huit pages, au caractère près.** C'est
volontaire : pour changer le menu ou un logo, faites une recherche et
remplacement sur les huit fichiers, et ils resteront alignés. Le seul écart
voulu est `is-active` sur l'onglet de la page courante.

## Les publications se gèrent seules

Les références ne sont écrites dans aucune page. Elles vivent dans
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

**Attention à ces deux fichiers.** Ce sont du YAML, où un caractère de trop
suffit à empêcher toute publication, sans message visible ailleurs que dans
l'onglet **Actions**. En cas de doute après les avoir modifiés, vérifiez que
le dernier passage y est bien vert.

## Les anciennes adresses

Le site a été bilingue, avec le français à la racine et l'anglais sous `/en/`.
Ces adresses n'existent plus. `404.html` porte un petit tableau qui les
redirige vers leur page actuelle, pour que les liens déjà partagés continuent
de fonctionner. Il pourra être retiré une fois ces liens tombés en désuétude.

## L'hébergement

GitHub Pages, gratuit tant que le dépôt est public. Le nom de domaine est chez
OVH, qui ne sert que le nom. Le certificat HTTPS est délivré et renouvelé par
GitHub.
