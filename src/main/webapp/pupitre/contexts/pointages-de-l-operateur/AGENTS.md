# Pointages de l'opérateur

Ce contexte appartient exclusivement à `pupitre`. Il permet à l'opérateur désigné de consulter ses
pointages : le **temps passé sur les pièces**, jour par jour, semaine par semaine. Ce n'est pas un temps de
présence : l'écran ne parle jamais d'heures travaillées. Tout opérateur peut consulter les pointages d'un
autre en tapant son code ; ce n'est pas une donnée confidentielle.

Le contexte est lecteur. L'[ADR 0047](../../../../../../documentation/adr/0047-count-only-finished-activities.md)
possède les règles de comptabilisation ; le back interprète les faits, décide des échéances et des
complétudes, et ce contexte restitue les résultats reçus. Les corrections restent au back-office.

## Acquisition

Appliquer la [composition des lectures](../../../../../../documentation/architecture.md#acquire-a-view-through-one-read-port-by-default)
par le seul `PointagesDeLOperateurPort`. Son secondaire compose la synthèse des heures et la feuille de temps
du même opérateur, pour la même semaine ISO et **un seul instant d'évaluation** pris au début de la lecture.
Chaque écho est comparé à cet instant comme instant absolu.

La lecture n'a de sens qu'en ligne : rien n'est mis en cache, aucun chiffre partiel n'est présenté comme
complet. Toute panne, réponse invalide ou écho incohérent rejette la lecture et est signalée une seule fois.

## Vocabulaire et invariants

- **Semaine** : semaine ISO, sept jours du lundi au dimanche. Seuls les jours pointés sont proposés.
- **Période consultable** : de la semaine en cours à un an en arrière.
- **Total de durée** : complet avec une durée, zéro compris, ou incomplet sans valeur. Les totaux du jour et
  de la semaine viennent du serveur ; le front ne les refait jamais par addition.
- **Ligne de pointage** : portion d'activité du jour, avec l'OF, le poste, la catégorie (travail ou NC),
  son début et son état. Seule une portion terminée porte une fin et une durée, celle de la portion.
- **États** : `EN_COURS` n'a ni fin ni durée et n'entre dans aucun total ; `TERMINEE_AUTOMATIQUEMENT` est
  comptée et signalée ; `A_RESOUDRE` n'a pas de fin et rend incomplets les totaux qui en dépendent. Le front
  ne fabrique aucune fin à minuit, à l'évaluation ou à treize heures.
- Les valeurs du domaine sont immuables et le domaine ne lit aucune horloge : aujourd'hui est fourni par le
  primaire.

Ce contexte n'importe aucun contexte de `gestion` : les valeurs reprises du relevé des heures sont recopiées.

## Restitution

Les mots « séquence », « conflit », « anomalie » et « heures travaillées » n'apparaissent jamais à l'écran.
Une fin automatique s'écrit « fin automatique », une activité à résoudre « à vérifier », et un total
incomplet « — ». Tous les mots affichés appartiennent à `LibellesMesPointages`.
