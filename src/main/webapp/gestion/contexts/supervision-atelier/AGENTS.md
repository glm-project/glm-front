# Supervision de l'atelier

Ce contexte appartient exclusivement à `gestion`. Il classe les opérateurs déclarés selon leurs activités
interprétables en cours. L'[ADR 0047](../../../../../../documentation/adr/0047-count-only-finished-activities.md)
fixe le temps opérationnel et les séquences en conflit. La supervision lit la projection complète du
backend ; l'adapter InMemory conserve les démonstrations.

## Langage

**Opérateur déclaré** : opérateur référencé pour la supervision, identifié et ordonné alphabétiquement.
Il porte ses métiers, les natures de travail pour lesquelles il est habilité ; la liste peut être vide.

**Couloir de supervision** : classement dérivé des seules activités interprétables en cours.
`AU_TRAVAIL` signifie au moins une telle activité ; `SANS_ACTIVITE` signifie aucune.
Les libellés sont « Au travail » et « Sans activité ».

**Activité de supervision** : activité rattachée à un opérateur, portant un objet, une catégorie, un début,
un état et facultativement un poste. Les états sont `EN_COURS`, `TERMINEE`, `TERMINEE_AUTOMATIQUEMENT` et
`A_RESOUDRE`. Une activité NC ou sur un OF Perso en cours place aussi l'opérateur Au travail.

**Fin automatique** : état interprété par le backend avec son échéance et sa fin retenue. La vue affiche
la fin retenue reçue. La démonstration calcule une échéance à début + 13 heures écoulées, borne inclusive,
puis évalue son état à l'instant d'évaluation, sans produire de pointage. Une activité ainsi terminée
quitte les activités courantes et porte un signalement sur la carte de l'opérateur.

**Séquence en conflit** : séquence identifiée dont les activités nécessitent une décision du gestionnaire.
Le port la fournit séparément des activités interprétables, y compris quand elle ne porte aucune activité
à résoudre. La supervision la rend sans en déduire une activité courante. Les activités interprétables
indépendantes du même opérateur restent rendues.

**Poste de supervision** : poste d'une activité, avec son identifiant, son libellé et facultativement sa
nature de travail. Les activités s'ordonnent par libellé de poste, celles sans poste en dernier, puis par
début et identifiant. L'écran dit « Sans poste » quand il manque.

**Nature de travail** : texte libre non vide, affiché tel que saisi et nommé « Métier » à l'écran.
Elle représente la nature d'un poste et les métiers d'un opérateur.

**Objet de l'activité** : élément travaillé.

**Élément travaillé** : moule (`PRODUIT`) ou OF (`ORDRE_DE_FABRICATION`), avec son nom et sa référence
facultative. Sans référence, l'écran le désigne par son nom ; aucune référence n'est fabriquée.

**OF Perso** : ordre de fabrication créé par le superviseur pour représenter son travail personnel.
La supervision le lit comme tout OF. Sa création et son sous-type appartiennent à un autre chantier ;
un élément manquant ne constitue jamais un OF Perso.

**Instant** : date et heure absolues validées, indépendantes du fuseau de représentation. Le début d'une
activité, son échéance, sa fin retenue et l'évaluation utilisent cette valeur, normalisée en UTC.
Les fractions ISO de une à neuf décimales sont conservées sans perte : l'ordre des instants et l'échéance
inclusive restent exacts jusqu'à la nanoseconde, y compris dans la même milliseconde. Le calcul de
l'échéance de démonstration à treize heures conserve également la fraction du début.

**Catégorie d'activité** : `TRAVAIL` ou `NON_CONFORMITE`. La NC est une surcouche de l'activité courante,
jamais un couloir. Une activité à résoudre ne contribue pas au signal NC interprété.

**Opérateur à vérifier** : opérateur portant une fin automatique ou une séquence en conflit.

**Résultat de supervision** : évaluation exploitable avec les opérateurs ordonnés, ou inexploitable si
une activité, y compris dans une séquence en conflit, n'a pas d'opérateur identifiable.

## Responsabilités et invariants

- Chaque opérateur déclaré figure exactement une fois. Les deux couloirs existent toujours, dans l'ordre
  Au travail puis Sans activité, même vides. Les opérateurs sont triés par nom, prénom et identifiant.
- Les activités terminées ou à résoudre ne déterminent pas le couloir et ne comptent pas dans le signal NC.
- La pause et sa mémoire appartiennent au seul pupitre qui l'a prise. Des fins simultanées ne prouvent
  aucune pause ; une activité ouverte ailleurs ou une fin encore à publier conserve son état reçu.
  La supervision n'invente aucun état suspendu ni couloir sans source. Chaque reprise crée un nouvel
  instant de début pour l'activité rendue.
- Les séquences en conflit restent visibles et à vérifier après l'échéance ; la borne automatique ne les tranche pas.
- Les métiers sont affichés quand aucune activité interprétable n'est en cours.
- La supervision affiche des instants, jamais une durée comptabilisée.
- L'instant d'évaluation est obligatoire ; les instants invalides ou dépourvus de fuseau sont refusés.
- Les modèles sont immuables et copient les collections reçues à la construction.
- Une activité sans opérateur identifiable rend le résultat inexploitable ; le primaire affiche une erreur
  qui remplace les couloirs précédents.
- Pendant la relecture toutes les 30 s ou par « Actualiser », les couloirs restent visibles. La vue est
  réévaluée à chaque acquisition avec son `evaluation` obligatoire, sans extrapoler depuis l'horloge du navigateur.
  La fraîcheur affichée utilise ce même instant. Le chargement n'occupe
  l'écran que lorsqu'aucune vue exploitable n'est affichée ; une erreur remplace toujours la vue.
- Ce contexte acquiert la vue par un seul port et ne partage aucun modèle métier avec `pupitre`.
- La composition normale lie le port à HTTP sur la route de supervision. Chaque lecture recharge
  opérateurs, activités et conflits sans cache ni repli de démonstration. Le backend fournit une réponse
  complète non paginée sous READ COMMITTED ; l'évaluation commune ne garantit pas un instantané transactionnel.
- L'adapter secondaire signale une panne technique une fois par `ErrorHandlerPort`, puis rejette la lecture.
  Une fin automatique sans fin retenue est une réponse non représentable et rejette également la lecture.

## Règles locales

Appliquer la [composition des lectures](../../../../../../documentation/architecture.md#acquire-a-view-through-one-read-port-by-default).
L'[ADR 0031](../../../../../../documentation/adr/0031-own-workshop-supervision-in-gestion.md) possède la
séparation des responsabilités, l'[ADR 0041](../../../../../../documentation/adr/0041-sort-workshop-supervision-into-state-lanes.md)
la forme en couloirs et l'[ADR 0040](../../../../../../documentation/adr/0040-colour-non-conformity-yellow.md)
la couleur de la NC. Leur classement est amendé par l'ADR 0047.
