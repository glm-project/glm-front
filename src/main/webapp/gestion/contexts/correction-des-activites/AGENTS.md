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
  domaine ne connaît aucun fuseau et ne calcule aucun minuit : les bornes du jour (début et fin) viennent du back. La fin du
  lendemain, rendue aussi, n'est lue qu'avec l'ajout qui finit le lendemain.
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

Le domaine ne porte que ce que la page lit ou ce que consomment les corrections livrées : la recherche d'une activité
par son identifiant et la fin du lendemain arrivent avec les corrections qui les consomment (ADR 0037).

- `JourneeACorriger.estCorrigeable(activite)` décide « corrigeable » : activité terminée (`TERMINEE`, qui dit aussi la fin
  régularisée, ou `TERMINEE_AUTOMATIQUEMENT`) dont le suivi n'est pas clôturé (`clotureDe`). C'est un prédicat de type :
  il rend une `ActiviteTerminee`, dont l'état porte la fin et la portion du jour, ce qui évite de tester `EN_COURS` à chaque
  usage. `ActiviteDeLaJournee.estACheval()` dit qu'une portion est comptée un autre jour.

## Restitution de la page

La route `operateurs/:operateur/journees/:jour` est gardée par `reservedToGestionnaire`. `CorrigerLaJourneePage` lit
l'adresse et le jour courant (`localCalendarDay`, lu par la page). Un `:jour` mal formé, hors calendrier ou après aujourd'hui
(`JourACorriger.demande`) ramène au relevé de l'opérateur, `/operateurs/:operateur/heures`, sans rien lire ; un opérateur
inconnu affiche « Opérateur introuvable » sans signalement technique ; une panne de lecture affiche un message et
« Réessayer ». Le retour mène à `/operateurs/:operateur/heures?jour=…`. Les flèches « Voir le … » sont des `routerLink` vers
le jour précédent et le suivant (`JourACorriger.precedent`, `suivant`) ; il n'y a pas de jour suivant après aujourd'hui ni de
borne vers le passé. Le jour affiché n'est lu que dans l'adresse.

- **Frise** (`FriseDuJour`) : lecture seule, une ligne par élément et poste, sur l'`AxeDuJour` partagé (de 6 h à 22 h, le jour
  entier dès qu'une borne en sort). Un repère marque le début et la fin réels, jamais une coupure de minuit : une activité à cheval
  est coupée aux bornes reçues (`debutAvantLeJour`, `finApresLeJour`) et nomme l'autre jour (« ← début le lundi 5 à 22:00 »,
  « suite le mardi 6 → »). Une activité en cours est un repère ponctuel, sans barre ; une fin automatique n'a pas de repère de
  fin et termine sa barre par l'embout hachuré `warn`, nommé dans la légende. L'en-tête dit « Opérationnel » et la durée du jour.
- **Liste** (`ActivitesDuJour`) : par début. La durée est la portion du jour ; une activité à cheval ajoute « sur 5 h 30 »
  (`dureeTotale`) et des liens « début le … » ou « fin le … » vers l'autre jour, pris dans les portions reçues (`jourDuDebut`,
  `jourDeLaFin`). « en cours » sans durée, « fin automatique », « Clôturé le lundi 5 à 11:00 » pour un suivi clôturé. Une
  activité en cours depuis la veille nomme son jour de début (« depuis lundi 5 à 22:00 », comme la frise) ; le back ne lui
  envoie aucune portion, donc aucun lien « début le … ». Chaque activité corrigeable porte le bouton-icône « Retirer l'activité OF 24-131, 18:30 → 21:45 » (nom construit
  du numéro de l'élément et des horaires, par `LibellesCorrectionDesActivites`). Les boutons « Changer le poste » et
  « Ajouter une activité » viennent avec les lots qui les câblent : aucun bouton inerte.
- Tous les mots affichés sont dans `LibellesCorrectionDesActivites.ts` ; les jours et les heures passent par `DateFormats`.

## Corrections

Une correction est une commande sur un seul suivi, envoyée par `CorrectionsPort` et résolue en `ResultatDeCorrection` :
`ENREGISTREE`, `JOURNEE_CHANGEE`, ou `REFUS { motif }` quand la correction a des motifs qu'un gestionnaire peut corriger.
Le type du résultat prend le type des motifs : le retrait n'en a aucun, donc aucun `REFUS` n'existe pour lui.

- **Saisie.** `SaisieDeRetrait.pour(precedente, activite, nouvelIdentifiant)` lie l'identifiant au contenu : la même activité
  garde l'identifiant de la saisie précédente (un renvoi après une réponse perdue est la même commande), une autre reçoit
  un identifiant neuf.
- **Coordinateur.** `CorrectionDUneActivite` (fourni par la page, donc partagé avec le dialogue ouvert depuis elle) envoie,
  n'envoie rien tant qu'un envoi est en vol (double clic), et passe à `A_RELIRE { issue }` après `ENREGISTREE` ou
  `JOURNEE_CHANGEE` en oubliant la saisie : le même contenu renvoyé plus tard reçoit un nouvel identifiant, car ces
  corrections se défont. Après un échec technique (`ECHEC`) la saisie reste, et le renvoi garde son identifiant. Il ne
  relit pas : la page détient la lecture. L'état « refusée » arrive avec la première correction qui a des motifs.
- **Effet sur les journées.** `EffetSurLesJournees.duRetrait(journee, activite)` rend le jour affiché, durée
  opérationnelle avant → après (moins la portion du jour), et chaque autre jour touché avec la portion retirée, reçue du
  serveur. Il ne découpe jamais une activité existante.
- **Retrait.** Le bouton de la liste demande à la page (`retraitDemande`) d'ouvrir `RetraitDeLActivite`, un `MatDialog`
  avec `ConfirmationContent` : titre « Retirer l'activité de 18:30 à 21:45 ? » (« du lundi 5, 20:30, au mardi 6, 04:00 ? »
  à cheval), l'activité et sa durée totale, une ligne d'effet par jour, « Le retrait vaut pour toute l'activité : le mardi 6
  perd aussi 3 h 30. » quand elle déborde, « Garder l'activité » et « Retirer l'activité ». Le dialogue ne se ferme pas
  pendant un envoi. Il se ferme avec l'issue ; la page, qui n'utilise aucun `effect()`, relit alors sa ressource et affiche
  « Activité retirée » ou « La journée a changé, recommencez ». Le message disparaît au changement de jour (`linkedSignal`
  sur l'adresse).
- **Relecture.** Seul le premier chargement (ou la reprise d'une panne sans valeur) affiche « Chargement… » : pendant la
  relecture d'après une correction, la frise, la liste et l'identité restent à l'écran (`aria-busy`), de sorte qu'un
  panneau ouvert ne soit jamais détruit. La zone `role="status"` reste dans la page ; chaque annonce y est un nouvel
  élément (clé = numéro d'annonce), donc une annonce identique à la précédente est de nouveau lue. Après une issue, le
  focus va à ce message (`tabindex="-1"`), cible stable que la relecture ne détruit pas.
- **Adaptateur.** `HttpCorrections.retirer` traduit les codes du back en `ENREGISTREE` ou `JOURNEE_CHANGEE`, ou signale
  une fois la panne par `ErrorHandlerPort` et la rejette ; la liste des codes et leur issue sont dans
  [`api.md`](../../../../../../documentation/api.md). Le retrait ne vérifie aucune habilitation.
