# Correction des activités

Ce contexte de `gestion` porte la correction, par le gestionnaire, de la journée d'un opérateur : ajouter une
activité oubliée, changer le poste d'une activité, retirer une activité pointée par erreur. Il corrige des activités,
jamais des pointages. La page garde le titre « Corriger la journée ». La décision est l'ADR 0055
([documentation/adr/0056-let-the-gestionnaire-correct-an-operator-day.md](../../../../../../documentation/adr/0056-let-the-gestionnaire-correct-an-operator-day.md)).

Il n'y a aucun agrégat côté front : la page est un modèle de lecture. Les invariants qui demandent une cohérence
immédiate (chevauchement, clôture, habilitation) appartiennent au `SuiviDAtelier` du back.

## Vocabulaire

| Terme                  | Sens                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| journée à corriger     | ce que lit la page : bornes du jour, activités, durée opérationnelle, choix d'ajout                              |
| bornes du jour         | début et fin du jour, fin du lendemain, rendus par le back                                                       |
| activité de la journée | une activité terminée ou en cours qui touche ce jour                                                             |
| corrigeable            | terminée, normalement, automatiquement ou par une fin régularisée, et dont le suivi n'est pas clôturé            |
| portion du jour        | la part d'une activité comptée ce jour-là                                                                        |
| durée                  | un temps exact, à la milliseconde (`Duree`) : portion, total d'une activité, durée opérationnelle                |
| suivi présent          | un suivi engagé avant la fin du jour et non clôturé avant son début                                              |
| type                   | travail ou non-conformité (`categorie` dans le domaine et le contrat)                                            |
| correction             | un ajout, un changement de poste ou un retrait                                                                   |
| saisie                 | le contenu d'une correction et son identifiant, oubliés une fois la correction enregistrée ou la journée changée |
| effet sur les journées | la prévision par jour touché                                                                                     |
| plage d'ajout          | le début (sur le jour affiché) et la fin (sur le jour de la fin) tapés en `HH:MM` d'une activité à ajouter       |
| jour de la fin         | le jour affiché ou le lendemain : le jour sur lequel se lit la fin tapée d'un ajout                              |
| portions de l'ajout    | la durée de l'ajout comptée sur le jour affiché et, s'il finit le lendemain, sur le lendemain                    |
| ajout en préparation   | ce que le gestionnaire a choisi et tapé dans le panneau d'ajout : élément, poste, type, plage                    |
| journée changée        | la journée lue n'est plus celle du serveur : on relit et on recommence                                           |

