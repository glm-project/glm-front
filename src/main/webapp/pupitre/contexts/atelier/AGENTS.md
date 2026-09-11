# Atelier du pupitre

Ce contexte appartient exclusivement à `pupitre`. Il capture les gestes de l'atelier, maintient leur journal hors ligne et pilote la désignation temporaire de l'opérateur.

## Langage

**Matricule** : code saisi au pupitre pour retrouver localement un opérateur du référentiel d'atelier. Il ne constitue ni un secret ni une preuve d'identité; éviter mot de passe et code PIN. Sa définition est locale au pupitre et ne crée aucun contrat métier avec `gestion`.

**Désignation opérateur** : choix de l'opérateur au nom duquel les prochains gestes sont déclarés, depuis la saisie et la validation du matricule jusqu'à la fin de la désignation. Employer ce terme plutôt que connexion, authentification ou login opérateur.

**Fenêtre opérateur** : période temporaire pendant laquelle un opérateur reste désigné pour enchaîner des gestes. Elle possède la vue métier personnelle du pointage et en fige les durées à son ouverture. Elle se termine après inactivité ou par l'action « J'ai fini »; ce n'est pas une session de connexion.

**Identité de fenêtre** : valeur qui distingue une ouverture des suivantes et reste identique à travers ses versions immuables. Elle permet de retrouver la fenêtre courante d'une capture ou d'un choix de poste initié auparavant.

**Intention globale initiée** : commande globale retenue avec l'identité racine et l'heure fixées à la pression. Elle prépare son lot à partir de la fenêtre mise à jour au moment de sa capture, sans nouvelle identité aléatoire ni nouvel échantillonnage du temps.

**Vue de pointage** : projection personnelle prête à rendre des éléments de l'atelier, regroupés et ordonnés avec leur numéro résolu, l'activité de l'opérateur désigné, sa catégorie et sa durée figée. Elle ne porte ni libellé d'écran ni choix de style.

**Numéro d'élément** : référence attribuée par l'entreprise lorsqu'elle existe, sinon nom généré de l'élément. C'est l'identifiant visible et la clé du tri naturel sur la vue de pointage.

**Journal du pupitre** : document durable propre à une entreprise, qui conserve le dernier référentiel complet, les gestes dans leur ordre d'acceptation locale, leur résultat de publication et l'état de connexion observé. C'est la racine de cohérence locale; le référentiel qu'il contient reste un modèle de lecture et non un agrégat du pupitre.

**Bilan de publication** : issue du traitement des gestes en attente. Un bilan terminé permet de rafraîchir le référentiel, y compris si des refus métier ont été conservés. Un bilan interrompu impose de conserver le référentiel. `BilanDePublication` porte cette décision; l'orchestration vérifie séparément l'autorisation d'échanger.

**Entreprise** : portée d'un journal du pupitre et de tous les gestes qu'il contient. Deux journaux d'entreprises différentes restent indépendants.

## Responsabilités et invariants

- La saisie, la validation et l'expiration de la désignation, ainsi que les gestes permis pendant la fenêtre, appartiennent au domaine.
- La fenêtre opérateur expose la vue de pointage; elle sélectionne les activités de l'opérateur désigné, distingue leur catégorie, expose le numéro de chaque élément avec son repli, regroupe et trie les éléments, puis calcule leur durée à partir de l'instant figé à son ouverture.
- Toutes les durées d'une vue de pointage partagent l'instant d'ouverture de la fenêtre. Une activité apparue après cet instant est immédiatement visible avec une durée nulle; aucun geste ne rééchantillonne les autres durées.
- Une tuile représente toujours un élément et agrège toutes les activités que l'opérateur désigné y a ouvertes sur différents postes. Elle est en non-conformité dès qu'une de ces activités l'est, sa durée part de la plus ancienne activité encore ouverte et ses actions visent tout l'agrégat.
- La cible principale d'une tuile active termine toutes ses activités personnelles. Sa cible secondaire remet en travail les seules activités en non-conformité dès qu'il en existe une; sinon elle place en non-conformité toutes les activités en travail. Une action n'émet jamais une transition déjà atteinte.
- L'adaptateur primaire annonce la cible tactile pressée et, lorsque le domaine le demande, le poste choisi. La fenêtre opérateur traduit cette intention en types de pointage et en lot de gestes; le composant ne construit pas d'événement d'atelier.
- La première commande métier d'une fenêtre assure l'arrivée avant les gestes demandés, y compris pour une commande globale. Une reprise explicite devenue redondante parce que cette assurance vient d'ouvrir la journée est absorbée comme cette seule exception contextuelle.
- Une reprise implicite précède seulement une intention qui ouvre ou reprend effectivement une activité. Elle ne précède ni une fin d'activité ni une commande explicite de présence.
- Lorsqu'une ouverture exige de choisir parmi plusieurs postes habilités, la fenêtre opérateur retourne explicitement ce besoin. La pop-up ne conserve qu'une attente éphémère, et le domaine revalide la fenêtre et le poste au choix final; fermer ou laisser expirer cette attente ne produit aucun geste.
- Un pointage sans choix de poste reçoit son identifiant et son heure à la pression sur sa cible. Avec une pop-up multiposte, ils naissent au choix final du poste; ouvrir puis abandonner la pop-up ne crée aucune identité de geste.
- Une fenêtre ouverte réconcilie chaque nouvelle version du journal de son entreprise sans changer l'opérateur désigné ni son instant d'observation. La projection optimiste disparaît ainsi dès qu'un geste de cette fenêtre est refusé.
- La fenêtre expose au plus le dernier refus d'un geste né pendant son ouverture, accompagné du numéro de l'élément concerné. Une nouvelle intention tactile l'efface; les refus issus du rejeu de fenêtres antérieures restent silencieux.
- Le pupitre accepte durablement les gestes avant de les confirmer et les publie ensuite.
- Toute modification du journal du pupitre est atomique pour une entreprise; les journaux de deux entreprises restent indépendants.
- Un geste conserve l'opérateur, l'identifiant et l'heure fixés à son initiation.
- « Tout arrêter » forme un unique lot local atomique et ordonné : toutes les fins des activités personnelles connues, puis le départ. Un échec d'acceptation locale n'en conserve aucune partie; après acceptation, le rejeu FIFO poursuit les gestes suivants malgré un refus métier connu.
- Une commande globale pressée pendant des captures déjà initiées est conservée puis décidée sur la fenêtre mise à jour après leur acceptation. Dès cette intention, les tuiles et les commandes globales restent indisponibles jusqu'à l'acceptation locale du lot; « J'ai fini » reste disponible, ferme immédiatement la vue et laisse les gestes initiés se terminer.
- Une référence incomplète ou un échec de rafraîchissement ne remplace jamais la dernière référence complète.
- Le pupitre écrit des identifiants et n'affiche que des libellés; un libellé périmé ne corrompt aucune donnée.
- La fraîcheur du référentiel se pousse en arrière-plan, par une synchronisation complète qui publie d'abord les gestes en attente, et ne se place jamais sur le chemin d'un geste.
- Un même matricule inconnu ne pousse qu'une fois : le référentiel qui vient d'être lu ne le connaîtra pas davantage. Une désignation réussie libère cette retenue.

