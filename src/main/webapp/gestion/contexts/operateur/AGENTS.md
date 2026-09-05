# Opérateur

Ce contexte appartient exclusivement à `gestion`. Il consulte le référentiel des opérateurs et leurs habilitations aux postes.

## Langage

**Matricule** : code d'un opérateur dans le référentiel de l'entreprise. Il identifie une personne sans constituer un secret ni une preuve d'identité.

## Responsabilités et invariants

- La consultation expose les opérateurs et leurs postes habilités derrière un port du domaine.
- La pagination technique reste dans le shared kernel commun.
- Ce contexte ne dépend d'aucun contexte de `pupitre` et ne partage aucun modèle métier avec lui.

## Règles locales

Les échanges futurs avec un autre contexte de `gestion` passent par un port et un adaptateur TypeScript, sans import direct de son domaine.
