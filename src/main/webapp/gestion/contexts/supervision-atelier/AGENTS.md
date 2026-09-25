# Supervision de l'atelier

Ce contexte appartient exclusivement à `gestion`. Il interprète en temps réel les opérateurs déclarés, leur présence et leurs activités pour les couloirs de supervision.

## Langage

**Supervision de l'atelier** : interprétation en temps réel des opérateurs déclarés, de la présence et des activités en cours pour les couloirs de supervision.

**Opérateur déclaré** : opérateur référencé pour la supervision de l'atelier, identifié et ordonné alphabétiquement. Il porte ses métiers, les natures de travail pour lesquelles il est habilité ; la liste peut être vide.

**Journée de travail** : une venue sur l'atelier, bornée par une arrivée et un départ, qui peut traverser minuit ; ce n'est pas un jour calendaire. À l'écran, une journée de travail se dit _venue_ : « journée » y évoquerait un jour calendaire, et « présence » désigne déjà l'état de l'opérateur.

**Présence de l'opérateur** : état instantané d'un opérateur déclaré (`PRESENT`, `EN_PAUSE` ou `ABSENT`). `ABSENT` est caractérisé par l'absence de journée ouverte.

**Couloir de supervision** : place d'un opérateur déclaré sur l'écran, dérivée de sa présence et de ses activités, parmi quatre couloirs dans un ordre fixe : `AU_TRAVAIL`, `SANS_AFFECTATION`, `EN_PAUSE`, `ABSENT`. `ABSENT` → Absents, même avec une activité ouverte ou une anomalie ; `EN_PAUSE` → En pause ; `PRESENT` sans activité → Sans affectation ; `PRESENT` avec au moins une activité → Au travail. La valeur est l'état au singulier ; le pluriel « Absents » n'existe que dans le libellé.

**Au travail** : couloir d'un opérateur présent qui a au moins une activité en cours, y compris hors OF. C'est un couloir dérivé, jamais un état de présence.

**Activité suspendue** : activité en cours d'un opérateur `EN_PAUSE`. La pause ne ferme pas les activités : elles restent ouvertes et s'affichent suspendues.

**Fenêtre de présence** : intervalle de présence effective d'un opérateur, pauses déduites, au sein d'une journée de travail.

**Segment de présence** : intervalle temporel de présence ou de pause au sein d'une ou plusieurs journées de travail, avec son début, sa fin, son type (présence ou pause) et l'indication d'un segment en cours.

**Activité de supervision** : activité en cours rattachée à un opérateur, portant sur un objet de l'activité, dotée d'une catégorie (ex: `NON_CONFORMITE`), d'un instant de début et facultativement d'un poste.

**Poste** : poste de travail d'une activité, avec son identifiant, son libellé et facultativement sa nature de travail. Les activités d'un opérateur s'ordonnent par libellé de poste, celles sans poste en dernier, puis par début.

**Nature de travail** : texte libre non vide, affiché tel que saisi et nommé « Métier » à l'écran ; c'est la nature d'un poste et les métiers d'un opérateur.

**Objet de l'activité** : ce sur quoi porte une activité : un élément travaillé, ou Hors OF.

**Élément travaillé** : moule (`PRODUIT`) ou OF (`ORDRE_DE_FABRICATION`) sur lequel l'opérateur travaille, avec son nom et sa référence facultative. Sans référence, l'écran le désigne par son nom ; aucune référence n'est fabriquée.

**Hors OF** : activité sans élément travaillé, pour le travail non facturable. Elle compte comme du travail : son opérateur est Au travail.

**Instant** : date et heure absolues validées, indépendantes du fuseau de représentation. Le début d'une activité, l'ouverture d'une journée et l'évaluation de la supervision sont des usages de cette même valeur ; sa représentation publique est normalisée en UTC.

**Catégorie d'activité** : `TRAVAIL` ou `NON_CONFORMITE`, les valeurs du contrat de l'API ; `NON_CONFORMITE` fait d'une activité une activité NC.

**Sans affectation** : état opérationnel d'un opérateur présent qui n'a aucune activité en cours ; c'est le couloir `SANS_AFFECTATION`.

**Opérateur en non-conformité** : opérateur dont la venue est ouverte (`PRESENT` ou `EN_PAUSE`) et qui a au moins une activité NC. Un absent n'en est jamais un, même avec une activité NC restée ouverte : son départ a arrêté son temps.

