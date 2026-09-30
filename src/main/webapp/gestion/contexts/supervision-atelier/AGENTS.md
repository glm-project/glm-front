# Supervision de l'atelier

Ce contexte appartient exclusivement à `gestion`. Il classe les opérateurs déclarés selon leurs activités
interprétables en cours. L'[ADR 0047](../../../../../../documentation/adr/0047-count-only-finished-activities.md)
fixe le temps opérationnel et les séquences en conflit. La supervision conserve son adapter InMemory ;
le branchement HTTP réel relève d'un chantier distinct.

## Langage

**Opérateur déclaré** : opérateur référencé pour la supervision, identifié et ordonné alphabétiquement.
Il porte ses métiers, les natures de travail pour lesquelles il est habilité ; la liste peut être vide.

**Couloir de supervision** : classement dérivé des seules activités interprétables en cours.
`AU_TRAVAIL` signifie au moins une telle activité ; `SANS_ACTIVITE` signifie aucune.
Les libellés sont « Au travail » et « Sans activité ».

**Activité de supervision** : activité rattachée à un opérateur, portant un objet, une catégorie, un début,
un état et facultativement un poste. Les états sont `EN_COURS`, `TERMINEE`, `TERMINEE_AUTOMATIQUEMENT` et
`A_RESOUDRE`. Une activité NC ou Hors OF en cours place aussi l'opérateur Au travail.

**Fin automatique** : état dérivé à début + 13 heures écoulées, borne inclusive. La démonstration calcule
cette échéance depuis le début et l'instant d'évaluation, sans produire de pointage. Une activité ainsi
terminée quitte les activités courantes et porte un signalement sur la carte de l'opérateur.

**Séquence en conflit** : séquence identifiée dont les activités nécessitent une décision du gestionnaire.
Le port la fournit séparément des activités interprétables, y compris quand elle ne porte aucune activité
à résoudre. La supervision la rend sans en déduire une activité courante. Les activités interprétables
indépendantes du même opérateur restent rendues.

**Poste de supervision** : poste d'une activité, avec son identifiant, son libellé et facultativement sa
nature de travail. Les activités s'ordonnent par libellé de poste, celles sans poste en dernier, puis par
début et identifiant. L'écran dit « Sans poste » quand il manque.

**Nature de travail** : texte libre non vide, affiché tel que saisi et nommé « Métier » à l'écran.
Elle représente la nature d'un poste et les métiers d'un opérateur.

**Objet de l'activité** : élément travaillé ou Hors OF explicite.

**Élément travaillé** : moule (`PRODUIT`) ou OF (`ORDRE_DE_FABRICATION`), avec son nom et sa référence
facultative. Sans référence, l'écran le désigne par son nom ; aucune référence n'est fabriquée.

**Hors OF** : travail non facturable sans élément travaillé, déclaré explicitement. Une activité dont
l'élément manque ne devient jamais implicitement Hors OF.

**Instant** : date et heure absolues validées, indépendantes du fuseau de représentation. Le début d'une
activité, son échéance et l'évaluation utilisent cette valeur, normalisée en UTC.

**Catégorie d'activité** : `TRAVAIL` ou `NON_CONFORMITE`. La NC est une surcouche de l'activité courante,
jamais un couloir. Une activité à résoudre ne contribue pas au signal NC interprété.

**Opérateur à vérifier** : opérateur portant une fin automatique ou une séquence en conflit.

**Résultat de supervision** : évaluation exploitable avec les opérateurs ordonnés, ou inexploitable si
une activité, y compris dans une séquence en conflit, n'a pas d'opérateur identifiable.

## Responsabilités et invariants

- Chaque opérateur déclaré figure exactement une fois. Les deux couloirs existent toujours, dans l'ordre
  Au travail puis Sans activité, même vides. Les opérateurs sont triés par nom, prénom et identifiant.
- Les activités terminées ou à résoudre ne déterminent pas le couloir et ne comptent pas dans le signal NC.
- Les séquences en conflit restent visibles et à vérifier après l'échéance ; la borne automatique ne les tranche pas.
- Les métiers sont affichés quand aucune activité interprétable n'est en cours.
- La supervision affiche des instants, jamais une durée comptabilisée.
- L'instant d'évaluation est obligatoire ; les instants invalides ou dépourvus de fuseau sont refusés.
- Les modèles sont immuables et copient les collections reçues à la construction.
- Une activité sans opérateur identifiable rend le résultat inexploitable ; le primaire affiche une erreur
  qui remplace les couloirs précédents.
- Pendant la relecture toutes les 30 s ou par « Actualiser », les couloirs restent visibles. La vue est
  réévaluée à la fin de chaque lecture même quand le port rend le même objet. Le chargement n'occupe
  l'écran que lorsqu'aucune vue exploitable n'est affichée ; une erreur remplace toujours la vue.
- Ce contexte acquiert la vue par un seul port et ne partage aucun modèle métier avec `pupitre`.
- Seul l'adapter InMemory est branché, y compris en production. Il fournit les démonstrations d'activité,
  de fin automatique et de conflit ; les rapports réels de ce chantier sont le relevé et le coût.

## Règles locales

Appliquer la [composition des lectures](../../../../../../documentation/architecture.md#acquire-a-view-through-one-read-port-by-default).
L'[ADR 0031](../../../../../../documentation/adr/0031-own-workshop-supervision-in-gestion.md) possède la
séparation des responsabilités, l'[ADR 0041](../../../../../../documentation/adr/0041-sort-workshop-supervision-into-state-lanes.md)
la forme en couloirs et l'[ADR 0040](../../../../../../documentation/adr/0040-colour-non-conformity-yellow.md)
la couleur de la NC. Leur classement est amendé par l'ADR 0047.
