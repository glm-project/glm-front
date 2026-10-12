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

Le domaine ne porte que ce que la page lit : `corrigeable`, la recherche d'une activité par son identifiant et la fin du
lendemain arrivent avec les corrections qui les consomment (ADR 0037).

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
  envoie aucune portion, donc aucun lien « début le … ». Les boutons de correction et « Ajouter une activité » viennent avec
  les lots qui les câblent : aucun bouton inerte.
- Tous les mots affichés sont dans `LibellesCorrectionDesActivites.ts` ; les jours et les heures passent par `DateFormats`.
