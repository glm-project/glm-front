# Paramétrage

Ce contexte appartient exclusivement à `gestion`. Il porte les réglages que l'entreprise fixe elle-même, un seul jeu pour toute l'entreprise, et la page « Paramètres » où le gestionnaire les modifie.

## Langage

**Paramétrage** : les réglages de l'entreprise, lus en un appel (`GET /api/parametrage`).

**Durée max d'une activité** : le temps au bout duquel une activité que personne n'a terminée s'arrête seule et devient une anomalie de pointage. Elle se saisit en heures entières, de 1 à 24, et vaut 13 h tant que l'entreprise ne l'a pas fixée. Une nouvelle durée ne vaut que pour les activités commencées après son enregistrement : le serveur fige la durée au début de chaque activité.

## Modèle de domaine

- **DureeMaxDActivite** : Value Object d'un nombre entier d'heures, de 1 à 24. Il dit à quelle heure s'arrête une activité commencée à une heure donnée, pour l'exemple affiché sous le champ.
- **Parametrage** : les réglages lus, aujourd'hui la durée max d'une activité.
- **FormulaireDureeMaxDActivite** : modèle riche de la saisie (ADR 0036), qui garde le texte brut, dit l'erreur et produit la durée.
- **ParametragePort** : lit le paramétrage et fixe la durée max d'une activité.

## Responsabilités et invariants

- La page est réservée au gestionnaire : route protégée par `reservedToGestionnaire`, entrée de menu `reserveeAuGestionnaire` (ADR 0052).
- Une saisie hors de 1 à 24, vide ou non entière n'est jamais envoyée : le formulaire la refuse avec son message. Le serveur n'a donc aucun refus métier à traduire ; un refus 400 reste une panne technique.
- Le serveur accepte une durée à la minute. Ce front n'écrit que des heures entières ; une durée lue qui n'en est pas une est une panne technique de lecture, signalée une fois, jamais arrondie en silence.
- Chaque lecture repart du serveur (ADR 0048).

## Relations de contexte

- `glm-back`, contexte `parametrage` : `GET /api/parametrage`, `PUT /api/parametrage/duree-max-d-activite`.
- Ce contexte ne dépend d'aucun autre contexte de `gestion`, ni de `pupitre`.
