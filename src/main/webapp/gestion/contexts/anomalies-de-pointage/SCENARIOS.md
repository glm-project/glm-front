# Anomalies de pointage : garanties

Le backend Atelier fournit le dossier, l'aperçu et le reçu canonique. Le front utilise uniquement
`HttpAnomalies` et ne calcule ni interprétation du journal ni conséquences d'un acte.

## Proposition et confirmation

L'aperçu porte l'adresse, la commande, la révision attendue, l'acte exact, l'empreinte des conséquences
et l'identité prospective d'événement pour une correction ou une régularisation. L'annulation n'en
crée aucun. La confirmation transmet ces champs explicites ; l'évaluation et les dossiers avant et
après servent uniquement à la consultation. Toute modification de saisie invalide l'aperçu.

L'obsolescence conserve la saisie et retire l'aperçu. Une réacquisition échouée ne rétablit pas la
confirmation. Après récupération du dossier courant, le gestionnaire demande un nouvel aperçu dans la vue complète ; la vue de
résolution relance elle-même l'aperçu.

Une réponse d'écriture perdue bloque les nouvelles décisions. Vérifier le reçu ne rejoue aucun acte.
La reprise explicite transmet la proposition initiale immuable. Un reçu ne conclut l'écriture que si
la commande, l'adresse, la révision de départ, l'acte et l'événement créé correspondent exactement.
Une ancre annulée reste consultable et les continuations désignent les autres conflits explicitement.

## Issue d'un acte

