# Atelier du pupitre

Ce contexte appartient exclusivement à `pupitre`. Il capture les gestes de l'atelier, maintient leur journal hors ligne et pilote la désignation temporaire de l'opérateur.

## Comptabilisation opérationnelle

L'[ADR 0047](../../../../../../documentation/adr/0047-count-only-finished-activities.md) distingue
la comptabilisation des rapports de l'indication conservée au pupitre.

**Durée écoulée indicative** : durée affichée pour une activité en cours, figée à l'ouverture de la
fenêtre opérateur selon les règles existantes ci-dessous. Elle aide l'opérateur à lire son activité ;
elle ne constitue pas une durée comptabilisée dans les rapports.

## Langage

**Clé d'activité** : opérateur et poste, au sein d'un suivi. Une clé porte au plus une activité en cours.
Le pupitre n'envoie que trois pointages (`DEBUT`, `NON_CONFORMITE`, `FIN`), sans intention ni cible : une
`FIN` ferme l'activité de sa clé, et une ouverture sur une clé déjà occupée est ignorée par le serveur
(`DEJA_EN_COURS`). La projection locale applique `FIN` et ouverture comme le serveur : une ouverture sur une clé occupée est sans effet. Elle ne juge pas `ANTERIEUR` (un geste plus ancien que le dernier accepté de la clé, ni une `FIN` à l'heure du début ou avant lui) : l'écart dure jusqu'au recalage sur le référentiel de la synchronisation suivante, qui le corrige sans message. La règle
de réception est posée par l'[ADR 0054](../../../../../../documentation/adr/0054-ignore-incoherent-pointages-at-reception.md).

**Geste composé** : un appui qui change la catégorie d'un travail envoie deux pointages à la même heure, la
`FIN` d'abord, avec le poste de chaque activité. NC pendant un travail envoie une `FIN` puis une
`NON_CONFORMITE` par activité en travail ; « FIN NC » (cible secondaire d'une tuile en non-conformité) envoie une `FIN` puis un `DEBUT` par activité en non-conformité. Le pupitre ne relance pas :
il ferme l'activité par une `FIN` explicite avant d'en ouvrir une autre ([ADR 0054](../../../../../../documentation/adr/0054-ignore-incoherent-pointages-at-reception.md)).

**Durée maximale** : durée d'une activité sans fin pointée, lue du référentiel (`dureeMaximaleDActivite`,
ISO-8601, par exemple `PT13H`) et gardée en millisecondes. Le pupitre ne connaît aucune valeur en dur : une
valeur absente, illisible ou nulle rejette la lecture du référentiel, qui garde le précédent. L'échéance des
activités connues du serveur est celle que le référentiel donne ; celle d'une activité ouverte localement
est l'heure du geste plus la durée maximale. Limite connue : le serveur fige la durée à la réception de
l'ouverture, non à l'heure du geste, et ne garde aucun historique du réglage.

**Activité échue** : activité dont l'échéance est atteinte. Elle cesse d'être active et ne peut plus être
mise en pause, mais le serveur la compte comme terminée : une ouverture dont l'heure atteint l'échéance
(`>=`) libère la clé et remplace l'activité échue, localement comme au serveur. Le pupitre calcule cette
expiration y compris hors ligne, sans créer de `FIN`. Le gel de la durée indicative ne gèle pas cet état.

**Pointage ignoré** : pointage que le serveur juge incompatible avec l'état de sa clé et refuse en 409
`pointage-ignore`. Le pupitre retire son effet local et se recale sur le référentiel de la synchronisation
suivante, par le mécanisme existant ; le refus reste au journal local (ADR 0049, [ADR 0054](../../../../../../documentation/adr/0054-ignore-incoherent-pointages-at-reception.md)).

**Refus affiché** : seul le refus `suivi-d-atelier-cloture` est montré à l'opérateur
(`MotifDeRefus.isShownToTheOperator()`). Tout autre refus, y compris un code que l'adaptateur ne reconnaît
pas, reste au journal local sans affichage. Un lot qui mêle un refus silencieux et une clôture expose la
clôture.

**Identifiant** : code de 1 à 6 chiffres saisi au pupitre pour retrouver localement un opérateur du référentiel d'atelier ; le pavé ignore un septième chiffre. Il ne constitue ni un secret ni une preuve d'identité; éviter mot de passe et code PIN. Sa définition est locale au pupitre et ne crée aucun contrat métier avec `gestion`.

**Désignation opérateur** : choix de l'opérateur au nom duquel les prochains gestes sont déclarés, depuis la saisie et la validation de l'identifiant jusqu'à la fin de la désignation. Employer ce terme plutôt que connexion, authentification ou login opérateur.

**Fenêtre opérateur** : période temporaire pendant laquelle un opérateur reste désigné pour enchaîner des gestes. Elle possède la vue métier personnelle du pointage et en fige les durées à son ouverture. Elle se termine après inactivité ou par l'action « J'ai fini »; ce n'est pas une session de connexion.

**Identité de fenêtre** : valeur qui distingue une ouverture des suivantes et reste identique à travers ses versions immuables. Elle permet de retrouver la fenêtre courante d'une capture ou d'un choix de poste initié auparavant.

**Intention globale initiée** : commande globale retenue avec l'identité racine et l'heure fixées à la déclaration de l'intention, soit à l'échéance de l'appui maintenu sur la commande. Elle prépare son lot à partir de la fenêtre mise à jour au moment de sa capture, sans nouvelle identité aléatoire ni nouvel échantillonnage du temps.

**Vue de pointage** : projection personnelle prête à rendre des éléments de l'atelier, regroupés et ordonnés avec leur numéro résolu, l'activité de l'opérateur désigné, sa catégorie et sa durée figée. Elle ne porte ni libellé d'écran ni choix de style.

**Zone** ([ADR 0053](../../../../../../documentation/adr/0053-replace-the-element-type-with-company-categories.md)) : regroupement des éléments de la vue de pointage par catégorie de produit (`MOULE`, `OF`…). Le code de la catégorie titre la zone tel quel ; une catégorie sans élément n'a pas de zone. Les zones suivent l'ordre des catégories du référentiel (`categories`, l'ordre choisi par le gestionnaire) ; une catégorie que cet ordre ne connaît pas vient ensuite, par code.

**Pause** : arrêt, par la commande PAUSE, de toutes les activités personnelles que le pupitre connaît pour l'opérateur désigné, retenu pour être rouvert. Elle est identifiée par l'identité racine de l'intention globale initiée qui l'a prise. Le serveur n'en sait rien : il ne reçoit que des fins.

**Activité suspendue** : activité arrêtée par une pause, avec son élément, son poste et le pointage qui la rouvrira — `DEBUT`, ou `NON_CONFORMITE` pour une activité en non-conformité. La fin qui l'arrête porte sa **suspension** : la pause et ce pointage de réouverture. Éviter : activité en pause.

**Pause en cours** : la dernière pause d'un opérateur dans le journal de ce pupitre, tant qu'elle n'a pas pris fin et qu'une activité suspendue reste à rouvrir. `PauseEnCours` la lit sur le journal restant, qui garde toujours la dernière pause de chaque opérateur, avec le référentiel projeté.

**Numéro d'élément** : référence attribuée par l'entreprise lorsqu'elle existe, sinon nom généré de l'élément. C'est l'identifiant visible et la clé du tri naturel sur la vue de pointage.

**Journal du pupitre** : document durable propre à une entreprise, qui conserve le dernier référentiel complet, les gestes en attente et refusés dans leur ordre d'acceptation locale, avec, des gestes acceptés, seulement le dernier de chaque opérateur et ceux de sa dernière pause, ainsi que l'état de connexion observé. Un geste accepté déjà intégré à un référentiel complet activé est oublié, dans la même transaction que l'activation. C'est la racine de cohérence locale; le référentiel qu'il contient reste un modèle de lecture et non un agrégat du pupitre.

**Bilan de publication** : issue du traitement des gestes en attente. Un bilan terminé permet de rafraîchir le référentiel, y compris si des refus métier ont été conservés. Un bilan interrompu impose de conserver le référentiel. `BilanDePublication` porte cette décision; l'orchestration vérifie séparément l'autorisation d'échanger.

**Retard de publication** : situation où le plus ancien geste en attente du journal de l'entreprise est survenu au moins une heure avant l'instant d'évaluation (seuil inclus, `SEUIL_DU_RETARD_DE_PUBLICATION`). L'écran de désignation demande alors de prévenir le superviseur. Les gestes acceptés et refusés n'y comptent pas.

**Entreprise** : portée d'un journal du pupitre et de tous les gestes qu'il contient. Deux journaux d'entreprises différentes restent indépendants.

> « GLM » n'est pas un concept du produit : c'est le nom que l'entreprise cliente donne à son travail non facturable, par exemple un projet interne, qu'elle veut déclarer manuellement. Ce travail n'est pas encore modélisé. Une activité manquante n'en constitue aucune preuve, et aucun type, champ ni sélecteur ne s'appelle GLM.

## Responsabilités et invariants

- La saisie, la validation et l'expiration de la désignation, ainsi que les gestes permis pendant la fenêtre, appartiennent au domaine.
- La fenêtre opérateur expose la vue de pointage; elle sélectionne les activités de l'opérateur désigné, distingue leur catégorie, expose le numéro de chaque élément avec son repli, regroupe et trie les éléments, puis calcule leur durée à partir de l'instant figé à son ouverture.
- Toutes les durées d'une vue de pointage partagent l'instant d'ouverture de la fenêtre. Une activité apparue après cet instant est immédiatement visible avec une durée nulle; aucun geste ne rééchantillonne les autres durées.
- Une tuile représente toujours un élément et agrège toutes les activités que l'opérateur désigné y a ouvertes sur différents postes. Elle est en non-conformité dès qu'une de ces activités l'est, sa durée part de la plus ancienne activité encore ouverte et ses actions visent tout l'agrégat.
- La cible principale d'une tuile active termine toutes ses activités personnelles. Sa cible secondaire (« FIN NC » dès qu'une activité est en non-conformité, sinon « NC ») compose une `FIN` puis une ouverture pour chaque activité concernée (voir « Geste composé ») : elle remet en travail les seules activités en non-conformité dès qu'il en existe une; sinon elle place en non-conformité toutes les activités en travail.
- L'adaptateur primaire annonce la cible tactile pressée et, lorsque le domaine le demande, le poste choisi. La fenêtre opérateur traduit cette intention en pointages demandés (`PointageDemande` : type et poste) puis en lot de gestes; le composant ne construit pas d'événement d'atelier.
- Lorsqu'une ouverture exige de choisir parmi plusieurs postes habilités, la fenêtre opérateur retourne explicitement ce besoin. La pop-up ne conserve qu'une attente éphémère, et le domaine revalide la fenêtre et le poste au choix final; fermer ou laisser expirer cette attente ne produit aucun geste.
- Un pointage sans choix de poste reçoit son identifiant et son heure à la déclaration de son intention, soit à l'échéance de l'appui maintenu sur sa cible. Avec une pop-up multiposte, ils naissent au choix final du poste; ouvrir puis abandonner la pop-up ne crée aucune identité de geste.
- Une fenêtre ouverte réconcilie chaque nouvelle version du journal de son entreprise sans changer l'opérateur désigné ni son instant d'observation. La projection optimiste disparaît ainsi dès qu'un geste de cette fenêtre est refusé.
- La fenêtre expose au plus le dernier refus affichable d'un geste né pendant son ouverture, accompagné du numéro de l'élément concerné : seul le refus de clôture l'est. Une nouvelle intention tactile l'efface; les refus issus du rejeu de fenêtres antérieures restent silencieux.
- Le pupitre accepte durablement les gestes avant de les confirmer et les publie ensuite.
- `RetardDePublication.of(journal, instant)` répond `undefined` ou `{ gestes, depuis }` : `gestes` est le nombre total de gestes en attente et `depuis` l'ancienneté du plus ancien. Le signal `retardDePublication` d'`EtatHorsLigneDuPupitre` n'avance que lorsque `updateClock()` pousse l'instant courant : l'écran de désignation le fait à son affichage puis chaque minute, et cesse à sa destruction. Il affiche le retard dans un bandeau d'état au-dessus de l'identifiant, sans bloquer la saisie.
- Toute modification du journal du pupitre est atomique pour une entreprise; les journaux de deux entreprises restent indépendants.
- Un geste conserve l'opérateur, l'identifiant et l'heure fixés à son initiation.
- « Tout arrêter » forme un unique lot local atomique et ordonné de fins, une par activité personnelle, avec l'invalidation durable de la reprise. Un échec d'acceptation locale n'en conserve aucune partie ; après acceptation, le rejeu FIFO poursuit les gestes suivants malgré un refus métier connu.
- PAUSE forme de même un unique lot atomique de fins : une fin par activité personnelle connue, sur son poste, portant sa suspension. La suspension ne quitte jamais le pupitre. Une pause ne ferme que ce que le référentiel du pupitre connaît; une activité ouverte ailleurs depuis le dernier rafraîchissement court pendant la pause.
- `PauseEnCours` est le seul propriétaire de la fin d'une pause et de ce qu'elle rouvre. La pause d'un opérateur est celle de sa dernière suspension; elle prend fin à REPRENDRE, à tout autre geste de cet opérateur ajouté au journal de ce pupitre, quel que soit son sort à la publication, et dès que le référentiel projeté montre une activité de l'opérateur autre qu'une activité dont la suspension a été refusée. Une pause n'expire jamais ; seules les activités interprétables non expirées font obstacle à sa reprise. L'oubli des gestes acceptés à l'activation du référentiel ne change pas son résultat : il garde le dernier geste de chaque opérateur et les gestes de sa dernière pause, que `DernierePause` désigne pour les deux règles.
- REPRENDRE rouvre, sur le même poste et par le pointage retenu, chaque activité suspendue dont la suspension n'a pas été refusée, dont l'élément est encore au référentiel projeté, dont le poste est encore habilité et qui n'est pas déjà ouverte au même élément et au même poste — une ouverture sur une clé occupée serait ignorée. La reprise n'a lieu que sur le pupitre qui a pris la pause.
- Une commande globale pressée pendant des captures déjà initiées est conservée puis décidée sur la fenêtre mise à jour après leur acceptation. PAUSE ou REPRENDRE décidée sur une fenêtre où il n'y a plus rien à suspendre ou à rouvrir n'enregistre aucun geste, aucun pointage. Dès cette intention, les tuiles et les commandes globales restent indisponibles jusqu'à l'acceptation locale du lot; « J'ai fini » reste disponible, ferme immédiatement la vue et laisse les gestes initiés se terminer.
- Un échec de la lecture du référentiel ne remplace jamais le dernier référentiel complet. Cette lecture est un appel unique et non paginé avec des identifiants uniques. Le backend utilise READ COMMITTED : ses requêtes successives peuvent observer des commits concurrents. Le pupitre ignore la version reçue ; l'acquisition complète ne garantit aucun instantané transactionnel commun.
- Un référentiel n'est disponible pour l'enrôlement que si la vue active appartient à l'entreprise actuellement sélectionnée.
- Le pupitre écrit des identifiants et n'affiche que des libellés; un libellé périmé ne corrompt aucune donnée.
- La fraîcheur du référentiel se pousse en arrière-plan, par une synchronisation complète qui publie d'abord les gestes en attente, et ne se place jamais sur le chemin d'un geste.
- Un même identifiant inconnu ne pousse qu'une fois : le référentiel qui vient d'être lu ne le connaîtra pas davantage. Une désignation réussie libère cette retenue.

- `CommandesGlobales` offre PAUSE lorsqu'une activité personnelle interprétable non expirée reste connue, REPRENDRE lorsqu'une pause locale reste à rouvrir, TOUT ARRÊTER toujours. Le chrome montre l'identité désignée et l'éventuelle pause locale.
- Les commandes reçoivent explicitement leur instant d'évaluation. À l'échéance inclusive reçue du référentiel, une activité devient non actionnable ; la durée indicative garde l'instant d'ouverture de la fenêtre. `ActiviteExpirationSchedulerPort` possède un timer distinct de l'inactivité et réévalue sans fermer la désignation ni créer de FIN.
- TOUT ARRÊTER accepte N FIN et l'invalidation durable des pauses de cet opérateur dans une seule mutation, même pour N=0. Un échec n'avance ni journal ni fenêtre. Les pending et les refus sont conservés ; les gestes acceptés suivent la règle d'oubli du journal.
- Le format atelier courant possède sa clé versionnée par entreprise, `atelier-activites-v2:<entreprise>`. L'adapter retire les documents des préfixes obsolètes (`atelier:` et `atelier-activites-v1:`) via le port technique commun, sans les lire ni les migrer : la version change quand le format stocké ou une règle projetée change, pour réinitialiser les pupitres au déploiement, et leurs gestes en attente sont perdus. Credentials et enrôlement gardent leurs documents.

## Règles locales

L'adaptateur primaire de pointage expose les intentions de l'écran. La composition du pupitre possède la navigation entre écrans, la fermeture de la fenêtre et l'orchestration des séquences globales.

La page routée commune possède le chrome permanent, la désignation et le pointage. Elle porte le garde d'inactivité sur toute cette surface et appelle `CurrentOperateurLifecycle.finish()` à sa destruction. Le shell racine ne possède que le démarrage technique et le routeur; le coordinateur de désignation n'interprète pas sa propre destruction comme la sortie de cette page.

`CurrentOperateurLifecycle` possède l'unique version courante de `DesignationOperateur` et en dérive les vues. `FraicheurDuReferentiel` possède la décision de rafraîchir : `refresh()` pour l'attendre, `push()` pour la pousser en arrière-plan. Tout déclencheur y aboutit, `AtelierCoordinator.synchronize()` compris, en passant par `CurrentOperateurLifecycle` qui fournit la réconciliation appliquant le résultat; la liste des déclencheurs vit dans [Offline pupitre](../../../../../../documentation/offline-pupitre.md). `AtelierCoordinator` orchestre les commandes de gestes et leur capture. La fenêtre porte l'exclusion pendant une intention globale initiée; les signaux de disponibilité la reflètent. Les deux orchestrations partagent la même file d'acceptation locale, que la fermeture attend sans dépendre du coordinateur de gestes.

Les cibles de geste du pointage — actions des tuiles, commandes globales et choix de poste — ne déclenchent qu'après 1 s d'appui maintenu, signalé par une barre qui remplit la cible. Relâcher, ou glisser jusqu'à faire défiler, avant l'échéance n'émet rien ; une cible indisponible au début de l'appui ou à son échéance n'émet rien non plus. « Annuler » et « J'ai fini » restent immédiats. Voir l'[ADR 0044](../../../../../../documentation/adr/0044-confirm-pupitre-gestures-with-a-sustained-press.md).

Pendant l'acceptation durable d'une action, l'adaptateur primaire désactive les deux cibles de la tuile concernée et tous les choix de sa pop-up après sélection. Il ignore aussi, depuis son propre état, toute nouvelle intention sur cette tuile et tout autre choix de poste jusqu'à la fin de l'acceptation : deux appuis maintenus ensemble arrivent à échéance avant que la désactivation ne soit rendue. Les autres tuiles restent disponibles; un échec local réactive les contrôles sans avancer la vue.

Un échec d'acceptation locale affiche dans le chrome « Action non enregistrée — recommencez ». Ce message technique persiste jusqu'à la prochaine acceptation durable réussie ou la fermeture de la fenêtre; il ne se confond ni avec un refus métier ni avec l'état réseau.

Le chrome accompagne le refus de clôture du numéro de l'élément pour un pointage de tuile et du libellé `PAUSE`, `REPRENDRE` ou `TOUT ARRÊTER` pour un geste issu d'une commande globale. Il montre le message du serveur et seulement le dernier refus affichable du lot.

Tant que l'appareil n'est pas enrôlé et que son premier référentiel complet n'est pas actif, la composition rend l'écran d'enrôlement sous le chrome permanent, jamais un pavé ni un pointage. La bascule lit l'état projeté par le contexte [enrôlement](../enrolement/AGENTS.md), pas la seule présence du référentiel. Ce contexte n'expose son état de chargement que par l'adaptateur primaire `TypeScriptChargementDeLAtelier`, et le comptage des gestes en attente comme l'effacement des journaux que par `TypeScriptEffacementDesJournaux`, tous deux appelés depuis un adaptateur secondaire d'`enrolement`.

Les libellés métier du pupitre vivent dans un module unique de ce contexte et sont indexés par ses types de domaine. Ne pas partager ce vocabulaire avec `gestion` ni l'adosser aux types générés de l'API.

`AuthenticationPort` appartient au shared kernel et continue de répondre un `tenant` en chaîne : un shared kernel ne peut pas nommer `Entreprise`. `EtatHorsLigneDuPupitre` et `PupitreSynchronization` traduisent à cette couture; ne pas remonter le type dans le port, `HexagonalArchTest` le refuse. `PupitreSynchronization` consomme également `DeviceSessionPort.withSession` pour garantir l'exclusion mutuelle entre le rejeu des gestes et le renouvellement réseau des jetons de l'appareil. L'identifiant du pupitre ne traverse pas non plus vers `gestion`, qui possède le sien.

Le résultat du chargement initial est distinct de la connexion observée. `TypeScriptChargementDeLAtelier` expose la disponibilité du référentiel de l'entreprise courante; l'adaptateur secondaire d'`enrolement` traduit l'achèvement de la synchronisation en `CHARGE` ou `ECHEC`. Cette issue ne modifie pas l'indicateur de connexion, que seuls les résultats de publication établissent.

La réinitialisation explicite d'`enrolement` efface les journaux de tout l'appareil par `EffacementDesJournauxPort`, port distinct de `JournauxDuPupitrePort` qui reste un port par entreprise. `EffacementDesJournaux` possède l'orchestration : il attend les captures déjà initiées, prend le verrou `synchronisation` pour ne pas croiser un échange, efface, puis remplace la vue en mémoire par un journal vide. Sans ce dernier pas, la déconnexion conservant l'entreprise, le référentiel resterait disponible sur un disque vide. Le même service compte les gestes en attente de l'entreprise courante par `JournauxDuPupitrePort.read` et `EvenementsDuJournal.pendingCount()`. Voir l'[ADR 0050](../../../../../../documentation/adr/0050-erase-workshop-journals-on-explicit-reset.md).

Lire [Offline pupitre](../../../../../../documentation/offline-pupitre.md) avant de changer la désignation, le journal, le rejeu ou le runtime, et les [ADR pertinents](../../../../../../documentation/adr/README.md) avant de rouvrir une décision. Les échanges futurs avec un autre contexte de `pupitre` passent par un port et un adaptateur TypeScript, sans import direct de son domaine.