## Règles locales

L'adaptateur primaire de pointage expose les intentions de l'écran. La composition du pupitre possède la navigation entre écrans, la fermeture de la fenêtre et l'orchestration des séquences globales.

La page routée commune possède le chrome permanent, la désignation et le pointage. Elle porte le garde d'inactivité sur toute cette surface et appelle `CurrentOperateurLifecycle.finish()` à sa destruction. Le shell racine ne possède que le démarrage technique et le routeur; le coordinateur de désignation n'interprète pas sa propre destruction comme la sortie de cette page.

`CurrentOperateurLifecycle` possède l'unique version courante de `DesignationOperateur` et en dérive les vues. `FraicheurDuReferentiel` possède la décision de rafraîchir : `refresh()` pour l'attendre, `push()` pour la pousser en arrière-plan. Tout déclencheur y aboutit, `AtelierCoordinator.synchronize()` compris, en passant par `CurrentOperateurLifecycle` qui fournit la réconciliation appliquant le résultat; la liste des déclencheurs vit dans [Offline pupitre](../../../../../../documentation/offline-pupitre.md). `AtelierCoordinator` orchestre les commandes de gestes et leur capture. La fenêtre porte l'exclusion pendant une intention globale initiée; les signaux de disponibilité la reflètent. Les deux orchestrations partagent la même file d'acceptation locale, que la fermeture attend sans dépendre du coordinateur de gestes.

Pendant l'acceptation durable d'une action, l'adaptateur primaire désactive les deux cibles de la tuile concernée et tous les choix de sa pop-up après sélection. Les autres tuiles restent disponibles; un échec local réactive les contrôles sans avancer la vue.

Un échec d'acceptation locale affiche dans le chrome « Action non enregistrée — recommencez ». Ce message technique persiste jusqu'à la prochaine acceptation durable réussie ou la fermeture de la fenêtre; il ne se confond ni avec un refus métier ni avec l'état réseau.

Le chrome accompagne un refus métier du numéro de l'élément pour un pointage et du libellé `PAUSE`, `REPRENDRE` ou `TOUT ARRÊTER` pour une présence issue d'une commande globale. Il montre le message du serveur et seulement le dernier refus du lot.

Tant que l'appareil n'est pas enrôlé et que son premier référentiel complet n'est pas actif, la composition rend l'écran d'enrôlement sous le chrome permanent, jamais un pavé ni un pointage. La bascule lit l'état projeté par le contexte [enrôlement](../enrolement/AGENTS.md), pas la seule présence du référentiel. Ce contexte n'expose son état de chargement que par l'adaptateur primaire `TypeScriptChargementDeLAtelier`, appelé depuis un adaptateur secondaire d'`enrolement`.

Les libellés métier du pupitre vivent dans un module unique de ce contexte et sont indexés par ses types de domaine. Ne pas partager ce vocabulaire avec `gestion` ni l'adosser aux types générés de l'API.

`AuthenticationPort` appartient au shared kernel et continue de répondre un `tenant` en chaîne : un shared kernel ne peut pas nommer `Entreprise`. `EtatHorsLigneDuPupitre` et `PupitreSynchronization` traduisent à cette couture; ne pas remonter le type dans le port, `HexagonalArchTest` le refuse. `PupitreSynchronization` consomme également `DeviceSessionPort.withSession` pour garantir l'exclusion mutuelle entre le rejeu des gestes et le renouvellement réseau des jetons de l'appareil. Le matricule du pupitre ne traverse pas non plus vers `gestion`, qui possède le sien.

Lire [Offline pupitre](../../../../../../documentation/offline-pupitre.md) avant de changer la désignation, le journal, le rejeu ou le runtime, et les [ADR pertinents](../../../../../../documentation/adr/README.md) avant de rouvrir une décision. Les échanges futurs avec un autre contexte de `pupitre` passent par un port et un adaptateur TypeScript, sans import direct de son domaine.