L'aperçu et le reçu annoncent la même issue, qui dépend de la nature du dossier d'origine, celui affiché avant l'acte. Un
conflit s'achève par « anomalie traitée » (aperçu « Après cet acte : anomalie traitée », reçu « Anomalie traitée »), « conflit
levé · fin automatique restante » ou « conflit restant » (reçu « Acte enregistré, conflit restant »). Une fin automatique
s'achève par « anomalie traitée » ou « anomalie restante » (reçu « Acte enregistré, anomalie restante ») : elle ne se présente
jamais comme un conflit, même si l'après porte un conflit. Une adresse annulée ou remplacée reste « traitée » quand ni conflit
ni fin automatique ne subsistent. L'aperçu dit l'issue sans lien. Le reçu ajoute un lien « Traiter la fin automatique
restante » (numéroté « (1 sur 2) » s'il y en a plusieurs) par activité échue du dossier d'après, sauf celle de la page affichée (adresse d'origine), vers
`/anomalies/{suivi}?pointage={ouvrant}`, avec les paramètres de retour vers la liste (`nature`, `operateur`, `element`,
`page`) ; sans autre activité échue, aucun lien. L'origine est le dossier « avant » de l'aperçu confirmé, gardé avec la confirmation :
deux vérifications du reçu qui reviennent l'une après l'autre annoncent la même issue. Le front lit l'ouvrant dans `evenement` de l'activité reçue, il ne le déduit pas.

## Fin automatique

Le dossier d'une activité terminée à son échéance faute de fin réelle n'est jamais présenté comme un
conflit. Il montre l'activité échue sur la frise, son début, sa fin automatique et sa durée tels que reçus dans le panneau Sélection. Le
gestionnaire régularise la fin avec une heure qu'il saisit ou qu'il place en tirant le bout de la barre ou en cliquant dessus (la fin automatique se lit en ligne : repère ouvrant sur le début de sa barre, repère terminant sur son bout) : le
choix guidé arrive sans heure, aucune n'est inventée et l'aperçu reste indisponible tant qu'elle manque. Le clic (ou le glissé de la poignée « Heure ? » posée sur la fin reçue de la barre) place la
poignée à l'heure cliquée, arrondie à 5 minutes et ramenée à la borne la plus proche si elle sort du début de l'activité ou de
l'heure courante ; la poignée se glisse ensuite (en ligne, elle est le bout de sa barre : la barre finit à l'heure proposée, la portion retirée se dessine jusqu'à la fin reçue, et la fin automatique reste tracée). Une aide dit de tirer le bout de la barre ou de cliquer dessus pour placer l'heure du fait, ou de la saisir (même mot pour un arrêt et un passage) ; le clic est
inactif sans proposition de ce genre, et pendant une opération ; un clic sur un repère ou sur une autre barre sélectionne, comme l'activation au clavier de la barre visée. Une fin ou une transition pointée après l'échéance se corrige avec
l'heure de ce pointage et un motif. Le pointage que le choix désigne est marqué « pointé après
l'échéance » sur la frise et dans le panneau Sélection ; le front le lit dans le choix reçu, il ne le déduit pas. L'aperçu, la confirmation, le reçu, la reprise et l'obsolescence sont
ceux de tout acte ; les refus `suivi-d-atelier-cloture`, `operateur-non-habilite`,
`date-de-survenue-future` et `apercu-obsolete` s'y présentent sans écriture ni perte de saisie. Le reçu
annonce l'issue de l'acte (voir « Issue d'un acte ») ; « Anomalie traitée » seulement si ni `enConflit` ni
`finAutomatique` ne subsistent, y compris sur une adresse annulée, et il n'affiche alors plus de phrase de conflit,
réservée au périmètre reçu qui porte encore un conflit. Une activité sans poste n'en reçoit aucun.

## Phrase du problème

L'en-tête du dossier dit le problème en une phrase, sous l'élément, l'opérateur · poste, la date et la clôture ; elle
remplace les blocs « Pourquoi ces pointages sont incohérents » et « Fin automatique ». Un conflit en a une par
diagnostic, dans l'ordre reçu, selon sa raison : « L'arrêt de 17:00 vise le travail, remplacé à 12:00 par un passage
en NC. » ; sans le fait contradictoire, « L'arrêt de 17:00 vise un travail qui n'est plus en cours. » Sans diagnostic
reçu, l'explication de la ligne tient lieu de phrase. Une fin automatique en a une par activité échue : quand un choix de
correction tardive est reçu, elle nomme le pointage tardif (« L'arrêt de 19:30 vise le travail, déjà terminé automatiquement
à 18:00. ») ; sinon, quand un choix de régularisation de fin vise l'activité, « Le travail démarré à 08:00 n'a jamais été
arrêté : fin automatique à 18:00. » ; sans l'un ni l'autre, « Le travail démarré à 08:00 a été terminé automatiquement à
18:00. », qui n'affirme rien de ses pointages. Les faits de
l'activité échue (début, fin automatique, durée) sont dans le panneau Sélection, l'activité étant sélectionnée à l'ouverture. Aucune phrase ne porte d'identifiant, ni de
lien : un pointage absent du journal se dit « Un pointage non résolu ».

## Frise et sélection

Les pointages de l'anomalie et les activités du dossier se lisent sur une frise sous l'en-tête, à la place de la chronologie en liste et
de « Activités concernées ». Chaque activité a sa rangée, dans l'ordre de leur début : une barre `accent` pour le travail,
`nc` pour la non-conformité, finie à la fin reçue (`TERMINEE`), en pointillés `warn` à la fin automatique (`ECHUE`), ou
ouverte jusqu'au bord (`EN_COURS`, `A_RESOUDRE` hachurée « À résoudre ») ; la frise n'invente aucune fin. Chaque pointage est
un repère (symbole du geste, heure HH:MM, barré s'il est annulé, « R » s'il est régularisé, rouge s'il est en cause), décalé
d'une voie entière (44 px) quand deux repères sont à moins de 44 px sur leur position dessinée (recul aux bords compris), sur une rangée titrée « Pointages » ; une flèche pointillée relie le pointage en cause au début de l'activité que son
diagnostic vise. Le journal du suivi peut couvrir d'autres jours et d'autres opérateurs : la frise n'en montre que les pointages de
l'anomalie (les pointages du périmètre reçu, ceux de la séquence en conflit, et les pointages que les diagnostics citent, dont le démarrage annulé
d'un `OUVRANT_ANNULE` et les arrêts qui le visent). L'échelle va d'une heure avant le premier instant reçu de ces pointages et
des activités à une heure après le dernier, par heures entières, et couvre l'heure proposée quand une poignée est posée. Elle tient dans la largeur de l'écran, sans défilement
horizontal ni de la frise ni de la page : les graduations s'espacent selon la largeur (pas de 1 à 12 h, puis en jours, jamais deux traits
à moins de 64 px), le jour s'affiche à chaque minuit gradué, et les repères comme la poignée restent à 22 px des bords. Repères et barres sont des
boutons (`aria-pressed`) qui suivent l'ordre du temps ; leur nom porte l'heure avec ses secondes et le geste, ou la
catégorie, la période et l'état.

Sous le titre de la frise, une phrase résume ce que l'opérateur de l'anomalie a pointé d'autre sur l'élément : « Hors de
cette anomalie, Camille Martin compte sur cet élément 1 pointage plus tôt ce jour-là (dès 06:00), 1 pendant cette période et 21 les jours
précédents, depuis le jeudi 10 septembre. » Seuls comptent les pointages de cet opérateur, annulés exclus ; ceux d'un autre opérateur
sont ignorés. La période de référence est celle de l'anomalie, pas l'échelle : la phrase ne change pas quand la poignée élargit
l'échelle ni quand un aperçu s'affiche. Les groupes sont : plus tôt le jour local du début (« dès HH:MM »), pendant la période, plus
tard le jour local de la fin (« jusqu'à HH:MM »), et les autres jours (« les jours précédents, depuis le … », « les jours suivants,
jusqu'au … », ou « les autres jours » quand ils sont des deux côtés). La période tient dans un jour : « ce jour-là » ; sur deux jours, le
jour est nommé. L'année s'ajoute quand elle diffère de l'année en cours. Sans nom résolu, la phrase dit « l'opérateur » ; sans autre
pointage de l'opérateur sur l'élément, il n'y a pas de phrase.

À droite du titre de la frise, un lien (`anomalie-frise-journee`) « Voir la journée de Camille Martin » (« … de l'opérateur » sans nom
résolu) mène au relevé des heures de l'opérateur de l'anomalie, `/operateurs/{id}/heures?jour=AAAA-MM-JJ`, qui ouvre la semaine
contenant ce jour, ce jour ouvert. Le jour est le jour local du pointage qui pose problème : le plus ancien pointage tardif d'une fin
automatique (le lendemain, c'est le jour de l'arrêt tardif) ; sinon le plus ancien pointage en cause d'un diagnostic, celui de la
sélection initiale ; sinon le jour local du début de la période de l'anomalie. Un jour local proche de minuit reste celui de l'horloge
locale, non celui d'UTC. Sans pointage ni activité pour dater la période, il n'y a pas de lien.

Quand un aperçu est disponible, des rangées « Après cet acte » s'ajoutent sous la frise sur la même échelle, qui couvre aussi les
instants de l'après : les pointages de l'après, puis une barre par activité de l'après, avec les fins reçues seulement. Elles
ne se sélectionnent pas et ne changent pas la sélection du dossier. Une activité dont l'état, le début, la fin ou la durée
reçus changent entre l'avant et l'après, ou qui est nouvelle, est mise en évidence et se dit « modifiée » dans son nom ; le
fait que l'acte corrige ou crée est vert (« posé par cet acte ») ; un pointage annulé par l'acte est barré. La poignée reste
affichée avec l'aperçu ; toute modification de la saisie, un déplacement de la poignée compris, retire l'aperçu et ces rangées.
La section d'aperçu garde l'acte, l'issue, l'enregistrement, les conséquences textuelles reçues et, repliée, la comparaison
de tous les pointages avant et après.

Sur la frise d'une fin automatique lue en ligne, une poignée vise une activité : si l'après contient cette activité et ne change
aucune autre, il n'y a pas de rangées « Après cet acte » ; la barre visée dit l'état et le temps que l'aperçu reçoit pour elle
(« Terminée · 9 h », dans son texte et son nom, mise en évidence), et le pointage posé par l'acte n'est plus dessiné à part. Sans
cela (annulation, activité absente de l'après, autre activité changée), les rangées « Après cet acte » restent celles ci-dessus.
Déplacer la poignée retire l'aperçu, donc cet état de la barre.

Le panneau « Sélection », avant « Votre décision », montre le pointage choisi : geste, instant avec ses secondes, opérateur et
poste, régularisation, annulation (motif, auteur, instant), remplacement, activités visée et créée, enregistrement (instant
et auteur), puis Corriger et Annuler. Un pointage annulé n'a ni l'un ni l'autre ; une opération en cours
les désactive. Pour une activité, il dit sa catégorie, son état et son temps reçus, son
début et sa fin reçus (« Fin »), sans bouton d'acte ; l'état d'une activité échue se dit « Fin automatique », jamais « Échue ». Un pointage du journal hors de l'anomalie ne s'y
affiche pas, ne se corrige ni ne s'annule depuis ce dossier (« Ajouter un pointage manquant » reste). À l'ouverture d'un conflit,
le plus ancien pointage en cause parmi ceux de l'anomalie est sélectionné ; à l'ouverture d'une fin automatique, l'activité échue ; si
les deux sont portés, le pointage en cause ; sinon le panneau dit « Sélectionnez un pointage ou une activité sur la frise pour
voir ses détails. ». Un nouveau dossier (autre adresse, relecture, reçu) rend la sélection initiale du nouveau dossier, jamais
un élément absent de celui-ci. Sélectionner n'est pas choisir un acte : la proposition, l'aperçu et le choix guidé ne
bougent pas. Corriger et Annuler du panneau préparent la proposition exactement comme avant.

## Vue de résolution d'une fin automatique

Un dossier de fin automatique sans conflit à expliquer, qui porte un seul choix (`REGULARISER_FIN`, `CORRIGER_FIN_TARDIVE` ou
`CORRIGER_TRANSITION_TARDIVE`) visant l'activité que son adresse ouvre, s'ouvre dans une vue de résolution : la phrase du problème, la frise en lecture seule, le champ « Fin réelle », l'aperçu en
une ligne, « Valider la fin à HH:MM » et « Autre correction… ». La page choisit la vue à l'ouverture de l'adresse et la fige
jusqu'au changement d'adresse : le reçu qui remplace le dossier ne la fait pas basculer. Tout autre dossier (un conflit, un choix de
conflit en plus de la fin, un choix qui vise une autre activité) garde la vue complète.

Pour une correction tardive (`CORRIGER_FIN_TARDIVE`, `CORRIGER_TRANSITION_TARDIVE`), la vue s'ouvre sur l'heure reçue du pointage
tardif : le champ, la poignée et le bouton « Valider la fin à HH:MM » (« Valider le passage à HH:MM » pour une transition, avec
le champ « Heure du passage » et une ligne « La non-conformité commencera à cette heure. » ou « Le travail reprendra à cette heure. »)
la portent, et l'aperçu part dès l'ouverture, sans que le gestionnaire ait rien touché. Le motif découle du cas (« Arrêt pointé
après l'échéance : heure vérifiée en gestion », « Passage pointé après l'échéance : heure vérifiée en gestion ») : il part avec
l'acte et le journal le garde, mais la vue ne le montre nulle part, « Voir le détail » compris. Valider sans rien changer est
légitime : l'activité se termine alors au-delà de l'échéance. « Autre correction… » ne demande de confirmation que si l'heure
diffère de l'heure reçue.

Pour `REGULARISER_FIN`, la vue ne pré-remplit aucune heure. Le gestionnaire la place en tirant la poignée « Heure ? », en cliquant sur la barre ou en la
saisissant au champ. L'aperçu part seul : au relâcher de la poignée, 400 ms après la dernière frappe ou touche, ou après un clic
sur la barre ; il ne désactive ni le champ, ni la poignée, ni le clic sur la barre, et ne déplace pas le focus. Une heure hors des
bornes locales (future, avant le début de l'activité) ne part pas au serveur et se dit sous le champ ; un refus du serveur se dit sous
la frise ; une erreur réseau offre « Réessayer l'aperçu » ; une réponse périmée est écartée. « Valider » n'est actif que sur un aperçu
reçu, à jour et sans refus. Après `CONCURRENCE`, la vue relit le dossier et relance l'aperçu avec la même heure.

Le reçu s'affiche dans la vue (« Anomalie traitée », ou « Acte enregistré, anomalie restante » avec un lien par fin automatique
restante). Une ligne « 1 autre fin automatique sur cet élément » mène à l'adresse d'une autre fin échue de l'élément, avec les
paramètres de la liste. « Autre correction… » mène à la vue complète, sans acte choisi, avec un lien « Revenir à la vue simple »,
retiré dès qu'un autre acte y est enregistré ; une heure saisie est d'abord confirmée.

Avec le reçu, la vue offre « Anomalie suivante ». Au clic, elle mène : 1. à la première fin automatique restante du même dossier, sans lire
la liste ; 2. sinon à une autre ligne de la liste, lue à ce moment avec les filtres de l'adresse (`nature`, `operateur`, `element`, `page`,
la nature valant `FIN_AUTOMATIQUE` si elle manque), l'adresse d'origine exclue ; si la page n'a plus d'autre ligne, la lecture recule d'une seule
page ; 3. sinon à la liste (`page` retirée, `plusAucune=1`), qui dit « Plus aucune anomalie » au-dessus de ses lignes. Si la lecture de la liste
échoue, la vue mène à la liste sans ce message, et la liste affiche sa propre erreur.

## Actions directes

« Votre décision » présente, dans cet ordre, les propositions du serveur (les choix guidés reçus, tous de même rang, aucun
présélectionné), les actions directes sur les pointages en cause, puis « Autres corrections ». Une action directe est une saisie
d'acte de départ, que le gestionnaire choisit puis complète : elle vient du front, depuis les diagnostics, alors que Corriger et
Annuler du pointage sélectionné se choisissent sur la frise. Les actions directes viennent d'une politique du
domaine (`ActionsDirectes`) qui lit les diagnostics d'un conflit : annuler le pointage en cause, quelle que soit la raison ;
annuler aussi le terminant pour `CIBLE_DEJA_TERMINEE` ; corriger l'heure du pointage en cause pour `GESTE_AVANT_OUVERTURE` ;
rien de plus pour `OUVRANT_ANNULE`. Chaque action porte sa saisie d'acte, et le primaire ne reconstruit aucune commande. Une action
que le serveur propose déjà (même acte, même pointage) n'est pas répétée ; deux diagnostics sur le même pointage n'en donnent
qu'une ; un pointage absent du journal ou déjà annulé n'en reçoit aucune ; l'ordre suit les diagnostics reçus, le pointage en
cause avant son terminant. Un dossier qui n'est plus en conflit, ou sans diagnostic, n'en propose aucune.

Chaque action est nommée par le geste et l'heure du pointage visé (« Annuler l'arrêt de 17:00 », « Corriger l'heure de l'arrêt de
07:00 », « Annuler le passage en NC régularisé de 18:00 » quand le pointage l'est), avec les secondes quand un autre pointage du
journal tombe dans la même minute. La choisir prépare la saisie attendue
(annulation ou correction, motif à saisir), met le focus sur la proposition, ouvre le champ heure pour une correction et se
comporte comme une proposition du serveur : une seule solution est pressée à la fois. La section n'apparaît que s'il y a une
action. Une opération en cours les désactive. « Autres corrections »
remplace le repli « Un pointage manque sur la frise ? » : il rappelle que Corriger et Annuler du pointage sélectionné sont
dans le panneau Sélection et garde « Ajouter un pointage manquant » (la régularisation).

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
sont lus seuls (`operateurs()`, sans les postes que la liste n'emploie pas) à chaque ouverture de la liste, et une panne de `/api/postes-de-travail` ne l'atteint pas.
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
la mention « Régularisation ». Un fait hors de ces cinq gestes (type ou intention vides, ou incompatibles) garde « Type ·
Intention » des champs remplis dans le résumé de la proposition, sans rien afficher quand les deux sont vides : l'écran ne peut
plus saisir un type seul, une intention seule ou une combinaison incompatible, les pointages reçus restent couverts par les specs
du libellé.

Le formulaire de correction et de régularisation dit ce que signale le pointage par un seul choix (`anomalie-signal`, un
`<select>` natif) : Démarrage, Démarrage en NC, Passage en NC, Retour en bon, Arrêt, dans cet ordre. Il remplace les groupes
Type et Intention ; choisir un geste change le type et l'intention d'un coup, retire l'aperçu et reste verrouillé pendant une
opération. Le domaine possède les combinaisons valides ; un geste à moitié choisi ne demande que ce qui manque (jamais « incompatible »). Une régularisation à partir de rien montre l'option vide « Choisissez ce que signale le pointage », sélectionnée et
non choisissable, et une seule erreur lisible, jamais le type puis l'intention. « Activité qu'il termine » (`anomalie-cible`)
n'apparaît que pour un passage ou un arrêt, et tant qu'une cible est posée : un démarrage qui la garde la montre encore avec
« Une ouverture ne vise aucune activité ; effacez explicitement la cible. », et le champ disparaît quand le gestionnaire l'a
effacée. Le formulaire et l'aperçu de l'acte n'affichent aucun identifiant. L'opérateur et le poste se replient en une ligne
« Camille Martin · Fraiseuse 1 » (« Opérateur non résolu », « Poste non résolu », « Sans poste » selon les règles de l'aperçu)
avec « Modifier » (nom accessible « Modifier l'opérateur et le poste »), qui déplie ou replie leurs champs ; une nouvelle saisie
d'acte repart repliée. Ils sont dépliés d'office pendant le chargement initial du référentiel ou sa panne, et pour une
régularisation à partir de rien : la ligne et « Modifier » sont alors masqués, les champs disant déjà « Opérateur actuel conservé »
ou « Choisissez l'opérateur », et ils n'apparaissent qu'une fois l'opérateur choisi, au-dessus des champs restés dépliés. L'opérateur se choisit
par son nom (« Prénom Nom », suivi de son code pupitre quand il en a un) dans une recherche sans accents sur le nom, le
prénom et le code ; le poste se choisit dans une liste qui commence par « Sans poste », puis les postes habilités de
l'opérateur choisi, puis les autres. Tant que la saisie n'a pas d'opérateur (régularisation d'un fait manquant), le bouton
dit « Choisissez l'opérateur » et l'aperçu reste indisponible. Choisir un opérateur ou un poste modifie la saisie et retire
l'aperçu. Une référence que le référentiel ne contient pas reste sélectionnée comme « Opérateur non résolu (référence
actuelle) » ou « Poste non résolu (référence actuelle) ». L'aperçu nomme l'opérateur et le poste de l'acte depuis le
référentiel, puis depuis le journal, sinon « non résolu ». Si le référentiel est indisponible, le dossier le dit, propose
« Réessayer » et conserve la saisie, l'opérateur et le poste courants s'affichant « Opérateur actuel conservé » et « Poste
actuel conservé » (jamais « non résolu » : le référentiel n'a pas été lu), de même que l'aperçu de l'acte quand le journal
ne les nomme pas. Pendant la relecture,
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
Tant que le gestionnaire ne touche à rien, l'instant reçu part inchangé, nanosecondes comprises. Après une saisie, il part
avec l'offset local et sans fraction de seconde. Une date sans heure, ou l'inverse, garde ce qui est saisi, bloque
l'aperçu et affiche « Renseignez la date et l'heure du fait. ». Au changement d'heure, une heure inexistante est refusée
(« Cette heure n'existe pas ce jour-là, à cause du changement d'heure. ») et une heure répétée prend sa première
occurrence, y compris le jour même du changement d'heure, que l'horloge de la page soit ce jour-là ou que l'instant reçu
en soit. Une nouvelle proposition (un choix, même identique, ou « Ajouter un pointage manquant ») repart d'un champ neuf : la date ou
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
est lue à chaque action du gestionnaire (choisir, modifier, déplacer) et au moment de prévisualiser, jamais figée à l'ouverture de la
page : une heure devenue passée pendant que l'onglet reste ouvert est acceptée. `matches()` compare sans bornes. Le refus
serveur `date-de-survenue-future` reste l'autorité : ces bornes sont des pré-contrôles de saisie, et `INSTANT_AVANT_CIBLE` une règle
de Gestion sans refus serveur connu.

Le champ n'est pas la seule saisie qui émet un instant : pour une correction ou une régularisation dont le fait est un
passage ou un arrêt avec une activité visée qui donne une borne basse, la frise porte une poignée (rôle `slider`) sur
l'heure proposée. Au pointeur, elle suit le glisser par pas de 5 minutes sans sauter sous le doigt ; au clavier, les
flèches la bougent d'une minute (Maj : quinze), Origine et Fin la portent aux bornes ; « −5 min » et « +5 min » de la
décision font de même sans glisser. Elle ne sort jamais des bornes (début de l'activité visée, et la plus proche de l'heure
courante lue à l'action et de trois heures après le dernier instant reçu, en minutes entières à la nanoseconde près) ; un bouton
est désactivé à la borne. L'échelle ne va pas au-delà de ces trois heures : une heure plus lointaine se saisit au champ. Chaque
déplacement transmet l'instant avec l'offset local et sans seconde, retire l'aperçu et met le champ à jour ; saisir une heure au
champ déplace la poignée. Une heure saisie hors des bornes (avant le début de l'activité visée, dans le futur ou au-delà de la
portée) garde sa poignée, tenue à la borne la plus proche : le champ dit pourquoi, l'aperçu reste indisponible, et le premier
déplacement ramène l'heure dans les bornes. Un fait
sans activité visée, un démarrage ou une annulation n'ont pas de poignée ; une régularisation sans heure n'en a pas en rangées, et en ligne
n'a qu'une poignée « Heure ? » sans heure, dans l'ordre de tabulation : la régularisation d'une fin sans heure reçoit son heure au clic sur la
barre, au glissé de cette poignée ou à sa première touche, une flèche la posant sur la fin reçue, Origine et Fin aux bornes (« Fin automatique »). L'heure reçue du
pointage corrigé reste barrée sur son repère quand la poignée s'en éloigne. La poignée et ses boutons sont désactivés tant
qu'une opération est en cours. L'heure répétée d'automne se lit avec son offset (`aria-valuetext`) ; l'échelle élargie
traverse minuit et l'heure répétée, sans jamais deux graduations à moins de 64 px.

## Frontières de vérification

- Les specs de domaine passent par `SaisieActe`, `CadreDuFait`, `ResolutionDeLAnomalie` et `ActionsDirectes` ; elles vérifient
  les motifs, le choix explicite, la précision des instants, les bornes du fait, l'invalidation d'un aperçu et les actions
  directes par raison (dédoublonnage, pointage absent ou annulé, ordre) ; les specs DOM prouvent l'ordre des trois sortes de
  solutions et la ligne d'identité masquée quand les champs sont dépliés d'office.
- Les specs d'application passent par les ports publics et contrôlent les doubles envois, les réponses
  tardives, l'obsolescence et la vérification d'une issue inconnue.
- Les contrats HTTP lisent un dossier `FIN_AUTOMATIQUE` depuis son périmètre reçu et rejettent un choix guidé
  incohérent avec son code (régularisation portant une heure, correction sans heure).
- Les contrats HTTP traduisent le périmètre reçu de tout dossier (lecture, aperçu avant et après, reçu) en périmètre du dossier,
  réuni à la séquence quand elle est reçue, et rejettent un dossier sans périmètre reçu. Les specs DOM vérifient qu'un journal plus large que
  l'anomalie ne dessine, ne sélectionne et ne borne que les pointages de l'anomalie, et que la comparaison avant et après
  garde le journal complet.
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
  aussi seuls, sans aucune requête de postes, avec les mêmes refus ; la composition lit l'un et l'autre par les ports publics. Les specs DOM et Cypress vérifient que le choix se fait
  par nom (recherche, groupes de postes), qu'il invalide l'aperçu et que son échec se réessaie sans perdre la saisie ; ils vérifient que la liste ne lit que les opérateurs et que le filtre
  « Opérateur » reste utilisable quand les postes sont en panne ; Cypress intercepte `/api/operateurs` et `/api/postes-de-travail` en données REST typées.
- Les contrats HTTP vérifient que les éléments se lisent sur toutes les pages de `GET /api/elements-de-fabrication`, sur
  toute période, et refusent un total qui change, une page tronquée, une page autre que la demandée, une identité dupliquée
  ou un élément reçu sans identifiant ni nom ; la composition les lit par les ports publics. Les specs DOM et Cypress
  vérifient que le dossier ne les lit pas, que le filtre « Élément » de la liste se choisit par désignation sans jamais
  montrer l'identifiant, que son chargement et son échec se réessaient sans toucher au filtre « Opérateur » ; Cypress
  intercepte `/api/elements-de-fabrication` en données REST typées.
- Les specs DOM du dossier vérifient le choix de ce que signale le pointage (options et ordre, option vide, une seule erreur,
  type et intention changés d'un coup), la cible visible tant qu'elle est posée, et l'opérateur et le poste repliés, dépliés par
  « Modifier » ou d'office ; `PresentationDossier.spec.ts` ne garde que ce que le DOM n'atteint pas (repli du libellé d'un fait hors des cinq gestes, geste lu d'un choix inconnu) ; `SaisieActe.spec.ts` fixe `operateurManque()` et `cibleApplicable()`, que la page consomme, et la règle du geste à moitié choisi.
- Les specs DOM et Cypress vérifient les faits reçus, leurs dates affichées en heure locale (fixtures bâties
  depuis une heure locale, horloge fixée), les formulaires, la comparaison avant/après,
  la navigation et les reprises. Cypress utilise la composition HTTP réelle avec des
  réponses JSON typées interceptées, sans adapter de simulation ni stockage des aperçus.

La [documentation du contexte](AGENTS.md) décrit les responsabilités et les invariants.
