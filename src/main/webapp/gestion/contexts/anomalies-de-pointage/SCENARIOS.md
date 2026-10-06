# Anomalies de pointage : garanties

Le backend Atelier fournit le dossier, l'aperçu et le reçu canonique. Le front utilise uniquement
`HttpAnomalies` et ne calcule ni interprétation du journal ni conséquences d'un acte.

## Proposition et confirmation

L'aperçu porte l'adresse, la commande, la révision attendue, l'acte exact, l'empreinte des conséquences
et l'identité prospective d'événement pour une correction ou une régularisation. L'annulation n'en
crée aucun. La confirmation transmet ces champs explicites ; l'évaluation et les dossiers avant et
après servent uniquement à la consultation. Toute modification de saisie invalide l'aperçu.

L'obsolescence conserve la saisie et retire l'aperçu. Une réacquisition échouée ne rétablit pas la
confirmation. Après récupération du dossier courant, le gestionnaire demande un nouvel aperçu.

Une réponse d'écriture perdue bloque les nouvelles décisions. Vérifier le reçu ne rejoue aucun acte.
La reprise explicite transmet la proposition initiale immuable. Un reçu ne conclut l'écriture que si
la commande, l'adresse, la révision de départ, l'acte et l'événement créé correspondent exactement.
Une ancre annulée reste consultable et les continuations désignent les autres conflits explicitement.

## Fin automatique

Le dossier d'une activité terminée à son échéance faute de fin réelle n'est jamais présenté comme un
conflit. Il montre l'activité échue sur la frise, son début, sa fin automatique et sa durée tels que reçus dans le panneau Sélection. Le
gestionnaire régularise la fin avec une heure qu'il saisit : le choix guidé arrive sans heure et l'aperçu
reste indisponible tant qu'elle manque. Une fin ou une transition pointée après l'échéance se corrige avec
l'heure de ce pointage et un motif. L'aperçu, la confirmation, le reçu, la reprise et l'obsolescence sont
ceux de tout acte ; les refus `suivi-d-atelier-cloture`, `operateur-non-habilite`,
`date-de-survenue-future` et `apercu-obsolete` s'y présentent sans écriture ni perte de saisie. Le reçu
annonce « Anomalie traitée » seulement si ni `enConflit` ni `finAutomatique` ne subsistent, y compris
sur une adresse annulée, et n'affiche alors plus de phrase de conflit, réservée au périmètre qui porte encore un
conflit. Une activité sans poste n'en reçoit aucun.

## Phrase du problème

