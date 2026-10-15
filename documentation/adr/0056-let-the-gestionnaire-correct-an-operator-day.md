# 0056 — Laisser le gestionnaire corriger la journée d'un opérateur

## Status

`Proposed` le 13 octobre 2026, écrit avec l'ADR du backend qui amende sa 0011 ; `Accepted` quand le backend expose le
contrat de la correction des activités.

- `Amends 0054`: une fin régularisée n'est plus définitive. Le gestionnaire peut retirer une activité terminée ou
  changer son poste, fin régularisée comprise, et ajouter une activité oubliée. Rien n'efface ni ne modifie un fait du
  journal : chaque correction en ajoute un. La règle de réception juge ensuite les pointages sur le journal après
  corrections ; un `RETRAIT` ou un `CHANGEMENT_DE_POSTE` ne borne jamais `ANTERIEUR`. La régularisation d'une fin
  automatique, dans son dossier d'anomalie, reste en place : les deux chemins coexistent.
- `Complements 0052`: une directive structurelle `*reservedToGestionnaire` de l'authentification de Gestion réserve
  un élément d'un écran au gestionnaire. Un contexte ne lit toujours pas les rôles : l'authentification reste le seul
  endroit qui les lit.
- `Amended by 0058`: la route `operateurs/:operateur/journees/:jour` n'est plus gardée et la directive disparaît. Le
  bouton « Corriger la journée » du relevé s'affiche pour tout jour échu, puisque Gestion ne s'ouvre qu'au
  gestionnaire. Le reste de 0056 tient.

Un lecteur qui arrive ici depuis un autre ADR garde la règle en vigueur : **le gestionnaire corrige des activités, pas
des pointages, depuis une page dédiée ; chaque correction ajoute un fait au journal, qui reste la seule trace, et la
page ne montre ensuite que la journée relue du serveur.**

## Context

Depuis l'ADR 0054, le gestionnaire ne décide qu'une chose : placer la fin d'une activité que la fin automatique a
arrêtée. Le reste du journal est hors de sa portée. Or un opérateur oublie de pointer une activité, en pointe une par
erreur, ou pointe sur le mauvais poste, et le relevé des heures, la supervision et le coût de revient comptent alors
une journée fausse. L'ADR 0054 le prévoyait : corriger autre chose qu'une fin automatique demande « un écran et une
décision de plus ».

Plusieurs faits contraignent la réponse :

- **Le journal n'est jamais réécrit.** Le backend n'annule, ne corrige ni ne supprime aucun événement, et chaque fait
  porte son auteur, son origine (`POINTAGE` ou `REGULARISATION`) et son horodatage. Une correction d'_événements_
  a déjà existé : le backend l'a retirée (`b16c0b0`) avec son protocole d'aperçu et de révision.
- **Le pupitre pointe des activités.** Trois pointages (`DEBUT`, `NON_CONFORMITE`, `FIN`) ouvrent et ferment une
  activité sur une clé (opérateur, suivi, poste). Corriger pointage par pointage recréerait les séquences
  incohérentes que l'ADR 0054 a supprimées.
- **Le relevé des heures est un lecteur.** Il ne lit pas les rôles, et la régularisation des fins automatiques
  appartient aux anomalies de pointage.
- **La feuille de temps rend l'élément, jamais le suivi.** Un élément se réengage après sa clôture : deux suivis du
  même élément peuvent exister le même jour.
- **Les jours se découpent dans le fuseau du backend** (`Europe/Paris`), et le front affiche les heures en heure
  locale (ADR 0051).

## Considered options

**Ce qu'on corrige.**

- Corriger des pointages — rejeté : un début irait sans sa fin, et la page recréerait les séquences incohérentes que
  la règle de réception écarte.
- **Corriger des activités : ajouter, changer le poste, retirer — kept.** Une demande de l'opérateur devient une seule
  correction sur un seul suivi, et le début va avec sa fin.