Mots à éviter : « pointage » (on corrige des activités ; seul l'identifiant du pointage ouvrant nomme une activité),
« acte » (on dit correction), « nature » pour le type (la nature est celle du poste), « régularisation » (le mot des
anomalies dans le front), « supprimer » ou « annuler » (on retire, et le fait reste au journal).

## Lecture de la journée

`JourneeACorrigerPort.lire(operateur, jour)` est l'unique port de lecture de la vue
([ADR 0033](../../../../../../documentation/adr/0033-compose-view-data-in-secondary-adapters.md)) :
`GET /api/atelier/operateurs/{operateurId}/journees/{jour}`. Un opérateur inconnu (`operateur-introuvable`) est une
absence connue, `undefined`, sans signalement technique ; toute autre panne ou réponse invalide est signalée une fois
et rejette la lecture. Les types générés restent dans `HttpJourneeACorriger`.

- Les instants arrivent en UTC (`Z`), les durées en ISO-8601, les jours en `AAAA-MM-JJ` du fuseau de l'atelier. Le
  domaine ne connaît aucun fuseau et ne calcule aucun minuit : les bornes du jour (début, fin et fin du
  lendemain) viennent du back et se suivent.
- Une activité est identifiée par son pointage ouvrant, qui ne change pas avec son poste. Sa portion du jour et ses
  autres jours sont reçus ; le front ne découpe aucune activité existante.
- Une activité en cours n'a ni fin ni durée. Une activité sans poste pointé est possible.
- `etat` distingue `TERMINEE` (fin pointée, régularisée, ajoutée ou posée par la clôture), `TERMINEE_AUTOMATIQUEMENT`
  et `EN_COURS`. Une fin régularisée est donc une activité `TERMINEE`.
- La clôture d'une activité se lit dans les suivis présents du choix d'ajout, par `JourneeACorriger.clotureDe`. Une journée
  refuse l'activité dont le suivi n'est pas parmi ses suivis présents ou dont l'élément n'est pas celui de ce suivi. Un
  suivi présent porte un élément ; un élément a au plus un suivi (back #149) : aucune entrée à distinguer, un élément
  n'apparaît qu'une fois parmi les suivis présents.
- Une `Duree` garde les secondes reçues et s'additionne sans perte ; seule la restitution (`LibellesCorrectionDesActivites`)
  tronque à la minute, sur le total et non sur chaque portion.
- Le numéro d'un élément est sa référence, à défaut son nom ; sa désignation est sa description.

Le domaine ne porte que ce que la page lit ou ce que consomment les corrections livrées (ADR 0037) : la fin du lendemain
sert à borner l'ajout qui finit le lendemain.

- `JourneeACorriger.postesPourChanger(activite)` rend les postes habilités de l'opérateur sauf le poste actuel de l'activité
  (tous les postes habilités pour une activité sans poste). `activiteCorrigeable(id)` retrouve une activité corrigeable
  par son identifiant : la page s'en sert pour savoir si le panneau ouvert a encore une activité à corriger après une
  relecture.
- `JourneeACorriger.estCorrigeable(activite)` décide « corrigeable » : activité terminée (`TERMINEE`, qui dit aussi la fin
  régularisée, ou `TERMINEE_AUTOMATIQUEMENT`) dont le suivi n'est pas clôturé (`clotureDe`). C'est un prédicat de type :
  il rend une `ActiviteTerminee`, dont l'état porte la fin et la portion du jour, ce qui évite de tester `EN_COURS` à chaque
  usage. `ActiviteDeLaJournee.estACheval()` dit qu'une portion est comptée un autre jour.

## Restitution de la page

`CorrigerLaJourneePage` lit l'adresse et le jour courant (`localCalendarDay`, lu par la page). Un `:jour` mal formé, hors
calendrier ou après aujourd'hui (`JourACorriger.demande`) ramène au relevé de l'opérateur, `/operateurs/:operateur/heures`,
sans rien lire ; un opérateur inconnu affiche « Opérateur introuvable » sans signalement technique ; une panne de lecture
affiche un message et « Réessayer ». Le retour mène à `/operateurs/:operateur/heures?jour=…`. Les flèches « Voir le … » sont
des `routerLink` vers le jour précédent et le suivant (`JourACorriger.precedent`, `suivant`) ; il n'y a pas de jour suivant
après aujourd'hui ni de borne vers le passé. Le jour affiché n'est lu que dans l'adresse.

- **Frise** (`FriseDuJour`) : lecture seule, une ligne par élément et poste, sur l'`AxeDuJour` partagé (de 6 h à 22 h, le jour
  entier dès qu'une borne en sort). Un repère marque le début et la fin réels, jamais une coupure de minuit : une activité à cheval
  est coupée aux bornes reçues (`debutAvantLeJour`, `finApresLeJour`) et nomme l'autre jour (« ← début le lundi 5 à 22:00 »,
  « suite le mardi 6 → »). Une activité en cours est un repère ponctuel, sans barre ; une fin automatique n'a pas de repère de
  fin et termine sa barre par l'embout hachuré `warn`, nommé dans la légende. L'en-tête dit « Opérationnel » et la durée du jour.
  Tant qu'un ajout est en préparation, la frise dessine l'activité à venir en pointillé (`data-en-attente`, sans repère de début
  ni de fin), sur la ligne de son élément et de son poste, ou sur une ligne « À ajouter » tant qu'aucun élément n'est choisi ;
  elle n'est dessinée qu'une fois les deux heures tapées et cohérentes (la fin suit le début). L'axe l'inclut : il s'ouvre sur le
  jour entier dès qu'elle sort de 6 h à 22 h. L'en-tête montre alors « Opérationnel : 4 h 45 → 6 h 15 » (avant → après).
  Un ajout qui finit le lendemain est coupé à la fin du jour reçue, sans repère de fin, et nomme sa suite sur la ligne : « 2 h 00 ce jour · suite le mardi 6 → ».
- **Liste** (`ActivitesDuJour`) : par début. La durée est la portion du jour ; une activité à cheval ajoute « sur 5 h 30 »
  (`dureeTotale`) et des liens « début le … » ou « fin le … » vers l'autre jour, pris dans les portions reçues (`jourDuDebut`,
  `jourDeLaFin`). « en cours » sans durée, « fin automatique », « Clôturé le lundi 5 à 11:00 » pour un suivi clôturé. Une
  activité en cours depuis la veille nomme son jour de début (« depuis lundi 5 à 22:00 », comme la frise) ; le back ne lui
  envoie aucune portion, donc aucun lien « début le … ». Chaque activité corrigeable porte le bouton-icône « Retirer l'activité OF 24-131, 18:30 → 21:45 » (nom construit
  du numéro de l'élément et des horaires, par `LibellesCorrectionDesActivites`). Elle porte aussi le bouton-icône « Changer le poste de l'activité OF 24-131, 18:30 → 21:45 » (même nommage).
  Son en-tête porte le bouton « Ajouter une activité » (désactivé pendant un envoi, `aria-expanded` tant que le panneau d'ajout
  est ouvert), même sur un jour vide.