L'en-tête du dossier dit le problème en une phrase, sous l'élément, l'opérateur · poste, la date et la clôture ; elle
remplace les blocs « Pourquoi ces pointages sont incohérents » et « Fin automatique ». Un conflit en a une par
diagnostic, dans l'ordre reçu, selon sa raison : « L'arrêt de 17:00 vise le travail, remplacé à 12:00 par un passage
en NC. » ; sans le fait contradictoire, « L'arrêt de 17:00 vise un travail qui n'est plus en cours. » Sans diagnostic
reçu, l'explication de la ligne tient lieu de phrase. Une fin automatique en a une par activité échue : « Le travail
démarré à 08:00 n'a jamais été arrêté : fin automatique à 18:00. » ; quand un choix de correction tardive est reçu, elle
nomme le geste tardif (« L'arrêt de 19:30 vise le travail, déjà terminé automatiquement à 18:00. »). Les faits de
l'activité échue (début, fin automatique, durée) sont dans le panneau Sélection, l'activité étant sélectionnée à l'ouverture. Aucune phrase ne porte d'identifiant, ni de
lien : un pointage absent du journal se dit « Un pointage non résolu ».

## Frise et sélection

Les pointages et les activités du dossier se lisent sur une frise sous l'en-tête, à la place de la chronologie en liste et
de « Activités concernées ». Chaque activité a sa rangée, dans l'ordre de leur début : une barre `accent` pour le travail,
`nc` pour la non-conformité, finie à la fin reçue (`TERMINEE`), en pointillés `warn` à la fin automatique (`ECHUE`), ou
ouverte jusqu'au bord (`EN_COURS`, `A_RESOUDRE` hachurée « À résoudre ») ; la frise n'invente aucune fin. Chaque pointage est
un repère (symbole du geste, heure HH:MM, barré s'il est annulé, « R » s'il est régularisé, rouge s'il est en cause), décalé
quand deux repères sont à moins de 44 px ; une flèche pointillée relie le pointage en cause au début de l'activité que son
diagnostic vise. L'échelle va d'une heure avant le premier instant reçu à une heure après le dernier, par heures entières, avec
le jour à minuit ; elle défile horizontalement sur un écran étroit, sans faire défiler la page. Repères et barres sont des
boutons (`aria-pressed`) qui suivent l'ordre du temps ; leur nom porte l'heure avec ses secondes et le geste, ou la
catégorie, la période et l'état.

Le panneau « Sélection », avant « Votre décision », montre le pointage choisi : geste, instant avec ses secondes, opérateur et
poste, régularisation, annulation (motif, auteur, instant), remplacement, activités visée et créée, enregistrement (instant
et auteur), puis Corriger et Annuler. Un pointage annulé n'a ni l'un ni l'autre ; le consultant et une opération en cours
les voient désactivés, avec le message des droits. Pour une activité, il dit sa catégorie, son état et son temps reçus, son
début et sa fin reçus (« Fin automatique » pour une activité échue), sans bouton d'acte. À l'ouverture d'un conflit, le plus
ancien pointage en cause que le journal contient est sélectionné ; à l'ouverture d'une fin automatique, l'activité échue ; si
les deux sont portés, le pointage en cause ; sinon le panneau dit « Sélectionnez un pointage ou une activité sur la frise pour
voir ses détails. ». Un nouveau dossier (autre adresse, relecture, reçu) rend la sélection initiale du nouveau dossier, jamais
un élément absent de celui-ci. Sélectionner n'est pas choisir un acte : la proposition, l'aperçu et le choix guidé ne
bougent pas. Corriger et Annuler du panneau préparent la proposition exactement comme avant.

## Liste des anomalies

La liste demande la nature de l'onglet courant : `FIN_AUTOMATIQUE` sans `nature` dans l'URL, `CONFLIT` à la
demande ; l'onglet des fins automatiques se place à gauche. Une valeur inconnue (nature, page) n'émet aucune requête, pas même celles des opérateurs et des éléments : les filtres
restent désactivés jusqu'à une adresse valide. Changer d'onglet conserve les filtres et remet `page=1`.
Chaque onglet a son message de chargement, son message vide, ses erreurs et sa pagination. Une ligne d'une autre nature que celle demandée
rejette la lecture. Une fin automatique montre son début et son échéance reçus, sans calcul, et ouvre le
dossier de son ouvrant actif ; « Retour aux anomalies » ramène à l'onglet, aux filtres et à la page d'origine.

Le filtre « Opérateur » se choisit par son nom, dans le même sélecteur que le formulaire du dossier (recherche sans
accents sur le nom, le prénom et le code), qui commence par « Tous les opérateurs ». L'URL garde l'identifiant
(`operateur=<id>`, [ADR 0038](../../../../../../documentation/adr/0038-hold-view-state-in-the-url.md)) et le champ ne l'affiche
jamais : un identifiant que les opérateurs ne contiennent pas s'affiche « Opérateur non résolu (référence actuelle) ». Le choix
se range dans le brouillon du formulaire, comme le champ « Élément » ; il entre dans l'URL, avec `page=1`, quand le
gestionnaire applique les filtres, et « Tous les opérateurs » en retire l'identifiant (`operateur=` vide). Les opérateurs
sont lus seuls (`operateurs()`, sans les postes que la liste n'emploie pas) à chaque ouverture de la liste, pour tout
lecteur, consultant compris : le filtre sert à qui consulte, et une panne de `/api/postes-de-travail` ne l'atteint pas.
Pendant leur lecture, la liste dit « Chargement des opérateurs… » à la place du filtre ; s'il échoue, elle dit « Liste des opérateurs
indisponible » avec « Réessayer », désactive le filtre, qui garde l'opérateur de l'URL, et reste utilisable : la liste des
anomalies ne dépend pas des opérateurs et ne se relit pas. Tant que les opérateurs ne sont pas lus, le filtre ne prétend pas
que l'opérateur de l'URL est inconnu : il dit « Opérateur actuel conservé », jamais « Opérateur non résolu » ni l'identifiant.

Une ancienne adresse à texte libre (`?operateur=Camille`, `?element=M-042`) n'a pas de compatibilité particulière : la
décision est que l'URL porte un identifiant. Le serveur reçoit la valeur telle quelle et continue de filtrer (recherche
partielle), mais le filtre ne la trouve pas parmi les opérateurs ou les éléments et l'affiche « Opérateur non résolu
(référence actuelle) » (« Élément non résolu (référence actuelle) »), sans jamais montrer le texte ; « Filtrer » la conserve
telle quelle dans l'adresse tant que le gestionnaire ne choisit pas autre chose.

Le filtre « Élément » se choisit de la même manière, par sa désignation (nom de l'élément, suivi de sa référence quand il en a
une, « Bielle · B-12 »), dans le même sélecteur (recherche sans accents sur le nom et la référence, éléments par ordre
alphabétique du nom), qui commence par « Tous les éléments ». L'URL garde l'identifiant (`element=<id>`) et le champ ne
l'affiche jamais : un identifiant que les éléments ne contiennent pas s'affiche « Élément non résolu (référence
actuelle) ». Le choix se range dans le même brouillon que l'opérateur jusqu'à « Filtrer », puis entre dans l'URL avec
`page=1` ; « Tous les éléments » en retire l'identifiant (`element=` vide). Les éléments sont lus à chaque ouverture de la
liste, pour tout lecteur, séparément des opérateurs : la liste dit « Chargement des éléments… » à la place du filtre ;
s'ils échouent, elle dit « Liste des éléments indisponible » avec son propre « Réessayer », désactive le filtre, qui garde
l'élément de l'URL, qu'il nomme « Élément actuel conservé » et non « non résolu », sans toucher au filtre « Opérateur » ni à
la liste. Le dossier ne les lit pas.

Dans l'un et l'autre sélecteur, une liste vide sans recherche dit « Aucun opérateur disponible » ou « Aucun élément
disponible » ; « Aucun … ne correspond à cette recherche » n'apparaît que lorsque le gestionnaire a saisi une recherche.

Comme dans le dossier, « Réessayer » d'un filtre reste affiché, `aria-busy`, pendant la relecture : le focus y reste, et le
filtre n'est remplacé par « Chargement… » qu'à la première lecture. Pendant ce chargement, l'étiquette du filtre ne désigne
pas un champ absent.

## Opérateur et poste affichés

La liste (onglets Conflits et Fins automatiques), l'en-tête du dossier, le panneau Sélection, l'historique d'une adresse
obsolète et les continuations nomment l'opérateur (« Prénom Nom ») et le poste (libellé) reçus. Aucun identifiant
d'opérateur ou de poste n'y est affiché : une fiche non résolue donne « Opérateur non résolu » ou « Poste non résolu »,
un pointage sans poste « Sans poste ». Le journal porte le nom et le libellé de chaque pointage à côté des identités
du fait, vides lorsque la fiche manque ; une ligne de liste n'en garde que `posteId`, pour distinguer l'absence de
poste d'un poste non résolu.

La traçabilité du pointage sélectionné (panneau Sélection) et les colonnes Avant et Après de « Comparer tous
les pointages » commencent par « Prénom Nom · instant » (« Opérateur non résolu » sans fiche), jamais par l'identifiant du
pointage. Les lignes « Vise l'activité » et « Crée l'activité » y désignent l'activité par son libellé (nature et début
reçus du dossier), à défaut par le pointage qui l'a créée dans le même journal, sinon « Activité non résolue » : aucun
identifiant d'activité n'est affiché, pas plus dans l'historique d'adresse obsolète ou la cible du formulaire. Un autre
pointage se désigne de la même façon partout : « instant · Geste » du pointage trouvé dans le journal disponible
(dossier, avant ou après), dans la phrase « Remplace le pointage … » ; sinon la phrase le dit sans l'identifier :
« Remplace un pointage non résolu ». Les phrases du problème le nomment par son geste et son heure, ou « Un pointage non
résolu ». La ligne
de l'acte en aperçu commence par « instant · Geste » ou « Pointage non résolu » : aucun identifiant de pointage
n'est affiché.

Un pointage se nomme par le geste de l'opérateur, sur la frise, les références, l'aperçu, la comparaison, l'historique
d'adresse obsolète et le résumé de la proposition : « Démarrage » (`DEBUT·OUVERTURE`), « Démarrage en NC »
(`NON_CONFORMITE·OUVERTURE`), « Passage en NC » (`NON_CONFORMITE·TRANSITION`), « Retour en bon » (`DEBUT·TRANSITION`),
« Arrêt » (`FIN·FIN`). La frise met un geste de non-conformité en évidence (repère `nc`). Un pointage régularisé garde son libellé et
la mention « Régularisation ». Tant que la saisie ne forme pas un geste connu (type ou intention vides, ou incompatibles), le
résumé de la proposition garde « Type · Intention » des champs remplis, sans rien afficher quand les deux sont vides.

Le formulaire de correction et de régularisation et l'aperçu de l'acte n'en affichent pas davantage. L'opérateur se choisit
par son nom (« Prénom Nom », suivi de son code pupitre quand il en a un) dans une recherche sans accents sur le nom, le
prénom et le code ; le poste se choisit dans une liste qui commence par « Sans poste », puis les postes habilités de
l'opérateur choisi, puis les autres. Tant que la saisie n'a pas d'opérateur (régularisation d'un fait manquant), le bouton
dit « Choisissez l'opérateur » et l'aperçu reste indisponible. Choisir un opérateur ou un poste modifie la saisie et retire
l'aperçu. Une référence que le référentiel ne contient pas reste sélectionnée comme « Opérateur non résolu (référence
actuelle) » ou « Poste non résolu (référence actuelle) ». L'aperçu nomme l'opérateur et le poste de l'acte depuis le
référentiel, puis depuis le journal, sinon « non résolu ». Si le référentiel est indisponible, le dossier le dit, propose
« Réessayer » et conserve la saisie, l'opérateur et le poste courants s'affichant « Opérateur actuel conservé » et « Poste
actuel conservé » (jamais « non résolu » : le référentiel n'a pas été lu), de même que l'aperçu de l'acte quand le journal
ne les nomme pas ; un consultant, qui ne peut rien appliquer, ne le lit pas. Pendant la relecture,
les champs restent en place et « Réessayer » reste affiché, `aria-busy`, si bien que le focus ne tombe pas sur le document
(seule la première lecture remplace les champs par « Chargement… »).

Un refus d'acte (aperçu, confirmation ou vérification du reçu) n'affiche pas non plus d'identifiant : le serveur
nomme l'opérateur et le poste par leur UUID dans son message (« L'operateur … n'est pas habilite sur le poste de
travail … »), que le front ignore. Il traduit le code du refus (`operateur-non-habilite`, `operateur-introuvable`,
`poste-de-travail-introuvable` et les autres codes connus) en un libellé du contexte. Un code inconnu n'est pas un refus
métier : il échoue comme une erreur technique, sans afficher le message reçu.

