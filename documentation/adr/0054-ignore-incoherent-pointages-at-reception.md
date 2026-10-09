# 0054 — Ignorer à la réception les pointages incohérents

## Status

`Accepted` le 9 octobre 2026, avec le ticket [#254](https://github.com/glm-project/glm-front/issues/254) et la règle de
réception du backend.

- `Amends 0047`: les séquences en conflit, l'activité visée, la distinction ouverture / transition / fin, les durées et
  coûts « à résoudre », les totaux incomplets, la correction et l'annulation par le gestionnaire, et la durée de 13 h
  écrite en dur ne tiennent plus. Il reste de 0047 la comptabilisation des seules activités terminées, la fin
  automatique dérivée, la régularisation par le gestionnaire et l'instant d'évaluation commun.
- `Amends 0006`: `AtelierExchangePort.send` rend `Result<void, RefusDePublication>`, un corps de pointage ne porte plus
  ni `intention` ni `cible`, et une réponse 200 ou 201 n'a plus de conflits.
- `Amends 0049`: le journal garde sans l'afficher le refus `pointage-ignore`.
- `Amends 0007`, `0009`, `0045`: le geste ne porte plus qu'un type et un poste, le stockage du journal passe à
  `atelier-activites-v2:<entreprise>`, `FenetreOperateur` prépare des pointages demandés.
- `Amends 0031`, `0041`: la supervision ne rend plus de séquence en conflit.
- `Amends 0050`, `0053`: la clé du journal est `v2` ; la traduction à la lecture d'un journal d'avant les catégories
  disparaît avec les journaux d'avant `v2`.

Un lecteur qui arrive ici depuis un autre ADR garde la règle en vigueur : **le serveur juge chaque pointage du pupitre à
son arrivée, sur l'état de sa clé, et ignore ce qui ne s'accorde pas ; la seule décision qui reste au gestionnaire
est de placer la fin d'une activité que la fin automatique a arrêtée.**

## Context

Jusqu'ici le serveur conservait les pointages contradictoires, en faisait des séquences en conflit et attendait une
décision du gestionnaire. Cette décision a coûté au front cinq contextes qui connaissaient le conflit : le pupitre
(« à vérifier », activité en conflit non actionnable), la supervision, le coût de revient (pointages contradictoires,
totaux incomplets), le relevé des heures et surtout les anomalies de pointage, avec une vue complète, des actions
directes, un aperçu signé, une confirmation, un reçu et deux familles de corrections tardives. Le gestionnaire devait
comprendre une séquence, choisir un acte et en vérifier les conséquences avant de l'enregistrer.

Les pointages incohérents sont rares, et rien ne permet de dire lequel des deux est juste. Le coût de ce modèle était sans
rapport avec ce qu'il protégeait.

## Considered options

- Garder les conflits et simplifier seulement l'écran du gestionnaire — rejeté : la supervision, le coût, le relevé et le
  pupitre continueraient à porter le conflit, ses totaux incomplets et ses états « à résoudre ».
- Garder les conflits et les résoudre automatiquement selon l'ordre de réception — rejeté, comme en 0047 : l'ordre de
  réception d'un pupitre hors ligne ne dit rien de l'ordre des faits.
- **Ignorer à la réception ce qui ne s'accorde pas avec l'état de la clé, auditer ce qui est ignoré, et ne laisser au
  gestionnaire que la fin automatique — kept.**
- Montrer à l'opérateur chaque pointage ignoré — rejeté : il ne peut rien en faire, et le pupitre se recale seul sur le
  référentiel. Seul le refus de clôture reste affiché.

## Decision

**Trois pointages, une clé.** Le pupitre envoie `DEBUT`, `NON_CONFORMITE` et `FIN`, avec l'opérateur, le poste, un
identifiant et l'heure du geste : ni intention, ni cible, ni transition. La clé est l'opérateur, le suivi (l'OF) et le
poste ; elle porte au plus une activité en cours. Une `FIN` ferme l'activité de sa clé.

**Règle de réception.** Elle appartient au backend ; le front en dépend ainsi :

1. un pointage dont l'heure de geste est strictement plus ancienne que le dernier accepté de la clé est ignoré
   (`ANTERIEUR`) ; une heure égale passe, sauf pour une `FIN` : une `FIN` qui n'est pas postérieure au début de
   l'activité qu'elle fermerait est aussi `ANTERIEUR`, car aucune activité n'a une durée nulle ;
2. l'échéance est jugée sur l'heure du geste : elle est atteinte quand cette heure est supérieure ou égale au début plus
   la durée maximale, donc une `FIN` pile à l'échéance est ignorée (`APRES_ECHEANCE`) ; une activité échue compte comme
   terminée ;
3. sur une clé sans activité en cours, `DEBUT` et `NON_CONFORMITE` sont acceptés et `FIN` est ignorée (`APRES_ECHEANCE` si
   la dernière activité est échue et sans fin, sinon `AUCUNE_ACTIVITE`) ; sur une clé occupée, `FIN` est acceptée et une
   ouverture est ignorée (`DEJA_EN_COURS`).
4. la clôture du suivi ne termine l'activité que pour un geste qui lui est postérieur : une `FIN` pointée avant la
   clôture et reçue après reste acceptée, à son heure.

Un `DEBUT` ou une `NON_CONFORMITE` sur un suivi clôturé reste refusé en 409 `suivi-d-atelier-cloture`. Un pointage ignoré
est écrit dans une table d'audit que personne ne lit à l'écran et répond 409 `pointage-ignore` ; le renvoi d'un
identifiant déjà accepté répond 200.

**Gestes composés du pupitre.** Un appui qui change la catégorie d'une activité envoie deux pointages à la même heure,
la `FIN` d'abord : NC pendant un travail envoie `FIN` puis `NON_CONFORMITE`, « FIN NC » `FIN` puis
`DEBUT`. PAUSE envoie une `FIN` par activité, REPRENDRE une ouverture par activité suspendue, TOUT ARRÊTER ne change pas.

**Le pupitre suit la même règle, sans la décider.** La projection locale applique `FIN` et ouverture comme le serveur, y
compris une clé libérée par une activité échue ; elle ne juge pas `ANTERIEUR` : une `FIN` qui n'est pas postérieure au
début retire localement l'activité, puis le pupitre se recale sur le référentiel. L'échéance d'une activité ouverte localement est l'heure du geste plus la
durée maximale que le référentiel porte (`dureeMaximaleDActivite`) : aucune durée n'est écrite dans le front. Un pointage
ignoré retire l'effet local du geste et le pupitre se recale sur le référentiel de la synchronisation suivante. Seul
`suivi-d-atelier-cloture` est affiché à l'opérateur ; tout autre refus reste au journal. Les pupitres sont réinitialisés
au déploiement : la clé de stockage passe de `atelier-activites-v1:` à `atelier-activites-v2:` et l'ancienne est écartée,
sans migration.

**Le gestionnaire ne traite qu'une anomalie.** La liste ne lit que les fins automatiques. Le dossier porte l'activité
échue, les pointages de sa clé, la désignation de l'élément et `borneDeFin`, le plus tôt du début suivant sur la clé et de
la clôture. Une seule vue, « Régulariser la fin », envoie `POST …/regularisations` avec `{id, activite, dateDeSurvenue}` ;
l'identifiant est lié au contenu de la saisie. La fin proposée est au plus `min(maintenant, borneDeFin)` et strictement
après le début ; elle peut dépasser l'échéance. Un 404 sur le dossier ramène à la liste.

**Les lecteurs ne voient plus de conflit.** La supervision, le coût de revient, le relevé des heures et « Mes pointages »
ne connaissent ni séquence en conflit, ni état « à résoudre », ni total incomplet, ni repli de 13 h : le serveur fournit
l'échéance, et les totaux sont toujours complets.

## Consequences

### Positive

- Un seul cas pour le gestionnaire, une seule vue, une seule liste.
- Aucun état intermédiaire « à résoudre » : tout total reçu est un chiffre.
- Le pupitre n'a plus à connaître une activité visée, une intention ni un conflit ; la règle locale tient en deux phrases
  (une `FIN` ferme la clé, une ouverture sur une clé occupée ne fait rien).

### Negative

- **Un pointage ignoré n'est vu de personne.** L'audit se consulte en base, sans écran. Une `FIN` ignorée pour
  `APRES_ECHEANCE` laisse l'activité arrêtée à son échéance, et seul le gestionnaire, depuis la liste des fins
  automatiques, la corrige. L'opérateur, lui, ne sait pas que son geste n'a pas compté.
- **Le jugement dépend de l'ordre d'arrivée sur une clé.** Premier arrivé, premier servi : un pupitre hors ligne dont le
  geste arrive après un geste plus récent de la même clé est ignoré (`ANTERIEUR`).
- Une `FIN` pile à l'échéance est désormais ignorée, alors qu'elle l'emportait sur la fin automatique.
- Le serveur lit la durée maximale à la réception du `DEBUT`, non à l'heure du geste, et ne garde aucun historique du
  réglage : un `DEBUT` pointé hors ligne avant une modification de la durée, et reçu après, prend la nouvelle.
- **La régularisation est définitive** : il n'y a ni correction ni annulation d'une fin régularisée.
- Le chantier reste à un opérateur par pupitre (V1) ; la clé le suppose.
- Les pupitres perdent à ce déploiement les gestes en attente de leurs journaux d'avant `v2`.
- Le backend est déployé dans la même fenêtre que la fusion du front, qui part en production à chaque push sur `main` :
  le schéma d'API généré est commun et un front d'avant ne lit plus les réponses du backend nouveau.
- Le jour où le gestionnaire doit pouvoir corriger autre chose qu'une fin automatique, ou voir l'audit, il faudra un écran
  et une décision de plus ; le chantier les a laissés hors périmètre.
