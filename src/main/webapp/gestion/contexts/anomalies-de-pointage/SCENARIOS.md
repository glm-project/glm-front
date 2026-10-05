# Garanties de résolution

Le backend Atelier fournit le dossier, l'aperçu et le reçu canonique. Le front utilise uniquement
`HttpAnomalies` et ne calcule ni interprétation du journal ni conséquences d'un acte.

## Proposition et confirmation

L'aperçu porte l'adresse, la commande, la révision attendue, l'acte exact, l'empreinte des conséquences
et l'identité prospective d'événement pour une correction ou une régularisation. L'annulation n'en
crée aucun. La confirmation transmet ces champs explicites ; l'évaluation et les dossiers avant et
après servent uniquement à la consultation. Toute modification de saisie invalide l'aperçu.

L'obsolescence conserve la saisie et retire l'aperçu. Une réacquisition échouée ne rétablit pas la
confirmation. Après récupération du dossier courant, le gestionnaire demande un nouvel aperçu.

Une réponse d'écriture perdue bloque les nouvelles décisions. Vérifier le reçu ne rejoue aucun acte.
La reprise explicite transmet la proposition initiale immuable. Un reçu ne conclut l'écriture que si
la commande, l'adresse, la révision de départ, l'acte et l'événement créé correspondent exactement.
Une ancre annulée reste consultable et les continuations désignent les autres conflits explicitement.

## Frontières de vérification

- Les specs de domaine passent par `SaisieActe` et `ResolutionDeLAnomalie` ; elles vérifient les motifs,
  le choix explicite, la précision des instants et l'invalidation d'un aperçu.
- Les specs d'application passent par les ports publics et contrôlent les doubles envois, les réponses
  tardives, l'obsolescence et la vérification d'une issue inconnue.
- Les contrats HTTP contrôlent les requêtes REST, l'acquisition autoritaire, les refus et les reçus
  incohérents ; ils utilisent `HttpTestingController`.
- Les specs DOM et Cypress vérifient les faits reçus, les formulaires, la comparaison avant/après,
  les droits, la navigation et les reprises. Cypress utilise la composition HTTP réelle avec des
  réponses JSON typées interceptées, sans adapter de simulation ni stockage des aperçus.

La [documentation du contexte](AGENTS.md) décrit les responsabilités et les invariants.