> « GLM » n'est pas un concept du produit : c'est le nom que l'entreprise cliente donne à son travail non facturable, par exemple un projet interne, qu'elle veut déclarer manuellement. Ce travail est désormais modélisé comme « Hors OF ». La présence sans affectation n'en est pas, et toujours aucun type, champ ni sélecteur ne s'appelle GLM.

**Anomalie de supervision** : signalement d'incohérence constaté lors de l'évaluation de la supervision (`JOURNEE_OUVERTE_PLUS_DE_16_HEURES`, `JOURNEE_OUVERTE_SANS_FENETRES`, `ACTIVITE_D_UN_ABSENT`).

**Résultat de supervision** : évaluation de la supervision, exploitable avec la liste ordonnée des opérateurs supervisés, ou inexploitable (notamment en présence d'une `ACTIVITE_SANS_OPERATEUR_IDENTIFIABLE`).

## Responsabilités et invariants

- La présence d'un opérateur déclaré est déterminée exclusivement par sa journée de travail : présent ou en pause si une journée est ouverte, absent en l'absence de journée ouverte.
- Une journée de travail est une venue indépendante du calendrier : les venues traversant minuit et les anciennes journées restées ouvertes sont prises en compte sans filtre calendaire.
- Chaque opérateur déclaré apparaît dans exactement un couloir de supervision. Les quatre couloirs existent toujours, dans l'ordre fixe, même vides ; l'ordre des opérateurs est alphabétique (nom, prénom, identifiant) à l'intérieur de chaque couloir.
- La NC est une surcouche de l'activité, jamais un couloir.
- Les segments de présence d'un opérateur sont dérivés de ses journées de travail : les intervalles effectifs et les pauses intercalaires ou de session sont calculés par le domaine.
- Le nombre de présents et les listes d'opérateurs en NC et à vérifier sont évalués par l'agrégat SupervisionDeLAtelier.
- Les activités en cours sont associées aux opérateurs déclarés correspondants ; un opérateur peut avoir 0 à N activités.
- « Sans affectation » est un état dérivé : un opérateur est sans affectation si et seulement s'il est présent et n'a aucune activité en cours.
- L'absence de poste ou l'absence d'heure d'ouverture est représentée sans valeur fabriquée (`undefined`).
- Le temps affichable reste un instant absolu, jamais une durée calculée par le domaine.
- L'instant d'évaluation est obligatoire. Les instants invalides ou dépourvus de fuseau sont refusés à la construction.
- L'ouverture est le plus ancien début de fenêtre, indépendamment de l'ordre reçu. La supervision expose cet instant ou son absence.
- La détection d'une anomalie préserve l'état de présence, le couloir et les activités de l'opérateur supervisé.
- Le seuil de dépassement d'ouverture de journée (strictement supérieur à 16 heures) est calculé par rapport à l'instant d'évaluation fourni.
- Une activité sans opérateur identifiable rend le résultat inexploitable ; le primaire affiche une erreur sans conserver les couloirs précédents.
- Pendant une relecture (toutes les 30 s ou « Actualiser »), les couloirs affichés restent visibles et se réévaluent à la fin de la lecture ; seul le premier chargement affiche l'écran de chargement, et une erreur remplace toujours les couloirs.
- La supervision est immuable.
- Les collections reçues par les modèles sont copiées à la construction ; modifier le tableau source ne change pas une valeur déjà construite.
- Ce contexte ne dépend d'aucun contexte de `pupitre` et ne partage aucun modèle métier avec lui.
- Seul l'adaptateur InMemory existe ; il porte en dur le jeu de démonstration, y compris en production, jusqu'à ce que l'API expose les journées ouvertes.

## Règles locales

Pour l'acquisition des données de la vue, appliquer la [règle de composition des lectures](../../../../../../documentation/architecture.md#acquire-a-view-through-one-read-port-by-default).

Consulter l'[ADR 0031](../../../../../../documentation/adr/0031-own-workshop-supervision-in-gestion.md) pour les arbitrages d'architecture et la séparation des responsabilités.

Consulter l'[ADR 0041](../../../../../../documentation/adr/0041-sort-workshop-supervision-into-state-lanes.md) pour la forme en couloirs d'état et les règles d'affichage retenues avec le client, et l'[ADR 0040](../../../../../../documentation/adr/0040-colour-non-conformity-yellow.md) pour les couleurs.
