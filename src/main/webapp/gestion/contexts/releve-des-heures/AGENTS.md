# Relevé des heures

Ce contexte de `gestion` porte le relevé hebdomadaire du **temps opérationnel** d'une personne.
Il est lecteur : les corrections et le traitement des anomalies de pointage, conflits et fins automatiques,
appartiennent au contexte `anomalies-de-pointage`.
La route `/operateurs/:operateur/heures`, le composant `SyntheseDesHeures` et le port
`SyntheseDesHeuresPort` conservent leur nom pour garder les liens partagés.

L'[ADR 0047](../../../../../../documentation/adr/0047-count-only-finished-activities.md) possède les
règles de comptabilisation. Le back interprète les faits, décide des échéances, des anomalies et des
complétudes ; ce contexte restitue les résultats reçus.

## Acquisition

Appliquer la [composition des lectures](../../../../../../documentation/architecture.md#acquire-a-view-through-one-read-port-by-default)
par le seul `SyntheseDesHeuresPort`. Son secondaire compose en parallèle la synthèse des heures et la
feuille de temps pour le même opérateur, la même semaine et **un seul instant d'évaluation**, pris au
début de l'acquisition technique. Comparer chaque écho à cet instant comme instant absolu ; deux graphies
ISO équivalentes sont acceptées. Ce paramètre technique reste hors de l'URL de la vue.
L'évaluation commune garantit la même décision d'expiration ; une écriture entre les lectures peut encore
modifier les faits reçus, sans instantané historique ni transaction commune.

La synthèse porte les totaux, les éléments, les pointages bruts et les séquences en conflit. La feuille
porte les portions calendaires des activités et leur origine interprétée. Garder les types générés dans
le secondaire et reconstituer les valeurs du contexte avant le retour du port.

Un opérateur inconnu est une absence, sans signalement technique. L'absence connue d'une source l'emporte
sur une panne de l'autre. Toute autre panne, un refus 400, un écho incohérent ou une réponse invalide
rejette la lecture et est signalé une seule fois. La resource ignore les réponses des lectures obsolètes ; le contrat Promise ne garantit pas une annulation HTTP.

La lecture indépendante `operateurs()` du même port acquiert toutes les identités utiles au choix :
`OperateurReleveId`, nom et prénom, sans importer le contexte `operateur`. Le secondaire parcourt les
pages sans filtre de poste, avec la taille commune, et refuse les numéros, tailles, totaux, doublons ou
quantités incohérents. Une collection partielle ne devient jamais un choix présenté comme complet.

La page conserve l'acquisition complète pendant son montage ; changer de personne, semaine ou jour ne
relit pas la liste. Une panne de cette liste laisse le relevé consultable et permet une nouvelle tentative
complète. Rouvrir la fiche recharge les identités. Ces lectures ne forment aucun instantané transactionnel.
Une adresse invalide au montage n'acquiert ni relevé ni liste.

## Vocabulaire et invariants

- **Relevé** : les sept jours de la semaine ISO demandée, dans l'ordre calendaire. Vérifier la semaine
  rendue par chaque source, la correspondance des jours et les références élément/poste des faits.
  La feuille peut rendre ses jours dans un ordre différent ; leur date possède le rapprochement.
- **Total de durée** : complet avec une `DureeTravaillee`, zéro compris, ou incomplet sans valeur numérique.
  Le cumul opérationnel compte chaque élément : deux éléments terminés en parallèle pendant une heure
  donnent deux heures. Les chiffres et les complétudes viennent du serveur ; aucune somme des jours,
  éléments ou portions ne refait le total. Travail et NC gardent leur complétude indépendante.
- **Portion d'activité** : début et éventuelle fin de ce qui appartient au jour rendu. Une portion ne
  remplace pas l'activité d'origine. Refuser une portion finissant avant son début ; zéro est accepté.
- **Activité d'origine** : `ActiviteReleveId`, début d'origine et état explicite. `TERMINEE` et
  `TERMINEE_AUTOMATIQUEMENT` portent une fin effective. `EN_COURS` ne porte aucune fin effective.
  `A_RESOUDRE` est une autre variante ; son éventuelle `finAuPlusTard` borne une incertitude et ne devient
  jamais une durée certaine. Le front ne fabrique aucune fin à minuit, à l'évaluation ou à treize heures.
- **Pointage** : `PointageReleveId`, instant absolu, type et intention reçus. Une ouverture crée une
  activité ; transition et fin gardent l'`ActiviteReleveId` visé. `CibleDePointage` conserve son sens
  élément/poste ; elle n'est pas l'identité d'activité. Garder l'ordre du journal donné par le serveur.
- **Séquence en conflit** : cible élément/poste, identités d'activités et de pointages concernés, reçues
  séparément. Un conflit sans activité à résoudre reste visible et ne rend pas un total incomplet de lui-même.
  Une identité d'ouverture ou de fait hors du journal hebdomadaire reste valide ; son absence dans ce journal
  ne rompt pas le contrat. Les références élément/poste garanties restent contrôlées.
- **Jour vide** : ni pointage ni intervalle. Une portion traversant un jour sans pointage le rend non vide.
- Les valeurs du domaine sont immuables et le domaine ne lit aucune horloge. La semaine en cours et
  aujourd'hui se déduisent du jour fourni par le primaire.

Ce contexte n'importe aucun contexte de `pupitre`, `operateur`, `poste` ou `element-de-fabrication`.
Il possède ses identifiants et reçoit les noms utiles des rapports. Le lien depuis les opérateurs est un
`routerLink`. L'identifiant de saisie au pupitre n'est ni porté par ces rapports ni acquis pour ce choix.

## Restitution

- Garder la frise de sept jours, une ligne par élément et un total unique par ligne. Travail en `accent`,
  NC hachurée avec les jetons existants ; aucune palette par élément.
- Une activité terminée dessine sa portion fermée. L'état automatique reçu ajoute une mention visible
  et une anomalie à la barre de sa catégorie. Une absence de FIN dans ce jour n'établit jamais cet état,
  et aucun marqueur de FIN n'est inventé.
- Une activité en cours est une indication ponctuelle, sans barre étirée jusqu'à l'heure de lecture.
  Nommer son début d'origine, avec le jour lorsqu'il diffère du jour rendu : dimanche 22 h reste dimanche
  22 h dans la portion du lundi. Elle ne reçoit aucune durée comptabilisée par le front.
- Une activité à résoudre est indiquée comme **À résoudre** sur chacun des jours rendus de sa plage possible,
  sans barre de durée certaine. Un total incomplet affiche **Incomplet**, sans chiffre partiel dans le
  texte, l'infobulle ou le texte accessible. Une valeur complète d'une autre catégorie reste chiffrée.
- Exposer les séquences en conflit et leurs faits ciblés en lecture, avec les identités reçues lorsqu'un
  fait n'appartient pas au journal de la semaine. Les commandes de correction restent hors de cet écran.
- Les intervalles contigus travail/NC/travail se dessinent bout à bout. Un élément travaillé en parallèle
  se dédouble en sous-lignes par poste pour toute la semaine ; conserver une sous-ligne Sans poste pour ses
  portions ou marqueurs sans poste. Les totaux ne se dédoublent pas et ne sont pas recalculés.
- Un élément sans barre garde sa ligne et ses marqueurs isolés du jour ouvert. Les marqueurs représentent
  seulement les pointages bruts reçus. Le journal en est l'unique commande de sélection ; les marqueurs
  décoratifs restent `aria-hidden` et le repère de sélection traverse la frise.
- Tous les mots affichés appartiennent à `LibellesReleveDesHeures`. Les énoncés des portions restent accessibles
  et les états lisibles sans couleur seule. Les cibles conservent au moins 44 px.

## Vue, calendrier et axes

L'[ADR 0038](../../../../../../documentation/adr/0038-hold-view-state-in-the-url.md) possède l'état de vue.
L'année, la semaine et le jour ouvert vivent dans l'URL ; les en-têtes de jour, vides compris, sont des liens.
Le choix d'un autre opérateur inscrit la semaine affichée et le jour ouvert, même initialement implicites
ou vides chez la cible, et ajoute une entrée d'historique. Sans jour ouvert, garder seulement la semaine.
L'identité du rapport réussi prime sur celle de la liste pour l'ID courant ; leur absence donne un libellé
neutre, sans proposition fictive. Recherche, panneau et focus appartiennent au sélecteur local.
Choisir la personne courante ferme le panneau sans navigation ni nouvelle lecture. Une navigation annulée
ou rejetée conserve la consultation réelle et son pointage ; un ancien résultat ne remplace pas l'état
d'un choix plus récent. Signaler un rejet technique une fois et afficher la possibilité de retenter.

Les liens de semaine précédente/suivante n'emportent pas le jour. Une adresse illisible ou hors calendrier
est refusée sans acquisition. Le retour navigateur retrouve son jour.

Une adresse sans semaine ni jour désigne la semaine en cours, sans réécriture de l'URL. Une adresse qui nomme
seulement un `jour` (`AAAA-MM-JJ`, sans `annee` ni `semaine`) ouvre la semaine ISO qui contient ce jour, ce
jour ouvert, sans réécriture de l'URL : c'est le lien à construire pour mener à une journée précise. Un jour
illisible, ou tenu par une semaine hors des années 2000 à 2999 (`1999-12-31` et `2000-01-01` appartiennent à la
semaine 52 de 1999), est une adresse refusée, sans exception ni acquisition. Avec `annee` et `semaine`, le jour
doit appartenir à cette semaine ; `annee` ou `semaine` seul, même avec un jour, reste refusé. Sans jour, ouvrir aujourd'hui
pour la semaine en cours, même vide ; sinon le premier jour portant un pointage, ou aucun. Le pointage
sélectionné est éphémère : aucun à l'ouverture, effacé au changement d’opérateur/jour/semaine, désélectionné par un
second clic. Changer seulement le jour ou la sélection conserve les rapports acquis et leur évaluation.

La vue de semaine garde sept colonnes de même largeur et une échelle commune de 0 à 24 h, vides compris.
Les deux repères de chaque jour restent à l'intérieur de sa colonne, avec une marge lisible.
Le jour consulté conserve son état dans l'URL, sans agrandir sa colonne. Le détail et le journal du jour
figurent sous la semaine ; sur mobile, sept liens donnent accès aux jours sans défiler la frise.
Le détail conserve un axe normalement 6–22 h, étendu au jour entier pour une borne nocturne ou à minuit.
Une fin à minuit du lendemain ferme la portion à 1 440 minutes, sans fabriquer cette fin.
Les mentions longues de fin automatique et de conflit restent accessibles dans les barres, le détail et
le panneau À vérifier. Leur résumé dans la semaine ne doit pas dilater ses lignes.

Le serveur découpe dans son calendrier : une activité terminée 20–08 h donne 4 h puis 8 h ; dimanche
22–lundi 03 h donne 2 h puis 3 h, dans les deux semaines ISO. Minuit répartit les portions et ne produit
aucun geste ni fin métier.

La frise tient à 1024 px et défile horizontalement en dessous. Les jours ont la même largeur ; les libellés longs se replient et les noms de postes restent accessibles par leur titre. L'heure des faits et de l'origine
s'affiche dans le fuseau du navigateur, selon la convention existante. Le découpage des jours est déjà celui
du serveur : le décalage d'une consultation depuis un autre fuseau reste une limite connue. Un fuseau
entreprise configuré est un chantier séparé. Un instant sans fuseau est refusé.
