# Supervision de l'atelier

Ce contexte appartient exclusivement à `gestion`. Il interprète en temps réel les opérateurs déclarés, leur présence et leurs activités pour la grille de supervision d'atelier.

## Langage

**Supervision de l'atelier** : interprétation en temps réel des opérateurs déclarés, de la présence et des activités en cours pour la grille d'atelier.

**Opérateur déclaré** : opérateur référencé pour la supervision de l'atelier, identifié et ordonné alphabétiquement.

**Journée de travail** : une venue sur l'atelier, bornée par une arrivée et un départ, qui peut traverser minuit ; ce n'est pas un jour calendaire.

**Présence de l'opérateur** : état instantané d'un opérateur déclaré (`PRESENT`, `EN_PAUSE` ou `ABSENT`). `ABSENT` est caractérisé par l'absence de journée ouverte.

**Fenêtre de présence** : intervalle de présence effective d'un opérateur, pauses déduites, au sein d'une journée de travail.

**Activité de supervision** : activité en cours rattachée à un opérateur, dotée d'une catégorie (ex: `NC`), d'un instant de début et facultativement d'un poste.

**GLM** : état opérationnel d'un opérateur présent qui n'a aucune activité en cours.

**Anomalie de supervision** : signalement d'incohérence constaté lors de l'évaluation de la supervision (`JOURNEE_OUVERTE_PLUS_DE_16_HEURES`, `JOURNEE_OUVERTE_SANS_FENETRES`, `ACTIVITE_D_UN_ABSENT`).

**Résultat de supervision** : évaluation de la supervision, exploitable avec la liste ordonnée des opérateurs supervisés, ou inexploitable (notamment en présence d'une `ACTIVITE_SANS_OPERATEUR_IDENTIFIABLE`).

## Responsabilités et invariants

- La présence d'un opérateur déclaré est déterminée exclusivement par sa journée de travail : présent ou en pause si une journée est ouverte, absent en l'absence de journée ouverte.
- Une journée de travail est une venue indépendante du calendrier : les venues traversant minuit et les anciennes journées restées ouvertes sont prises en compte sans filtre calendaire.
- L'ordre des opérateurs dans la grille de supervision est strictement alphabétique et indépendant de leur état de présence.
- Les activités en cours sont associées aux opérateurs déclarés correspondants ; un opérateur peut avoir 0 à N activités.
- GLM est un état dérivé : un opérateur est en GLM si et seulement s'il est présent et n'a aucune activité en cours.
- L'absence de poste ou l'absence d'heure d'ouverture est représentée sans valeur fabriquée (`undefined`).
- Le temps affichable reste un instant absolu, jamais une durée calculée par le domaine.
- La détection d'une anomalie préserve l'état de présence et les activités de l'opérateur supervisé.
- Le seuil de dépassement d'ouverture de journée (strictement supérieur à 16 heures) est calculé par rapport à l'instant d'évaluation fourni.
- Une activité sans opérateur identifiable rend le résultat inexploitable afin que la couche de coordination (MR3) puisse rejeter ou préserver l'état en conséquence.
- La grille de supervision est immuable.
- Ce contexte ne dépend d'aucun contexte de `pupitre` et ne partage aucun modèle métier avec lui.
- La consommation d'opérateurs depuis le contexte `operateur` passe par un adaptateur TypeScript, sans import direct de son domaine.

## Règles locales

Consulter l'[ADR 0031](../../../../../../documentation/adr/0031-own-workshop-supervision-in-gestion.md) pour les arbitrages d'architecture et la séparation des responsabilités.
