# 0055 — Arrêter avant de changer la catégorie d'une activité

## Status

`Accepted` le 13 octobre 2026, avec le ticket [#297](https://github.com/glm-project/glm-front/issues/297).

- `Amends 0054`: les gestes composés du pupitre disparaissent. Une tuile active n'envoie plus que des `FIN`, une par
  activité personnelle ; NC pendant un travail et « FIN NC » n'existent plus. Le reste de 0054 tient : la règle de
  réception du serveur, les trois pointages, la `FIN` explicite avant toute ouverture, PAUSE, REPRENDRE et TOUT ARRÊTER.

## Context

Une tuile offrait deux cibles dans tous les états. Sur un élément en travail, « NC » envoyait une `FIN` puis une
`NON_CONFORMITE` ; sur un élément en non-conformité, « FIN NC » envoyait une `FIN` puis un `DEBUT`. La revue de la
maquette de #294 a jugé ces passages directs sources d'erreurs de pointage : la cible voisine d'ARRÊTER change la
catégorie de l'activité au lieu de l'arrêter, et l'opérateur ne s'en aperçoit qu'en relisant ses pointages.

## Considered options

- Une seule cible ARRÊTER sur une tuile active, et le domaine ne compose plus — **kept**.
- Masquer la cible secondaire à l'écran en gardant le geste composé dans le domaine — rejected : une règle que plus
  aucun écran n'atteint, documentée comme si elle servait.
- Garder les deux cibles en éloignant ou recolorant la secondaire — rejected : l'erreur reste à un appui maintenu.

## Decision

Une tuile libre offre deux cibles de même taille : DÉMARRER ouvre un travail, NC une non-conformité. Une tuile dont
l'élément porte une activité de l'opérateur désigné, en travail ou en non-conformité, n'offre que la cible ARRÊTER, sur
toute sa largeur. `ActivitesPersonnelles.decide` ne reçoit plus la cible : sur un élément actif, elle rend une `FIN` par
activité, avec son poste, quelle que soit la cible qu'un appel lui transmettrait. Pour changer la catégorie d'une
activité, l'opérateur arrête, puis démarre ou déclare la non-conformité : deux appuis, deux heures distinctes.

## Consequences

### Positive

- Un appui sur une tuile active ne peut plus qu'arrêter : aucun pointage ne change de catégorie par erreur.
- Le domaine perd une branche et le libellé « FIN NC » ; une tuile active se lit d'un coup d'œil.

### Negative

- Passer d'un travail à une non-conformité demande deux appuis maintenus au lieu d'un, et deux heures de pointage au
  lieu d'une : l'intervalle entre l'arrêt et la nouvelle ouverture n'est compté nulle part.
- Une tuile active n'offre plus de non-conformité : un opérateur qui la cherche doit d'abord arrêter.
