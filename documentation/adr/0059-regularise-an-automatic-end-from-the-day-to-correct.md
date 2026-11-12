# 0059 — Régulariser une fin automatique depuis la journée à corriger

## Status

`Accepted` le 12 novembre 2026.

- `Amends 0056`: la régularisation d'une fin automatique a toujours deux chemins, le dossier d'anomalie et la page
  « Corriger la journée », mais ce n'est plus un renvoi de l'un à l'autre. La page la porte elle-même, comme une
  quatrième correction : un panneau latéral avec la frise à poignée du dossier. Le reste de 0056 tient.

## Context

Sur « Corriger la journée », une activité arrêtée par la fin automatique ne se corrigeait qu'en la retirant ou en
changeant son poste. Pour placer sa fin réelle, le gestionnaire quittait la page, retrouvait l'anomalie dans la liste
`/anomalies`, la régularisait et revenait à la journée. 0056 l'avait accepté. À l'usage, c'est le geste le plus
fréquent de la page.

Le backend a déjà tout : `POST /api/atelier/suivis/{id}/regularisations` désigne l'activité par son pointage ouvrant,
qui identifie aussi une activité de la journée, et le dossier `GET /api/atelier/suivis/{id}/anomalies/{pointage}` rend
la borne de fin (démarrage suivant ou clôture) que la lecture de la journée ne porte pas. Les contextes du front restent
isolés : la correction des activités n'importe rien des anomalies de pointage.

## Considered options

- Un panneau latéral qui lit le dossier et reprend la frise à poignée, dupliquée dans le contexte — **kept**.
- Un lien vers le dossier d'anomalie avec retour à la journée — rejected : le dossier porte des boutons hors sujet
  (« Anomalie suivante ») et le retour arrière se gère mal.
- Une fin tapée en `HH:MM`, comme l'ajout — rejected : un autre geste que le dossier d'anomalie pour la même décision.
- Partager la frise entre les deux contextes — rejected : un contexte n'importe pas l'autre, et un noyau partagé pour
  un seul composant coûterait plus que la copie.
- « Modifier la fin » de toute activité terminée — rejected pour l'instant : il faudrait une nouvelle commande du backend.

## Decision

Une activité corrigeable en fin automatique porte le bouton « Régulariser la fin ». Il ouvre un panneau latéral, un
seul à la fois avec l'ajout et le changement de poste, qui lit le dossier de la fin automatique par `DossierDeLaFinPort`
et dessine la frise à poignée copiée du contexte des anomalies (`frise-de-la-fin`), sans l'état « fin régularisée ».
« Valider la fin » envoie la régularisation par `CorrectionsPort`, sous la règle d'identifiant des autres corrections.
Le succès ferme le panneau, relit la journée et annonce « Fin régularisée ». Un dossier introuvable veut dire que la fin
n'est plus automatique : la journée a changé.

## Consequences

### Positive

- Le gestionnaire régularise sur place, en voyant la journée, sans changer de page.
- Aucun changement du backend ni du contrat.

### Negative

- La frise à poignée existe en deux copies (environ 900 lignes et leurs tests). Une correction de l'une doit être
  reportée à la main sur l'autre.
- Le panneau lit le dossier en plus de la journée : une requête de plus à chaque ouverture.
- Une erreur d'heure d'une activité terminée normalement se corrige toujours en deux temps (retirer puis ajouter).