**Où on corrige.**

- Éditer dans le relevé des heures — rejeté : le relevé deviendrait écrivain et lirait les rôles, et sa frise de la
  semaine porterait des gestes d'édition.
- Corriger dans un dialogue ouvert depuis le relevé — rejeté : un ajout qui finit le lendemain, la navigation entre
  les jours et l'effet sur chaque journée ne tiennent pas dans un dialogue.
- **Une page dédiée, « Corriger la journée », dans un contexte `correction-des-activites` — kept.** Le relevé y mène
  par un lien réservé au gestionnaire.

**Le motif.**

- Un motif obligatoire — rejeté : personne ne le lit, et le journal dit déjà qui a corrigé, quand et quoi.
- **Pas de motif — kept.**

**La trace.**

- Un historique ou un journal barré à l'écran — rejeté pour la V1 : un écran de plus pour une question que personne
  n'a encore posée.
- **La trace au seul journal du backend — kept.** Une mention « corrigée par … le … » pourra s'ajouter au relevé, ou
  l'origine et l'auteur à l'export du coût de revient, sans changer le backend.

## Decision

**Trois corrections, chacune un fait de plus.** Ajouter une activité oubliée écrit un `DEBUT` (ou une
`NON_CONFORMITE`) et une `FIN`, d'origine `REGULARISATION`. Changer le poste écrit un `CHANGEMENT_DE_POSTE`, retirer
écrit un `RETRAIT` ; tous deux visent l'activité par `activiteVisee` et sont datés du moment de la correction.
Contrairement à la correction retirée par `b16c0b0`, aucun événement n'est modifié. Les trois corrections s'adressent
au suivi : `POST /api/atelier/suivis/{id}/activites`, `…/activites/{activite}/poste` et `…/activites/{activite}/retrait`.

**Le périmètre V1.** Ni l'heure ni la date d'une activité ne se modifient : on retire l'activité puis on l'ajoute.
L'élément ne change pas. Un ajout finit au plus tard le lendemain du jour affiché, et rien ne finit après
« maintenant ».

**Ce qui est corrigeable.** Une activité terminée, normalement, par fin automatique ou par une fin régularisée, et
dont le suivi n'est pas clôturé. Une fin régularisée l'est donc : un nouveau fait s'ajoute sans effacer la
régularisation, et l'ADR du backend amende sa 0011 (« A regularised end is final »). Une activité d'un suivi clôturé
ne l'est pas : le fait serait daté après la clôture, que le backend refuse ; il faut d'abord rouvrir l'élément ou
déplacer sa clôture. Une activité en cours ne l'est pas : le pupitre la tient ouverte.

**L'habilitation, correction par correction.** Elle se vérifie sur ce qui place l'opérateur sur un poste : le poste
d'un ajout, le nouveau poste d'un changement. Jamais au retrait : on doit pouvoir retirer une activité pointée sur un
poste dont l'opérateur a perdu l'habilitation depuis.

**Une lecture dédiée.** `GET /api/atelier/operateurs/{operateurId}/journees/{jour}` rend l'opérateur, les bornes du
jour et la fin du lendemain calculées dans le fuseau du backend, la durée opérationnelle, les activités avec leur
suivi, leur portion du jour et leurs autres jours, et les choix d'ajout : les suivis présents ce jour, avec
`engageLe` et `clotureLe`, et les postes habilités. `engageLe` distingue un élément réengagé le même jour et permet
de vérifier la plage saisie avant l'envoi. La feuille de temps ne suffit pas : retrouver le suivi depuis l'élément
serait une devinette.

**L'effet annoncé avant l'envoi.** Le domaine du contexte prévoit l'effet sur chaque jour touché : un retrait enlève
les portions reçues du serveur, un ajout ajoute à chaque jour la portion coupée aux minuits rendus par le backend. Le
front ne calcule aucun minuit et ne découpe pas une activité existante. La durée opérationnelle étant une somme
simple, la prévision est exacte ; le chiffre affiché ensuite vient de la relecture.

