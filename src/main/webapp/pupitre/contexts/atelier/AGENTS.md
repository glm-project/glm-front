# Atelier du pupitre

Ce contexte appartient exclusivement à `pupitre`. Il capture les gestes de l'atelier, maintient leur journal hors ligne et pilote la désignation temporaire de l'opérateur.

## Langage

**Matricule** : code saisi au pupitre pour retrouver localement un opérateur du référentiel d'atelier. Il ne constitue ni un secret ni une preuve d'identité; éviter mot de passe et code PIN. Sa définition est locale au pupitre et ne crée aucun contrat métier avec `gestion`.

**Désignation opérateur** : choix de l'opérateur au nom duquel les prochains gestes sont déclarés, depuis la saisie et la validation du matricule jusqu'à la fin de la désignation. Employer ce terme plutôt que connexion, authentification ou login opérateur.

**Fenêtre opérateur** : période temporaire pendant laquelle un opérateur reste désigné pour enchaîner des gestes. Elle possède la vue métier personnelle du pointage et en fige les durées à son ouverture. Elle se termine après inactivité ou par l'action « J'ai fini »; ce n'est pas une session de connexion.

**Vue de pointage** : projection personnelle prête à rendre des éléments de l'atelier, regroupés et ordonnés avec leur numéro résolu, l'activité de l'opérateur désigné, sa catégorie et sa durée figée. Elle ne porte ni libellé d'écran ni choix de style.

**Numéro d'élément** : référence attribuée par l'entreprise lorsqu'elle existe, sinon nom généré de l'élément. C'est l'identifiant visible et la clé du tri naturel sur la vue de pointage.

**Journal du pupitre** : document durable propre à une entreprise, qui conserve le dernier référentiel complet, les gestes dans leur ordre d'acceptation locale, leur résultat de publication et l'état de connexion observé. C'est la racine de cohérence locale; le référentiel qu'il contient reste un modèle de lecture et non un agrégat du pupitre.

## Responsabilités et invariants

- La saisie, la validation et l'expiration de la désignation, ainsi que les gestes permis pendant la fenêtre, appartiennent au domaine.
- La fenêtre opérateur expose la vue de pointage; elle sélectionne les activités de l'opérateur désigné, distingue leur catégorie, expose le numéro de chaque élément avec son repli, regroupe et trie les éléments, puis calcule leur durée à partir de l'instant figé à son ouverture.
- Toutes les durées d'une vue de pointage partagent l'instant d'ouverture de la fenêtre. Une activité apparue après cet instant est immédiatement visible avec une durée nulle; aucun geste ne rééchantillonne les autres durées.
- Une tuile représente toujours un élément et agrège toutes les activités que l'opérateur désigné y a ouvertes sur différents postes. Elle est en non-conformité dès qu'une de ces activités l'est, sa durée part de la plus ancienne activité encore ouverte et ses actions visent tout l'agrégat.
- La cible principale d'une tuile active termine toutes ses activités personnelles. Sa cible secondaire remet en travail les seules activités en non-conformité dès qu'il en existe une; sinon elle place en non-conformité toutes les activités en travail. Une action n'émet jamais une transition déjà atteinte.
- L'adaptateur primaire annonce la cible tactile pressée et, lorsque le domaine le demande, le poste choisi. La fenêtre opérateur traduit cette intention en types de pointage et en lot de gestes; le composant ne construit pas d'événement d'atelier.
- Lorsqu'une ouverture exige de choisir parmi plusieurs postes habilités, la fenêtre opérateur retourne explicitement ce besoin. La pop-up ne conserve qu'une attente éphémère, et le domaine revalide la fenêtre et le poste au choix final; fermer ou laisser expirer cette attente ne produit aucun geste.
- Un pointage sans choix de poste reçoit son identifiant et son heure à la pression sur sa cible. Avec une pop-up multiposte, ils naissent au choix final du poste; ouvrir puis abandonner la pop-up ne crée aucune identité de geste.
- Une fenêtre ouverte réconcilie chaque nouvelle version du journal de son entreprise sans changer l'opérateur désigné ni son instant d'observation. La projection optimiste disparaît ainsi dès qu'un geste de cette fenêtre est refusé.
- La fenêtre expose au plus le dernier refus d'un geste né pendant son ouverture, accompagné du numéro de l'élément concerné. Une nouvelle intention tactile l'efface; les refus issus du rejeu de fenêtres antérieures restent silencieux.
- Le pupitre accepte durablement les gestes avant de les confirmer et les publie ensuite.
- Toute modification du journal du pupitre est atomique pour une entreprise; les journaux de deux entreprises restent indépendants.
- Un geste conserve l'opérateur, l'identifiant et l'heure fixés à son initiation.
- Une référence incomplète ou un échec de rafraîchissement ne remplace jamais la dernière référence complète.

## Règles locales

L'adaptateur primaire de pointage expose les intentions de l'écran. La composition du pupitre possède la navigation entre écrans, la fermeture de la fenêtre et l'orchestration des séquences globales.

Pendant l'acceptation durable d'une action, l'adaptateur primaire désactive les deux cibles de la tuile concernée et tous les choix de sa pop-up après sélection. Les autres tuiles restent disponibles; un échec local réactive les contrôles sans avancer la vue.

Un échec d'acceptation locale affiche dans le chrome « Pointage non enregistré — recommencez ». Ce message technique persiste jusqu'à la prochaine acceptation durable réussie ou la fermeture de la fenêtre; il ne se confond ni avec un refus métier ni avec l'état réseau.

Les libellés métier du pupitre vivent dans un module unique de ce contexte et sont indexés par ses types de domaine. Ne pas partager ce vocabulaire avec `gestion` ni l'adosser aux types générés de l'API.

Lire [Offline pupitre](../../../../../../documentation/offline-pupitre.md) avant de changer la désignation, le journal, le rejeu ou le runtime, et les [ADR pertinents](../../../../../../documentation/adr/README.md) avant de rouvrir une décision. Les échanges futurs avec un autre contexte de `pupitre` passent par un port et un adaptateur TypeScript, sans import direct de son domaine.
