# Résolution des conflits

Ce contexte de Gestion possède la décision explicite du gestionnaire et sa saisie. Le calcul des
activités, des durées et des coûts reste au backend Atelier, selon
l'[ADR 0047](../../../../../../documentation/adr/0047-count-only-finished-activities.md).

## Langage et invariants

- **Dossier** : projection d'une séquence en conflit, adressée par suivi et pointage d'ancrage ; une
  adresse annulée, remplacée ou résolue reçoit un résultat explicite, jamais une autre séquence.
- **Acte** : correction, annulation ou régularisation humaine. Aucun acte n'est choisi par défaut.
  Correction et annulation demandent un motif non vide d'au plus 255 caractères ; la régularisation
  ne porte aucun motif.
- **Aperçu** : conséquences fournies par le port sans écriture. Toute modification de la proposition
  l'invalide. La confirmation porte sur l'acte exact et la version commune à tout le suivi.
- **Journal** : faits d'origine, annulations et remplacements conservés. Une contradiction restante
  est un résultat accepté, distinct d'un refus métier ou d'une limitation de simulation.
- **Continuation** : lien explicite vers un pointage actif d'une séquence restante après correction
  de l'ancrage. Le résultat reste consultable à l'ancienne adresse.

## Responsabilités

Le domaine possède les identités, la saisie et la confirmation ; l'application protège les appels
asynchrones et les doubles soumissions. Le primaire rend les faits et leur cible, conserve les filtres
dans l'URL et utilise les surfaces de Gestion. Trois ports séparent lecture, aperçu et application.
La composition de Gestion conserve un seul simulateur pendant les navigations.

L'InMemory rejoue les [trajectoires bornées](SCENARIOS.md), sans moteur général d'interprétation ni
stockage durable. La démonstration permet de réinitialiser et de déclencher panne ou concurrence.
Une commande hors trajectoire donne une limitation explicite. Aucun identifiant réel provenant
d'un autre contexte n'est relié aux fixtures. Les droits d'application restent `GESTIONNAIRE`.

Les tests passent par la saisie et la résolution publiques, les contrats des ports, le DOM Cypress
et les routes réelles. Leur liste et les limites du futur HTTP sont dans les trajectoires.