## Dates affichées

Le dossier et la liste n'affichent aucun instant ISO brut. Chaque instant reçu s'affiche en heure locale, en jour
long (« jeudi 1 octobre à 09:41 ») avec l'année quand elle diffère de celle de la page. L'instant d'un fait pointé
porte ses secondes (« à 09:41:22 ») : panneau Sélection (heure en gras, puis jour long), références,
détails de traçabilité, proposition, aperçu et journaux avant/après. L'engagement, la clôture, le début et la fin
d'une activité, l'enregistrement, l'annulation et la date d'un conflit de la liste restent à la minute. L'attribut
`datetime` des heures porte un instant valide, de trois décimales au plus, sans perdre l'ordre du journal.

## Saisie de la date et de l'heure du fait

La date et l'heure se choisissent avec le `datepicker` et le `timepicker` de Material, en français, la semaine
commençant le lundi, au clavier comme au calendrier et à la liste des heures. Une date se tape `JJ/MM/AAAA` ; une
date impossible (`31/02/2026`) est refusée, jamais relue en mois d'abord. Une heure se tape `HH:MM` ou `HH:MM:SS`.
Tant que le gestionnaire ne touche à rien, l'instant reçu part inchangé, nanosecondes comprises. Après un geste, il part
avec l'offset local et sans fraction de seconde. Une date sans heure, ou l'inverse, garde ce qui est saisi, bloque
l'aperçu et affiche « Renseignez la date et l'heure du fait. ». Au changement d'heure, une heure inexistante est refusée
(« Cette heure n'existe pas ce jour-là, à cause du changement d'heure. ») et une heure répétée prend sa première
occurrence, y compris le jour même du changement d'heure, que l'horloge de la page soit ce jour-là ou que l'instant reçu
en soit. Une nouvelle proposition (un choix, même identique, ou « Régulariser ») repart d'un champ neuf : la date ou
l'heure saisie seule et le message d'heure inexistante ne survivent pas. Les specs unitaires fixent `America/Sao_Paulo`
(sans changement d'heure) ; les cas de changement d'heure rebasculent `TZ` en `Europe/Paris` et placent l'horloge le
29 mars le temps du test. Cypress saisit une date au clavier et choisit un jour et une heure à la souris.

Le fait proposé reste dans des bornes (`CadreDuFait`). Il ne précède pas le début reçu de l'activité qu'il vise
(« Le fait ne peut pas précéder le début de l'activité qu'il termine. » ; l'égalité est permise), et il ne dépasse
jamais l'heure courante (« La date et l'heure du fait ne peuvent pas être dans le futur. »), à la seconde et à la
nanoseconde près, quel que soit l'offset de l'instant. L'échéance n'est pas une borne. Sans activité visée, ou si
elle est absente du dossier ou sans période, il n'y a pas de borne basse. Changer l'activité visée change la borne.
Un instant illisible reste seul sur `INSTANT_INVALIDE`. Une borne franchie désactive l'aperçu comme toute erreur de
saisie ; un appel direct à `PreparationActe.preview` ne prévisualise pas non plus un fait hors bornes. L'heure courante
est lue au geste du gestionnaire (choisir, modifier) et au moment de prévisualiser, jamais figée à l'ouverture de la
page : une heure devenue passée pendant que l'onglet reste ouvert est acceptée. `matches()` compare sans bornes. Le refus
serveur `date-de-survenue-future` reste l'autorité.

Le champ n'est pas le seul geste qui émet un instant : pour une correction ou une régularisation dont le fait est un
passage ou un arrêt avec une activité visée qui donne une borne basse, la frise porte une poignée (rôle `slider`) sur
l'heure proposée. Au pointeur, elle suit le glisser par pas de 5 minutes sans sauter sous le doigt ; au clavier, les
flèches la bougent d'une minute (Maj : quinze), Origine et Fin la portent aux bornes ; « −5 min » et « +5 min » de la
décision font de même sans glisser. Elle ne sort jamais des bornes (début de l'activité visée, heure courante lue au
geste, en minutes entières) ; un bouton est désactivé à la borne. Chaque déplacement transmet l'instant avec l'offset local
et sans seconde, retire l'aperçu et met le champ à jour ; saisir une heure dans le champ déplace la poignée. Un fait
sans activité visée, un démarrage, une annulation ou une régularisation sans heure n'ont pas de poignée. L'heure reçue du
pointage corrigé reste barrée sur son repère quand la poignée s'en éloigne. La poignée et ses boutons sont désactivés tant
qu'une opération est en cours. L'heure répétée d'automne se lit avec son offset (`aria-valuetext`) ; l'échelle élargie
traverse minuit et l'heure répétée graduée heure par heure.

## Frontières de vérification

- Les specs de domaine passent par `SaisieActe`, `CadreDuFait` et `ResolutionDeLAnomalie` ; elles vérifient les motifs,
  le choix explicite, la précision des instants, les bornes du fait et l'invalidation d'un aperçu.
- Les specs d'application passent par les ports publics et contrôlent les doubles envois, les réponses
  tardives, l'obsolescence et la vérification d'une issue inconnue.
- Les contrats HTTP lisent un dossier `FIN_AUTOMATIQUE` depuis son périmètre et rejettent un choix guidé
  incohérent avec son code (régularisation portant une heure, correction sans heure).
- Les contrats HTTP contrôlent les requêtes REST (liste de chaque nature, dossier et aperçu sous
  `/anomalies`), l'acquisition autoritaire, les refus et les reçus incohérents ; ils utilisent `HttpTestingController`.
- Les contrats HTTP vérifient que chaque refus connu d'un acte se traduit en son code sans le message du serveur, et
  qu'un code inconnu reste une erreur technique ; les specs DOM et Cypress vérifient qu'aucun identifiant n'est affiché
  dans `anomalie-refus`.
- Les contrats HTTP vérifient que le journal porte les noms reçus, ou des noms vides sans fiche, et que les lignes de
  la liste ne portent plus l'identifiant de l'opérateur.
- Les specs DOM du dossier vérifient l'en-tête nommé et les libellés d'activité des détails de traçabilité, des journaux
  avant/après et de l'historique obsolète ; les specs Cypress vérifient qu'aucun UUID d'opérateur ou d'activité n'y reste.
- Les contrats HTTP vérifient que le référentiel lit toutes les pages des opérateurs et des postes, et refuse une collection
  dont le total change, une page tronquée, une page autre que la demandée ou une identité dupliquée ; les opérateurs se lisent
  aussi seuls, sans aucune requête de postes, avec les mêmes refus ; la composition lit l'un et l'autre par les ports publics. Les specs DOM et Cypress vérifient qu'il n'est lu que pour un gestionnaire, que le choix se fait
  par nom (recherche, groupes de postes), qu'il invalide l'aperçu et que son échec se réessaie sans perdre la saisie ; ils vérifient que la liste ne lit que les opérateurs et que le filtre
  « Opérateur » reste utilisable quand les postes sont en panne ; Cypress intercepte `/api/operateurs` et `/api/postes-de-travail` en données REST typées.
- Les contrats HTTP vérifient que les éléments se lisent sur toutes les pages de `GET /api/elements-de-fabrication`, sur
  toute période, et refusent un total qui change, une page tronquée, une page autre que la demandée, une identité dupliquée
  ou un élément reçu sans identifiant ni nom ; la composition les lit par les ports publics. Les specs DOM et Cypress
  vérifient que le dossier ne les lit pas, que le filtre « Élément » de la liste se choisit par désignation sans jamais
  montrer l'identifiant, que son chargement et son échec se réessaient sans toucher au filtre « Opérateur » ; Cypress
  intercepte `/api/elements-de-fabrication` en données REST typées.
- Les specs DOM et Cypress vérifient les faits reçus, leurs dates affichées en heure locale (fixtures bâties
  depuis une heure locale, horloge fixée), les formulaires, la comparaison avant/après,
  les droits, la navigation et les reprises. Cypress utilise la composition HTTP réelle avec des
  réponses JSON typées interceptées, sans adapter de simulation ni stockage des aperçus.

La [documentation du contexte](AGENTS.md) décrit les responsabilités et les invariants.
