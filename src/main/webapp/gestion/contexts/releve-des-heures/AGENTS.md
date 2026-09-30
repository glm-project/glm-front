# Relevé des heures

Ce contexte de `gestion` porte le relevé hebdomadaire du **temps opérationnel** d'une personne.
Il est lecteur : les corrections et la résolution des conflits appartiennent à un autre chantier.
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

La synthèse porte les totaux, les éléments, les pointages bruts et les séquences en conflit. La feuille
porte les portions calendaires des activités et leur origine interprétée. Garder les types générés dans
le secondaire et reconstituer les valeurs du contexte avant le retour du port.

Un opérateur inconnu est une absence, sans signalement technique. L'absence connue d'une source l'emporte
sur une panne de l'autre. Toute autre panne, un refus 400, un écho incohérent ou une réponse invalide
rejette la lecture et est signalé une seule fois. Le composant conserve l'annulation des lectures obsolètes.

## Vocabulaire et invariants

- **Relevé** : les sept jours de la semaine ISO demandée, dans l'ordre calendaire. Vérifier la semaine
  rendue par chaque source, la correspondance des jours et les références élément/poste des faits.
  La feuille peut rendre ses jours dans un ordre différent ; leur date possède le rapprochement.
- **Total de durée** : complet avec une `DureeTravaillee`, zéro compris, ou incomplet sans valeur numérique.
  Les chiffres et les complétudes viennent du serveur ; aucune somme des jours, éléments ou portions ne
  refait le total. Travail et NC gardent leur complétude indépendante.
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
`routerLink`. Le matricule n'est pas porté par ces rapports et n'est pas recherché au référentiel.

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
- Présence, présumé et effets de départ n'appartiennent plus au relevé opérationnel.
- Tous les mots affichés appartiennent à `LibellesReleveDesHeures`. Les énoncés des portions restent accessibles
  et les états lisibles sans couleur seule. Les cibles conservent au moins 44 px.

## Vue, calendrier et axes

L'[ADR 0038](../../../../../../documentation/adr/0038-hold-view-state-in-the-url.md) possède l'état de vue.
L'année, la semaine et le jour ouvert vivent dans l'URL ; les en-têtes de jour, vides compris, sont des liens.
Les liens de semaine précédente/suivante n'emportent pas le jour. Une adresse illisible ou hors calendrier
est refusée sans acquisition. Le retour navigateur retrouve son jour.

Une adresse sans semaine désigne la semaine en cours, sans réécriture de l'URL. Sans jour, ouvrir aujourd'hui
pour la semaine en cours, même vide ; sinon le premier jour portant un pointage, ou aucun. Le pointage
sélectionné est éphémère : aucun à l'ouverture, effacé au changement de jour/semaine, désélectionné par un
second clic. Changer seulement le jour ou la sélection conserve les rapports acquis et leur évaluation.

Chaque jour possède son axe, normalement 6–22 h. Une borne dessinée en dehors de cette fenêtre ou à minuit
ouvre le jour entier. Une fin à minuit du lendemain ferme la portion à 1 440 minutes, sans fabriquer cette
fin. Les pointages participent à l'axe uniquement lorsqu'ils sont dessinés dans le jour ouvert.
Les repères restent à l'intérieur de leur colonne : deux pour le jour fermé, un toutes les deux heures pour
le jour ouvert de jour, toutes les trois heures sur le jour entier. Un jour vide fermé n'en porte aucun.

La frise tient à 1024 px et défile horizontalement en dessous. Le jour ouvert est le plus large, les jours
vides fermés les plus étroits ; les noms longs se tronquent par CSS. L'heure des faits et de l'origine
s'affiche dans le fuseau du navigateur, selon la convention existante. Le découpage des jours est déjà celui
du serveur : le décalage d'une consultation depuis un autre fuseau reste une limite connue. Un fuseau
entreprise configuré est un chantier séparé. Un instant sans fuseau est refusé.