**Trois issues après l'envoi.**

1. _Enregistrée_ : la page relit la journée et affiche un message d'état.
2. _Refusée avec un motif que le gestionnaire peut corriger_ (`chevauchement`, `date-de-survenue-future`) : le
   libellé s'affiche sous le bouton de la correction et la saisie est conservée.
3. _Journée changée_ (`saisie-concurrente`, et les codes qui ne surviennent que si la journée a changé depuis la
   lecture) : la page la traite comme un changement de jour, ferme le panneau, oublie la saisie, relit la journée et
   dit « La journée a changé, recommencez ».

Tout autre code reste une défaillance technique : la page l'empêche toujours, donc seul un bug le déclenche.

**L'identifiant de saisie.** Il est lié au contenu, comme pour la régularisation : un renvoi après une réponse perdue
est la même commande. Après une correction enregistrée ou une journée changée, la saisie est oubliée, car ces
corrections se défont et un même contenu peut revenir : ajouter, retirer puis ajouter la même activité reçoit un
nouvel identifiant à chaque fois.

**La règle de réception jugée sur le journal après corrections.** Les corrections ne passent pas par elle. Elle juge
ensuite les pointages sur le journal tel qu'il est après corrections : seuls les gestes (`DEBUT`, `NON_CONFORMITE`,
`FIN`) bornent `ANTERIEUR` ; les faits d'une activité retirée ne comptent plus ; après un changement de poste, ceux
de l'activité comptent sur la nouvelle clé ; la `FIN` d'un ajout compte comme une fin régularisée.

**L'accès.** La route `operateurs/:operateur/journees/:jour` est gardée par `reservedToGestionnaire`. Le bouton du
relevé est posé sous la directive `*reservedToGestionnaire`, et seulement pour un jour échu ou aujourd'hui.

## Consequences

### Positive

- Le gestionnaire corrige un oubli, une erreur de poste ou une activité pointée par erreur sans intervention en
  base, et voit avant l'envoi l'effet sur chaque journée touchée.
- Le journal reste la source de vérité et la seule trace : qui, quand et quoi y sont déjà, sans table ni écran.
- Le relevé des heures reste un lecteur, et l'authentification de Gestion reste le seul endroit qui lit les rôles.
- Une correction ne connaît que trois issues, et la page n'a qu'un message par issue à montrer.

### Negative

- **Une erreur d'heure se corrige en deux temps** : retirer l'activité, puis l'ajouter. Entre les deux, la journée
  est fausse, et un pointage du pupitre peut s'intercaler.
- **Une activité d'un suivi clôturé ne se corrige pas** sans rouvrir l'élément ou déplacer sa clôture, ce qui
  recalcule son coût de revient.
- **Personne ne voit à l'écran qu'une journée a été corrigée.** La trace se lit en base jusqu'à ce qu'une mention
  s'ajoute au relevé ou à l'export.
- **Un pointage resté hors ligne pendant la correction peut être ignoré** : la `FIN` d'un ajout borne `ANTERIEUR`
  sur sa clé, et le pointage part en audit, sans écran. La régularisation acceptait déjà cette perte.
- **L'habilitation se juge sur les habilitations actuelles** : la table du backend n'est pas datée, et ajouter une
  activité passée sur un poste dont l'opérateur a perdu l'habilitation depuis est refusé.
- **La régularisation d'une fin automatique a désormais deux chemins**, son dossier d'anomalie et cette page, qui ne
  se renvoient pas l'un à l'autre.
- Hors du fuseau de l'atelier, les heures locales et les jours du backend diffèrent, comme dans le relevé.
- Modifier la date ou les heures d'une activité, changer son élément, ou ajouter une activité qui finit au-delà du
  lendemain rouvrira cette décision.
