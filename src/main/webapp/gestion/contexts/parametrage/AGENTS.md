# Paramétrage

Ce contexte appartient exclusivement à `gestion`. Il porte les réglages que l'entreprise fixe elle-même, un seul jeu pour toute l'entreprise, et la page « Paramètres » où le gestionnaire les modifie.

## Langage

**Paramétrage** : les réglages de l'entreprise, lus en un appel (`GET /api/parametrage`).

**Logo de l'entreprise** : une image PNG ou JPEG qui tient dans 256 × 256 pixels, en longueur ou en carré, de 50 Ko au plus, affichée à la place du logo GLM en en-tête de la supervision, du pupitre et des PDF. Chaque en-tête l'ajuste à sa case sans la déformer. Sa **version** est l'empreinte de son contenu, donnée par le serveur ; l'image se lit à l'adresse de sa version, que le navigateur garde en cache.

**Durée max d'une activité** : le temps au bout duquel une activité que personne n'a terminée s'arrête seule et devient une anomalie de pointage. Elle se saisit en heures entières, de 1 à 24, et vaut 13 h tant que l'entreprise ne l'a pas fixée. Une nouvelle durée ne vaut que pour les activités commencées après son enregistrement : le serveur fige la durée au début de chaque activité.

## Modèle de domaine

- **DureeMaxDActivite** : Value Object d'un nombre entier d'heures, de 1 à 24. Il dit à quelle heure s'arrête une activité commencée à une heure donnée, pour l'exemple affiché sous le champ.
- **Parametrage** : les réglages lus, aujourd'hui la durée max d'une activité.
- **FormulaireDureeMaxDActivite** : modèle riche de la saisie (ADR 0036), qui garde le texte brut, dit l'erreur et produit la durée.
- **VersionDuLogo** : Value Object de la version donnée par le serveur (16 caractères hexadécimaux).
- **ImageDuLogo** : l'image du logo en ligne (`data:image/png|jpeg;base64,…`), seule forme que la page affiche.
- **lireEnTeteDImage** : lit le format et les dimensions dans l'en-tête d'un PNG ou d'un JPEG, sans décoder l'image : jsdom ne sait pas décoder, et le format se juge sur le contenu, comme au back.
- **FichierDeLogo** : le fichier choisi et ses refus, dans l'ordre poids, format, dimensions.
- **LogoRefuse** : le refus `logo-invalide` du serveur, avec sa raison.
- **ParametragePort** : lit le paramétrage, fixe la durée max d'une activité, lit l'image du logo, dépose et retire le logo.

## Responsabilités et invariants

- La page est réservée au gestionnaire : route protégée par `reservedToGestionnaire`, entrée de menu `reserveeAuGestionnaire` (ADR 0052).
- Une saisie hors de 1 à 24, vide ou non entière n'est jamais envoyée : le formulaire la refuse avec son message. Le serveur n'a donc aucun refus métier à traduire ; un refus 400 reste une panne technique.
- Le serveur accepte une durée à la minute. Ce front n'écrit que des heures entières ; une durée lue qui n'en est pas une est une panne technique de lecture, signalée une fois, jamais arrondie en silence.
- Un logo choisi est envoyé sans autre clic, et seulement s'il respecte les trois règles : un fichier refusé par `FichierDeLogo` n'est jamais envoyé. Le retrait se confirme dans la carte, sans boîte de dialogue.
- Sans logo, la page montre `MarqueGlm`, le logo GLM du design system de la gestion.
- Chaque lecture repart du serveur (ADR 0048) ; l'image, elle, vient du cache du navigateur tant que sa version ne change pas.

## Relations de contexte

- `glm-back`, contexte `parametrage` : `GET /api/parametrage`, `PUT /api/parametrage/duree-max-d-activite`, `PUT` et `DELETE /api/parametrage/logo`, `GET /api/parametrage/logo/{version}`.
- Ce contexte ne dépend d'aucun autre contexte de `gestion`, ni de `pupitre`.