- Tous les mots affichés sont dans `LibellesCorrectionDesActivites.ts` ; les jours et les heures passent par `DateFormats`.

## Corrections

Une correction est une commande sur un seul suivi, envoyée par `CorrectionsPort` et résolue en `ResultatDeCorrection` :
`ENREGISTREE`, `JOURNEE_CHANGEE`, ou `REFUS { motif }` quand la correction a des motifs qu'un gestionnaire peut corriger.
Le type du résultat prend le type des motifs : le retrait n'en a aucun, donc aucun `REFUS` n'existe pour lui ; le changement
de poste n'a que `CHEVAUCHEMENT` ; l'ajout a `CHEVAUCHEMENT` et `FIN_FUTURE`.

- **Saisie.** `SaisieDeRetrait.pour(precedente, activite, nouvelIdentifiant)`, `SaisieDeChangementDePoste.pour(precedente, activite, poste, nouvelIdentifiant)`
  et `SaisieDAjout.pour(precedente, contenu, nouvelIdentifiant)` lient l'identifiant au contenu : la même activité
  (pour un ajout : mêmes opérateur, suivi, poste, type, début et fin) garde l'identifiant de la saisie précédente (un renvoi
  après une réponse perdue est la même commande), une autre reçoit un identifiant neuf.
- **Coordinateur.** `CorrectionDUneActivite` (fourni par la page, donc partagé avec le dialogue ouvert depuis elle) envoie,
  n'envoie rien tant qu'un envoi est en vol (double clic), et passe à `A_RELIRE { issue }` après `ENREGISTREE` ou
  `JOURNEE_CHANGEE` en oubliant la saisie : le même contenu renvoyé plus tard reçoit un nouvel identifiant, car ces
  corrections se défont. Après un échec technique (`ECHEC`) la saisie reste, et le renvoi garde son identifiant. Il ne
  relit pas : la page détient la lecture. Après un refus (`REFUSEE { motif }` pour le changement de poste, `AJOUT_REFUSE { motif }`
  pour l'ajout, dont le motif a un type propre) la saisie reste aussi : le renvoi garde son identifiant. Le retrait, le
  changement de poste et l'ajout gardent chacun leur saisie ; `abandonnerLAjout()` oublie celle de l'ajout, comme
  `abandonnerLeChangementDePoste()` celle du changement.
- **Effet sur les journées d'un changement de poste.** Aucun calcul : le panneau dit « Le temps ne change pas ».
- **Effet sur les journées.** `EffetSurLesJournees.duRetrait(journee, activite)` rend le jour affiché, durée
  opérationnelle avant → après (moins la portion du jour), et chaque autre jour touché avec la portion retirée, reçue du
  serveur (`autresJoursRetires`). Il ne découpe jamais une activité existante. `EffetSurLesJournees.dUnAjout(journee, plage)` rend le jour affiché,
  durée opérationnelle avant → après (plus la portion du jour affiché), ou rien tant que la plage n'est pas cohérente ; l'ajout
  qui finit le lendemain ajoute la portion du lendemain, seule (« + 3 h 30 », `autresJoursAjoutes`) : la lecture ne rend pas la
  durée de ce jour. Les portions sont un objet du domaine, `PortionsDeLAjout` (`duJourAffiche`, `duLendemain` s'il y en a un,
  `finSurLeJourAffiche`, l'intervalle), rendu par `PlageDAjout.portions()` et coupé à la fin du jour reçue
  (`IntervalleDAjout.coupeA`) : c'est l'unique endroit qui décide de la coupure, que la frise, l'effet et le message lisent.
  Aucun minuit n'est calculé, et la nuit d'un changement d'heure compte sa durée réelle. Une plage dont le début ou la fin sort
  des jours reçus (fin après la fin du lendemain, navigateur hors du fuseau) n'a aucune portion : ni effet, ni dessin, et
  l'erreur le dit. Les autres erreurs (fin après « maintenant », après la clôture) laissent la plage dessinée et prévue.
- **Retrait.** Le bouton de la liste demande à la page (`retraitDemande`) d'ouvrir `RetraitDeLActivite`, un `MatDialog`
  avec `ConfirmationContent` : titre « Retirer l'activité de 18:30 à 21:45 ? » (« du lundi 5, 20:30, au mardi 6, 04:00 ? »
  à cheval), l'activité et sa durée totale, une ligne d'effet par jour, « Le retrait vaut pour toute l'activité : le mardi 6
  perd aussi 3 h 30. » quand elle déborde, « Garder l'activité » et « Retirer l'activité ». Le dialogue ne se ferme pas
  pendant un envoi. Il se ferme avec l'issue ; la page, qui n'utilise aucun `effect()`, relit alors sa ressource et affiche
  « Activité retirée » ou « La journée a changé, recommencez ». Le message disparaît au changement de jour (`linkedSignal`
  sur l'adresse).
- **Panneau de changement de poste.** Un `<aside>` non modal dans la grille de la page, à côté de la frise et de la liste,
  qui restent visibles et actives (il passe sous le contenu en largeur étroite). Il rappelle l'activité (élément,
  désignation, horaires ou « Du lundi 5, 22:00, au mardi 6, 03:30 »), propose un seul champ « Poste » (les postes
  habilités avec leur nature, le poste actuel affiché mais désactivé, « Était : … »), dit « Le temps ne change pas » et
  n'a pas de « Enregistrer » quand aucun autre poste n'est habilité. Un refus s'affiche sous les boutons, la saisie
  est conservée, le message du serveur n'est jamais montré. L'état du panneau est éphémère (jamais dans l'adresse) : la
  page ne retient que l'identifiant de l'activité, le retrouve dans la journée lue (`activiteCorrigeable`) et le panneau
  disparaît avec elle ; un changement de jour, un retrait de cette activité ou une activité devenue incorrigeable
  le ferment. Un seul panneau à la fois (voir l'ajout). L'instance du panneau est liée à l'activité (`@for` suivi
  par identifiant) : ouvrir le panneau d'une autre activité en crée un neuf, sans refus, choix ni focus hérités. Tant
  qu'un envoi est en vol (`CorrectionDUneActivite.etat` à `EN_COURS`), les boutons de correction de la liste sont
  désactivés (`envoiEnCours`) : on ne peut ni ouvrir un autre panneau ni demander un retrait, et le résultat d'un envoi
  retombe toujours sur le panneau qui l'a fait. Le focus va au champ à l'ouverture et revient au bouton d'origine à la
  fermeture, avant la fin de la relecture (le bouton garde son nœud pendant la relecture). L'activité choisie est marquée
  (`aria-current`) dans la liste et sur sa seule barre de la frise. Quand le panneau disparaît sans résultat (Abandonner,
  changement de jour, retrait de l'activité, autre panneau), il appelle `abandonnerLeChangementDePoste()` : la saisie est
  oubliée, car une réponse perdue ou un refus ne doit pas faire rejouer un ancien identifiant après une correction faite
  ailleurs. La saisie d'un retrait, elle, survit à la fermeture du panneau.
- **Ajout.** Le bouton « Ajouter une activité » de la liste demande à la page (`ajoutDemande`) d'ouvrir `PanneauDAjout`, un
  `<aside>` non modal dans le même emplacement de la grille que celui du changement de poste. La page ne retient que
  l'`AjoutEnPreparation` (jamais dans l'adresse), un modèle de formulaire du domaine ([ADR 0036](../../../../../../documentation/adr/0036-rich-domain-models-for-form-interactions.md)) :
  le panneau lui envoie ses saisies (`avecSuivi`, `avecPoste`, `avecCategorie`, `avecDebut`, `avecFin`, qui l'actualisent
  avec l'heure lue par `Horloge`) et la page le passe à la frise. Le modèle garde des identifiants et se relit contre la
  journée courante (`suivi(journee)`, `poste(journee)`, `plage(journee)`) : une relecture, après un retrait par exemple,
  ne perd ni la saisie ni l'élément choisi. Il propose le premier poste habilité par défaut et ne choisit aucun élément.
  - **Champs.** « Élément » (`SearchPicker`, une entrée par suivi présent, les suivis clôturés depuis compris, triées par
    libellé « OF 24-131 · Pièce 1 ») ; « Poste » (postes habilités avec leur nature, « Tour CN 1 · Tournage ») ; « Type »
    (Travail ou Non-conformité) ; « De » et « À » en `HH:MM` avec la durée calculée à côté ; l'encart « Effet sur les journées »
    (« Opérationnel du lundi 5 : 4 h 45 → 7 h 15 », ou l'invite à saisir une plage). Les heures se valident à la sortie du champ
    (`change`), pas à chaque touche. Le focus va à l'élément à l'ouverture et revient au bouton de la liste à la fermeture,
    abandon ou succès. Sans poste habilité, le panneau le dit et n'a pas de bouton « Ajouter l'activité ».
  - **`PlageDAjout`** (pure, immuable) reçoit les bornes du jour, le jour affiché, « maintenant » (lu par la page, jamais par le domaine), un
    `CalendrierLocal` et, l'élément choisi, son suivi présent. Elle lit `HH:MM` sur le jour affiché, mais ne construit aucun
    instant : le domaine ne connaît aucun fuseau. `CalendrierLocal.instantA(jour, heures, minutes)` est un port du domaine,
    réalisé par `calendrierDuNavigateur` (`infrastructure/primary`), qui place l'heure sur l'horloge locale du navigateur
    (ADR 0051) ; la fin tapée est lue sur le jour affiché ou, si le gestionnaire l'a choisi, sur le lendemain
    (`JourACorriger.lendemain`). Hors du fuseau de l'atelier, une heure
    locale peut sortir des bornes reçues : elle est alors refusée comme hors du jour. Une seule erreur
    à la fois, dans cet ordre : heure mal écrite (« Heure attendue au format 00:00. »), heures manquantes à l'envoi
    (« Saisissez le début et la fin. »), début ou fin hors du jour affiché, début avant l'engagement (« Le début précède
    l'engagement de l'élément, le lundi 5 à 14:00. »), fin qui ne suit pas le début (une fin égale est refusée ; une fin qui précède
    le début sur le même jour dit « La fin, 03:30, précède le début, 22:00, sur la même journée. »), fin après
    « maintenant » (« La fin ne peut pas suivre l'heure actuelle. »), fin après la clôture (« La fin suit la clôture de
    l'élément, le lundi 5 à 11:00. »). L'engagement et la clôture sont inclus (une borne égale est acceptée). Une fin sur le jour affiché hors du jour
    (navigateur hors du fuseau) est refusée comme un début hors du jour ; une fin du lendemain doit tomber entre la fin du jour et
    la fin du lendemain reçues (« La fin doit tomber le mardi 6. »). Elle calcule
    la durée comme un écart entre deux instants (`Duree.entre`) : la nuit d'un changement d'heure compte sa durée réelle.
    Elle ne rend un `IntervalleDAjout` que si la fin suit le début (constructeur privé, `entre`) ; `ContenuDAjout.de` bâtit la
    commande à partir d'objets du domaine (opérateur, suivi présent, poste, intervalle) et nulle part ailleurs.
    L'erreur s'affiche sous les heures ; elle ne bloque que l'envoi : la plage cohérente reste dessinée et prévue.
  - **Jour de la fin.** Le jour affiché, par défaut, ou le lendemain (`avecFinLeLendemain`, `avecFinLeJourAffiche`), proposé par
    deux segments « Lundi 5 » / « Mardi 6 » seulement une fois le lendemain commencé (`lendemainDisponible` : « maintenant » n'est pas
    avant la fin du jour). Tant que le lendemain n'a pas commencé, une fin du lendemain suit « maintenant » et est refusée comme telle.
  - **Proposition.** Quand la fin précède le début sur le même jour, `finProposee` rend la fin du lendemain, sans l'appliquer, et
    seulement si la plage qui en résulte est valide (fin passée, pas après la clôture, pas après la fin du lendemain). Le panneau
    en fait le bouton « Finir le mardi 6 à 03:30 » sous l'erreur ; le clic passe la fin au lendemain, lève l'erreur et n'envoie
    rien.
  - **Envoi.** « Ajouter l'activité » demande le contenu (`AjoutEnPreparation.contenu`) : sans élément (même si l'élément choisi a disparu de la journée relue),
    sans poste ou avec une erreur de plage, rien n'est envoyé, l'erreur se montre sous les heures ou « Choisissez un élément. » sous l'élément.
    Sinon `CorrectionDUneActivite.ajouter` envoie. Un refus s'affiche sous les boutons (CHEVAUCHEMENT : « Une autre activité de cet
    élément se chevauche déjà sur ce poste. » ; FIN_FUTURE : « La fin dépasse l'heure du serveur. Choisissez une heure plus
    tôt ou réessayez dans un instant. »), la saisie est conservée et se vide du refus dès qu'on la modifie. Un succès ferme le panneau,
    relit la journée et annonce « Activité ajoutée » ; pour un ajout à cheval, le panneau remet les portions de chaque jour
    (`AjoutCorrige`, qui n'a de portions que pour `ENREGISTREE`) et le message les nomme : « Activité ajoutée : 2 h 00 ce lundi, 3 h 30 le mardi 6 », avec le lien « Voir le
    mardi 6 » (`routerLink` vers le lendemain), qui disparaît avec le message au changement de jour ; `JOURNEE_CHANGEE` ferme le panneau, oublie la saisie, relit et annonce
    « La journée a changé, recommencez ». Un échec technique garde la saisie et dit que l'ajout n'a pas abouti.
  - **Un seul panneau à la fois.** Ouvrir le changement de poste ferme l'ajout et inversement, sans confirmation : le panneau
    qui disparaît appelle `abandonnerLAjout()` (ou `abandonnerLeChangementDePoste()`), et la saisie de l'ajout est perdue. Un
    changement de jour abandonne la saisie et le message (`linkedSignal` sur l'adresse). Un retrait enregistré laisse un ajout en cours
    ouvert ; une `JOURNEE_CHANGEE`, de n'importe quelle correction, est un changement de jour : elle ferme tout panneau ouvert
    (ajout compris), oublie toute saisie en cours, relit et annonce « La journée a changé, recommencez ». Demander à nouveau l'ajout alors que le panneau est ouvert garde la saisie.
- **Relecture.** Seul le premier chargement (ou la reprise d'une panne sans valeur) affiche « Chargement… » : pendant la
  relecture d'après une correction, la frise, la liste et l'identité restent à l'écran (`aria-busy`), de sorte qu'un
  panneau ouvert ne soit jamais détruit. La zone `role="status"` reste dans la page ; chaque annonce y est un nouvel
  élément (clé = numéro d'annonce), donc une annonce identique à la précédente est de nouveau lue. Après une issue, le
  focus va à ce message (`tabindex="-1"`), cible stable que la relecture ne détruit pas.
- **Adaptateur.** `HttpCorrections.retirer`, `changerDePoste` et `ajouter` traduisent les codes du back en `ENREGISTREE`,
  `JOURNEE_CHANGEE` ou, pour le changement de poste, `REFUS { CHEVAUCHEMENT }` et, pour l'ajout, `REFUS { CHEVAUCHEMENT }` ou
  `REFUS { FIN_FUTURE }` (`date-de-survenue-future`), ou signalent une fois la panne par
  `ErrorHandlerPort` et la rejettent ; la liste des codes et leur issue sont dans
  [`api.md`](../../../../../../documentation/api.md). Le retrait ne vérifie aucune habilitation ; l'ajout envoie ses instants avec le décalage local (`toOffsetIsoString`).
