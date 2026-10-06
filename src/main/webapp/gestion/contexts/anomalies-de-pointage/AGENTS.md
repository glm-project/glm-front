# Anomalies de pointage

Ce contexte de Gestion possède la décision explicite du gestionnaire et sa saisie. Le calcul des
activités, des durées et des coûts reste au backend Atelier, selon
l'[ADR 0047](../../../../../../documentation/adr/0047-count-only-finished-activities.md).

## Langage et invariants

- **Anomalie de pointage** : ce que le gestionnaire doit trancher. Deux natures : `CONFLIT`, une séquence
  en conflit, et `FIN_AUTOMATIQUE`, une activité terminée à son échéance faute de fin réelle. La liste
  couvre les deux natures (`GET /api/atelier/anomalies?nature=…`, requise) et le dossier aussi. Le coût de revient emploie déjà « anomalie » au sens large ;
  les contextes restent isolés et ne partagent aucun type. « Séquence en conflit » garde son sens.
- **Dossier** : projection d'une anomalie de pointage, adressée par suivi et pointage d'ancrage : une
  séquence en conflit (`EN_CONFLIT`) ou une fin automatique (`FIN_AUTOMATIQUE`, ancrée sur l'ouvrant actif
  de l'activité échue). Une adresse annulée, remplacée ou résolue reçoit un résultat explicite, jamais une
  autre séquence. Les deux identifiants restent distincts : l'adresse d'une fin automatique est
  l'événement ouvrant, l'activité visée par un acte est l'`ActiviteId` d'origine (`activites[].activite`).
- **Acte** : correction, annulation ou régularisation humaine. Aucun acte n'est choisi par défaut.
  Correction et annulation demandent un motif non vide d'au plus 255 caractères ; la régularisation
  ne porte aucun motif.
- **Aperçu** : conséquences fournies par le port sans écriture, avec l'évaluation et les dossiers avant
  et après. Toute modification de la saisie l'invalide.
- **Proposition confirmable** : adresse, commande, version attendue, acte exact, empreinte des conséquences
  et identité prospective de l'événement pour une correction ou une régularisation ; une annulation
  n'en crée aucun. Confirmation et reprise transmettent cette proposition immuable. Elle reste seulement
  en mémoire dans la page ; un rechargement abandonne la saisie. La saisie conserve les nanosecondes,
  avec comparaison des instants équivalents indépendamment de leur fuseau.
- **Journal** : faits d'origine, annulations et remplacements conservés. Une contradiction restante
  est un résultat accepté, distinct d'un refus métier.
- **Continuation** : lien explicite vers un pointage actif d'une séquence restante après correction
  de l'ancrage. Le résultat reste consultable à l'ancienne adresse.

## Responsabilités

Gestion expose la liste sous `/anomalies` et un dossier sous `/anomalies/:suivi?pointage=…`. L'ancienne
route `/conflits` n'existe plus et ne redirige pas.

La liste offre deux onglets accessibles, « Fins automatiques » à gauche puis « Conflits », et garde la nature dans
l'URL (`/anomalies?nature=CONFLIT|FIN_AUTOMATIQUE`, [ADR 0038](../../../../../../documentation/adr/0038-hold-view-state-in-the-url.md)).
Sans `nature`, l'onglet Fins automatiques, le premier ; une valeur inconnue (nature, page) est une adresse refusée, sans aucune requête : ni la liste, ni les opérateurs, ni
les éléments ne sont lus, et les deux filtres, désactivés, gardent la valeur de l'URL (« Opérateur actuel conservé »). Changer d'onglet
conserve les filtres et revient à `page=1` ; la pagination est propre à chaque onglet. Une ligne
`LigneConflit` ou `LigneFinAutomatique` est traduite à la frontière HTTP, qui rejette la lecture dont une
ligne ne porte pas la nature demandée. Une fin automatique affiche l'élément, l'opérateur, le poste, son début
et l'échéance reçus ; le front ne calcule ni échéance ni durée. Son lien ouvre `/anomalies/{suivi}?pointage=…`
sur l'ouvrant actif (`adresse.pointage`) ; la ligne ne porte pas l'activité visée, que seul le dossier expose.
Le filtre « Opérateur » de la liste est le `SelecteurOperateurAnomalie` (entrée « Tous les opérateurs » par
`avecTous`), alimenté par `operateurs()` que la liste lit pour tout lecteur, consultant compris, à chaque ouverture, sans cache.
L'URL garde l'identifiant ; le champ ne l'affiche jamais et nomme « Opérateur non résolu (référence actuelle) » celui que
les opérateurs ne contiennent pas. Le choix reste un brouillon jusqu'à « Filtrer », comme « Élément ». Des opérateurs indisponibles
affichent « Liste des opérateurs indisponible » et « Réessayer », désactivent le filtre sans toucher à la liste, et le
champ ne prétend pas que la valeur de l'URL est « non résolue » : il dit « Opérateur actuel conservé ».
Le filtre « Élément » est le `SelecteurElementAnomalie` (même `SelecteurRecherchable` que l'opérateur, entrée « Tous les
éléments »). Il choisit un élément par sa désignation, « nom · référence » (`ElementAnomalie { id, nom, reference? }`, par
ordre alphabétique du nom ; recherche sans accents sur le nom et la référence). Le port de lecture expose
`elements()`, lu en entier par `GET /api/elements-de-fabrication` (`collectAllPages`, page demandée vérifiée, aucune
collection tronquée ni identité dupliquée, sur toute période : la liste cherche un élément quelle que soit sa date de
création). `elements()` est distinct de `referentiel()` : le dossier, qui n'a pas besoin des éléments, ne paie pas leur
lecture complète, et la liste les charge à part des opérateurs, si bien que l'échec ou la lenteur de l'un ne retient pas
l'autre. L'URL garde l'identifiant ; le champ ne l'affiche jamais et nomme « Élément non résolu (référence actuelle) » celui que
les éléments ne contiennent pas. Le choix reste un brouillon jusqu'à « Filtrer » ; des éléments indisponibles affichent
« Liste des éléments indisponible » et leur propre « Réessayer », désactivent ce seul filtre, qui dit « Élément actuel
conservé » au lieu de « non résolu ».
Le `SelecteurRecherchable` ne dit « ne correspond à cette recherche » que si quelque chose est saisi : une liste vide sans
recherche dit « Aucun opérateur disponible » (« Aucun élément disponible »).
Chaque libellé de liste, chargement compris, est propre à sa nature. Le dossier ouvert depuis la liste en garde l'adresse (`nature`, filtres, `page`) et « Retour aux anomalies »
ramène à l'onglet, aux filtres et à la page d'origine.

Le domaine possède les identités, la saisie et la confirmation ; l'application protège les appels
asynchrones et les doubles soumissions. Le primaire rend les faits et leur cible, conserve les filtres
dans l'URL et utilise les surfaces de Gestion. Trois ports séparent lecture, aperçu et application.
La composition normale de Gestion relie ces trois ports au même adapter HTTP et à `ApiClient`.
Le serveur fournit états, intervalles, durées ISO, diagnostics, choix et continuations. Le primaire
possède leurs libellés. Il nomme l'opérateur (« Prénom Nom ») et le poste (libellé) reçus avec la liste, l'en-tête, le
panneau Sélection, l'historique d'adresse obsolète et les continuations, sans jamais en afficher l'identifiant : une fiche non
résolue s'affiche « Opérateur non résolu » ou « Poste non résolu », un pointage sans poste « Sans poste ». Le modèle
garde `posteId` pour distinguer ces deux cas ; le fait garde les identifiants de l'opérateur et du poste, qu'il envoie
au serveur, et le nom ou le libellé sont portés à côté (`operateurNom`, `posteLibelle` du pointage, vides sans fiche).
Les détails de traçabilité du pointage sélectionné et les journaux avant/après de l'aperçu partagent un seul gabarit : la ligne
d'en-tête est « Prénom Nom · instant » (jamais l'identifiant du pointage), et les activités visée ou créée se désignent
par le libellé de l'activité du dossier, sinon par le pointage qui l'a créée dans le même journal (nature et instant),
sinon « Activité non résolue », jamais par leur identifiant. L'historique d'adresse obsolète et l'option de cible
du formulaire suivent la même règle (`labelForActivite`).
Un autre pointage (remplacé, pointage de l'acte en aperçu) se désigne par une seule règle, `referencePointage` :
« instant · Geste » depuis le journal disponible. Quand il manque, la phrase porte le déterminant (« Remplace un
pointage non résolu »), jamais l'identifiant.
Une phrase du problème suit sa propre règle : le pointage en cause nommé par son geste et son heure (« L'arrêt de 17:00 »,
« Le passage en NC régularisé de 18:00 » ; « Un pointage non résolu » quand le journal ne le tient pas), « vise », l'activité
visée (« le travail », « la non-conformité », « l'activité » quand le dossier ne la tient pas ou sans période, accordée en
genre), puis le fait contradictoire et son heure (HH:MM) quand le dossier le porte (terminant, ouvrant ou début reçu de
l'activité). Chaque modèle couvre l'absence de ces champs facultatifs : un pointage cité mais absent du journal compte
comme absent ; pour une transition de même catégorie, une activité sans période prend la catégorie du geste (« un travail
déjà en bon »). Une fin automatique se lit dans le dossier, sans déduction : un choix `CORRIGER_FIN_TARDIVE` ou
`CORRIGER_TRANSITION_TARDIVE` visant l'activité échue désigne, par son pointage, le geste tardif ; sinon l'activité n'a
jamais été arrêtée.
Les pointages et les activités du dossier se lisent sur une frise (`glm-frise-dossier`, `frise-dossier/`), pleine largeur sous
l'en-tête ; elle remplace la chronologie en liste et la section « Activités concernées ». Échelle et positions sont de la
présentation, en fonctions pures (`EchelleFrise.ts`, `DispositionFrise.ts`) : du premier au dernier instant reçu (débuts, fins,
pointages) avec une heure de marge arrondie à l'heure locale, graduations horaires, le jour affiché à minuit, une largeur
minimale de 64 px par heure et un défilement horizontal de la frise seule. Une rangée par activité, dans l'ordre de leur début,
sous la rangée des pointages. La barre d'une activité finit selon l'état reçu : `TERMINEE` à sa fin, `ECHUE` en pointillés
`warn` à sa fin automatique, `EN_COURS` et `A_RESOUDRE` (hachurée) ouvertes jusqu'au bord, `ANNULEE` et `REMPLACEE` atténuées
(fin pleine si une fin est reçue) ; le front ne déduit aucune fin d'un pointage. Une activité sans période garde sa rangée
et son libellé, sans barre. Un repère par pointage (symbole du geste, heure HH:MM, barré s'il est annulé, badge « R »
s'il est régularisé, `danger` s'il est en cause d'un diagnostic), décalé sur une voie plus basse tant que le précédent est à
moins de 44 px ; une flèche pointillée `danger`, décorative, va du repère en cause au début de l'activité que son diagnostic
vise. Repères et barres sont des boutons (`aria-pressed`, nom : heure avec secondes et geste, ou catégorie, période et état) dans
l'ordre du temps ; les tests lisent leurs attributs (`data-pointage`, `data-activite`, `data-etat`, `data-fin`, `data-en-cause`,
`data-annule`, `data-voie`, `data-deplace`), jamais leurs classes.
Une proposition de correction ou de régularisation dont le fait est un passage ou un arrêt (`intention` `TRANSITION` ou `FIN`),
avec une borne basse (`CadreDuFait.bornes`) et un instant valide, pose une poignée sur la frise (`poigneeDeLaProposition`,
`PoigneeDeFrise.ts`), sur sa propre rangée sous les repères : c'est un second geste qui émet un instant, avec le champ
date et heure. Le fait sans heure (`REGULARISER_FIN` avant saisie) n'en a pas. La poignée est un `slider` : le pointeur la
capture (`touch-action: none`) et la déplace par pas de 5 minutes (le décalage de la prise est gardé), les flèches de 1 minute
(Maj : 15), Origine et Fin vont aux bornes, `aria-valuetext` porte l'heure (avec son offset quand l'heure est répétée au
changement d'heure d'automne). La frise ne décide pas de l'instant : elle émet une demande (`DemandeDeDeplacement` : `DE`
minutes, `VERS` instant, `BORNE`) avec la poignée lue, que la page résout (`instantDeplace`, `DeplacementDeLaPoignee.ts`) après
avoir lu l'heure au geste : en minutes entières, entre la borne basse du `CadreDuFait` et cette heure, puis transmet par
`change({ fait: { instant } })`, secondes à zéro : la
fraction et l'aperçu disparaissent comme pour un geste dans le champ, qui affiche la nouvelle valeur. « −5 min » et « +5 min »
de « Votre décision » font la même demande et se désactivent à une borne. La poignée et ses boutons sont désactivés tant
qu'une opération est en cours. Poignée active, l'échelle va jusqu'à trois heures après le dernier instant reçu, sans dépasser
l'heure courante des bornes (jamais en deçà de l'échelle normale) ; au-delà, le champ reste l'accès. L'heure d'origine du
pointage corrigé reste barrée sur son repère tant que la poignée s'en éloigne.
La sélection est un pointage ou une activité (`SelectionDuDossier`). Le panneau « Sélection », en tête de la colonne de droite,
porte le pointage choisi : geste, instant avec ses secondes, opérateur, poste, régularisation, annulation (motif, auteur,
instant), remplacement, traçabilité (activités visée et créée, enregistrement) et les boutons Corriger et Annuler, absents d'un
pointage annulé, désactivés pour le consultant et pendant une opération. Pour une activité il dit sa catégorie, son état et son
temps reçus (`tempsActivite`), son début et sa fin reçus, « Fin automatique » pour une activité échue ; il n'a ni Corriger
ni Annuler. La sélection dérive du dossier par `linkedSignal` (pas d'`effect`, ADR 0043) : à chaque nouveau dossier (autre
adresse, relecture, reçu), elle revient à la sélection initiale (`selectionInitiale`) : le plus ancien pointage en cause d'un
diagnostic que le journal contient, sinon la première activité échue d'une fin automatique, sinon rien et le panneau invite à
choisir. Une sélection absente du dossier courant ne s'affiche jamais. Sélectionner ne choisit aucun acte : la proposition,
l'aperçu et le choix guidé restent inchangés. L'historique d'adresse obsolète garde sa liste, sans sélection.
Un pointage se nomme par le geste de l'opérateur, jamais par le couple Type et Intention (`libelleDuGeste`,
`LIBELLES_ANOMALIES.gestes`) : `DEBUT·OUVERTURE` « Démarrage », `NON_CONFORMITE·OUVERTURE` « Démarrage en NC »,
`NON_CONFORMITE·TRANSITION` « Passage en NC », `DEBUT·TRANSITION` « Retour en bon », `FIN·FIN` « Arrêt ». Un pointage
régularisé garde son libellé et sa mention « Régularisation ». Un fait en cours de saisie peut sortir de la table (type
ou intention vides, ou incompatibles) : le libellé retombe alors sur « Type · Intention » des champs remplis. Les
catégories d'activité (« Travail », « Non-conformité ») et les groupes Type et Intention du formulaire gardent leurs mots.
Le gestionnaire choisit l'opérateur et le poste d'un fait par leur nom, jamais en tapant un identifiant. Le port de lecture
expose `referentiel()` (`ReferentielAnomalies` : `OperateurAnomalie { id, nom, code?, postesHabilites }` et
`PosteAnomalie { id, libelle }`, types propres au contexte), lu en entier par `GET /api/operateurs` et
`GET /api/postes-de-travail` (`collectAllPages`, page demandée vérifiée, aucune collection tronquée ni identité dupliquée).
`operateurs()` en est la première moitié, lue seule : la liste, qui n'emploie pas les postes, ne paie pas leur lecture et
ne tombe pas avec eux ; seul le dossier lit le référentiel entier.
`nom` est « Prénom Nom » ; `code` est le code pupitre facultatif (`RestOperateur.identifiant`), pas un UUID. Les identités
du référentiel suivent `ElementAnomalieId` (`OperateurAnomalieId`, `PosteAnomalieId`) ; `FaitPropose` et `SaisieFait`
gardent des `string`, que le serveur reçoit tels quels, et le primaire emballe l'identité à la frontière. Le dossier ne lit
le référentiel que si `droits.canApply()` (le consultant ne le lit pas), à chaque ouverture, sans cache. L'opérateur se choisit
dans `SelecteurOperateurAnomalie` (le `SearchPicker` de Gestion : recherche sans accents sur le nom, le prénom et le code,
options « Prénom Nom · code »), le bouton disant « Choisissez l'opérateur » tant que la saisie est vide ; le poste est un
`<select>` natif qui commence par « Sans poste », puis les postes habilités de l'opérateur choisi, puis les autres. Une
valeur que le référentiel ne contient pas reste sélectionnée comme « … non résolu (référence actuelle) », sans identifiant.
Si le référentiel échoue, le formulaire affiche « Liste des opérateurs et des postes indisponible » avec « Réessayer », garde
la saisie courante et désactive les deux champs, qui disent « Opérateur actuel conservé » et « Poste actuel conservé » : un
référentiel qu'on n'a pas lu ne rend aucune valeur « non résolue ». L'aperçu de l'acte nomme l'opérateur et le poste depuis le
référentiel, puis depuis le journal, sinon « non résolu » (« actuel conservé » tant que le référentiel n'est pas lu).
Une lecture de référentiel, d'opérateurs ou d'éléments que « Réessayer » relit ne démonte pas sa zone (`etatDeLecture` :
seule la première lecture remplace le champ par « Chargement… ») : le bouton reste, `aria-busy`, et garde le focus.
Un refus d'acte se traduit par code (`urn:glm:erreur:atelier:<code>`, [API](../../../../../../documentation/api.md)) :
le port rend `{ kind: 'REFUS', code }` pour les quatorze codes connus (`CODES_REFUS_ACTE`) et ne transmet jamais le
message du serveur, qui contient des identifiants ; le primaire rend `LIBELLES_ANOMALIES.refus[code]`, un libellé du
contexte sans identifiant. Un code inconnu reste une défaillance technique (« L'opération a échoué. Votre saisie est
conservée. »), jamais un refus au message brut.
Le domaine garde chaque instant reçu en texte ISO ; le primaire l'affiche en heure locale par les formats
et les pipes de `app/shared/date-format` : jour long (« jeudi 1 octobre à 09:41 »), année ajoutée quand elle diffère
de celle de la page, secondes réservées à l'instant d'un fait pointé (« à 09:41:22 »), heure en gras puis jour long dans
le panneau Sélection. La page lit l'horloge une fois et la passe aux pipes ; l'attribut `datetime` n'a jamais plus de trois
décimales.
Le gestionnaire choisit la date et l'heure du fait avec `glm-date-time-field`, le `datepicker` et le `timepicker` de
Material en français (adapter et locale fournis par `provideGestionDateAdapter()` sur la page du dossier, chargée à la demande). Le champ
est lié par valeur, sans formulaire : seul un geste du gestionnaire émet un instant (`2026-10-01T09:41:22-03:00`, offset
local, sans fraction de seconde, composé par `app/shared/date-format`), si bien qu'un instant reçu qu'il ne touche pas
garde ses nanosecondes. Modifier la date ou l'heure d'un instant reçu abandonne sa fraction de seconde. Une date ou une
heure absente, mal saisie ou impossible laisse le champ en l'état et transmet `instant: ''` : le domaine répond
`INSTANT_INVALIDE` (« Renseignez la date et l'heure du fait. »). Le domaine valide et ordonne les instants ; il ne lit
jamais le fuseau ambiant. Au changement d'heure, une heure que l'horloge saute (printemps) est refusée avec son message
propre, une heure répétée (automne) prend sa première occurrence, même le jour du changement. Le fait reste dans les
bornes de `CadreDuFait` (Value Object du domaine, qui porte le début reçu de chaque activité du dossier et l'heure
courante, comparés par `InstantPointage.compareTo`) : `INSTANT_AVANT_CIBLE` s'il précède le début de l'activité visée (l'égalité
est permise ; pas de borne basse sans activité visée, absente du dossier ou sans période), `INSTANT_FUTUR` s'il dépasse
l'heure courante. L'échéance n'est pas une borne. `command()` et `errors()` de `SaisieActe` reçoivent le cadre ; `matches()`
compare sans bornes et sans heure. `CadreDuFait.bornes(fait)` rend `{ min?, max }`, que la frise lira sans les recalculer.
Le domaine ne lit jamais l'horloge : la page lit l'heure à chaque geste (choisir, modifier) et `PreparationActe.preview` au
moment d'appeler le port, jamais une fois pour toute la page ; `preview` refuse un fait hors bornes sans appeler le port. Chaque nouvelle proposition
(un choix, même identique, ou « Régulariser ») recrée le champ : une saisie partielle ne lui survit pas.
Une activité en cours reste sans temps définitif ; une activité terminée ou échue sans durée rejette
l'acquisition. `enConflit` concerne le périmètre autoritaire et ne se déduit pas du statut de l'ancrage.

Un dossier de fin automatique n'a pas de `sequence` : il se lit depuis `perimetre`, comme le reçu. Le
modèle porte `etat` (l'état d'adresse reçu) et `finAutomatique`. « Anomalie traitée » signifie ni
`enConflit` ni `finAutomatique`, quel que soit l'état d'adresse : une adresse `ANCRE_ANNULEE` peut rester
en fin automatique lorsque l'ouvrant corrigé est encore échu. Le domaine la pose en question nommée
(`anomalieTraitee`), que l'aperçu et le reçu appellent. L'en-tête du dossier dit le problème en une phrase
(`anomalie-probleme`, `phrasesDuProbleme` du primaire, modèles dans `LIBELLES_ANOMALIES.problemes`) : une par
diagnostic d'un conflit à expliquer (`conflitAExpliquer`, soit `enConflit` ; sans diagnostic reçu, l'explication de
la ligne), une par activité échue d'une fin automatique. Elle disparaît dès que le périmètre ne porte plus le problème, y
compris après le reçu d'une fin automatique ou d'un conflit résolu.
Le dossier montre l'activité échue sur la frise, sélectionnée à l'ouverture, avec son début, sa fin automatique et sa
durée reçus dans le panneau Sélection, et la clôture dans l'en-tête, sans les calculer ; il ne se présente jamais comme
un conflit. Trois choix guidés s'ajoutent, distingués par leur `code` et lus d'après le `fait` reçu :
`REGULARISER_FIN` prérempli sans heure, que le gestionnaire saisit (aucune heure n'est inventée) ;
`CORRIGER_FIN_TARDIVE` et `CORRIGER_TRANSITION_TARDIVE` reprenant l'heure du pointage tardif, le motif
restant à saisir. Un fait reçu incohérent avec son code rejette l'acquisition. Aperçu, confirmation, reçu,
reprise et obsolescence restent ceux de toute saisie.

Le reçu fournit le dossier canonique courant depuis `perimetre`, même à une ancre annulée. Une lecture
ordinaire utilise `sequence` et conserve le résultat d'adresse obsolète. La vérification canonique
fonctionne indépendamment de cette lecture. `NON_ATTESTE` et les erreurs techniques gardent l'issue
inconnue : toute nouvelle décision reste bloquée. La reprise explicite réutilise la même commande et
la même proposition ; seul un résultat canonique attesté conclut l'écriture.
Après obsolescence, la saisie reste disponible et l'aperçu est retiré. La page réacquiert le dossier ;
une acquisition échouée laisse la confirmation indisponible. Le gestionnaire demande ensuite un nouvel
aperçu avant toute confirmation. Une adresse devenue obsolète conserve son résultat explicite.

La composition utilise uniquement `HttpAnomalies`, y compris dans les parcours Cypress. Les réponses
réseau des tests sont des données REST typées interceptées ; elles ne calculent aucune règle métier
et n'interprètent aucun acte. Les droits d'application restent `GESTIONNAIRE`.

Les tests passent par la saisie et la résolution publiques, les contrats des ports, le DOM Cypress
et les routes réelles. Leur liste et les garanties HTTP sont dans les [garanties de résolution](SCENARIOS.md).
