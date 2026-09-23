# Supervision de l'atelier

Ce contexte appartient exclusivement à `gestion`. Il interprète en temps réel les opérateurs déclarés, leur présence et leurs activités pour la grille de supervision d'atelier.

## Langage

**Supervision de l'atelier** : interprétation en temps réel des opérateurs déclarés, de la présence et des activités en cours pour la grille d'atelier.

**Opérateur déclaré** : opérateur référencé pour la supervision de l'atelier, identifié et ordonné alphabétiquement.

**Journée de travail** : une venue sur l'atelier, bornée par une arrivée et un départ, qui peut traverser minuit ; ce n'est pas un jour calendaire.

**Présence de l'opérateur** : état instantané d'un opérateur déclaré (`PRESENT`, `EN_PAUSE` ou `ABSENT`). `ABSENT` est caractérisé par l'absence de journée ouverte.

**Fenêtre de présence** : intervalle de présence effective d'un opérateur, pauses déduites, au sein d'une journée de travail.

**Segment de présence** : intervalle temporel de présence ou de pause au sein d'une ou plusieurs journées de travail, avec son début, sa fin, son type (présence ou pause) et l'indication d'un segment en cours.

**Statistiques de supervision** : synthèse instantanée de l'atelier comptabilisant le nombre total d'opérateurs déclarés, présents, en pause, absents, sans affectation et en anomalie.

**Activité de supervision** : activité en cours rattachée à un opérateur, dotée d'une catégorie (ex: `NC`), d'un instant de début et facultativement d'un poste.

**Instant** : date et heure absolues validées, indépendantes du fuseau de représentation. Le début d'une activité, l'ouverture d'une journée et l'évaluation de la supervision sont des usages de cette même valeur ; sa représentation publique est normalisée en UTC.

**Catégorie d'activité** : valeur reçue qui détermine notamment le caractère `NC` de l'activité.

**Sans affectation** : état opérationnel d'un opérateur présent qui n'a aucune activité en cours.

> « GLM » n'est pas un concept du produit : c'est le nom que l'entreprise cliente donne à son travail non facturable, par exemple un projet interne, qu'elle veut déclarer manuellement. Ce travail n'est pas encore modélisé. La présence sans affectation n'en est pas, et aucun type, champ ni sélecteur ne s'appelle GLM.

**Anomalie de supervision** : signalement d'incohérence constaté lors de l'évaluation de la supervision (`JOURNEE_OUVERTE_PLUS_DE_16_HEURES`, `JOURNEE_OUVERTE_SANS_FENETRES`, `ACTIVITE_D_UN_ABSENT`).

**Résultat de supervision** : évaluation de la supervision, exploitable avec la liste ordonnée des opérateurs supervisés, ou inexploitable (notamment en présence d'une `ACTIVITE_SANS_OPERATEUR_IDENTIFIABLE`).

## Responsabilités et invariants

- La présence d'un opérateur déclaré est déterminée exclusivement par sa journée de travail : présent ou en pause si une journée est ouverte, absent en l'absence de journée ouverte.
- Une journée de travail est une venue indépendante du calendrier : les venues traversant minuit et les anciennes journées restées ouvertes sont prises en compte sans filtre calendaire.
- L'ordre des opérateurs dans la grille de supervision est strictement alphabétique et indépendant de leur état de présence.
- Les segments de présence d'un opérateur sont dérivés de ses journées de travail : les intervalles effectifs et les pauses intercalaires ou de session sont calculés par le domaine.
- Les statistiques de supervision sont évaluées par l'agrégat SupervisionDeLAtelier.
- Les activités en cours sont associées aux opérateurs déclarés correspondants ; un opérateur peut avoir 0 à N activités.
- « Sans affectation » est un état dérivé : un opérateur est sans affectation si et seulement s'il est présent et n'a aucune activité en cours.
- L'absence de poste ou l'absence d'heure d'ouverture est représentée sans valeur fabriquée (`undefined`).
- Le temps affichable reste un instant absolu, jamais une durée calculée par le domaine.
- L'instant d'évaluation est obligatoire. Les instants invalides ou dépourvus de fuseau sont refusés à la construction.
- L'ouverture est le plus ancien début de fenêtre, indépendamment de l'ordre reçu. La supervision expose cet instant ou son absence.
- La détection d'une anomalie préserve l'état de présence et les activités de l'opérateur supervisé.
- Le seuil de dépassement d'ouverture de journée (strictement supérieur à 16 heures) est calculé par rapport à l'instant d'évaluation fourni.
- Une activité sans opérateur identifiable rend le résultat inexploitable ; le primaire affiche une erreur sans conserver la grille précédente.
- La grille de supervision est immuable.
- Les collections reçues par les modèles sont copiées à la construction ; modifier le tableau source ne change pas une valeur déjà construite.
- Ce contexte ne dépend d'aucun contexte de `pupitre` et ne partage aucun modèle métier avec lui.
- L’adaptateur HTTP de supervision lit les données opérateurs via l’API et les traduit dans ses propres modèles, sans importer le domaine `operateur`.

## Règles locales

Pour l'acquisition des données de la vue, appliquer la [règle de composition des lectures](../../../../../../documentation/architecture.md#acquire-a-view-through-one-read-port-by-default).

Consulter l'[ADR 0031](../../../../../../documentation/adr/0031-own-workshop-supervision-in-gestion.md) pour les arbitrages d'architecture et la séparation des responsabilités.
