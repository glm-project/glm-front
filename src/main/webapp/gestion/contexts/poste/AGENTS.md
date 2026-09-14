# Poste de travail

Ce contexte appartient exclusivement à `gestion`. Il gère le référentiel des postes de travail de l'atelier, leur configuration métier, leur coût horaire et leur cycle de vie (création, modification, suppression).

## Langage

**Poste de travail** : machine, établi ou emplacement physique de l'atelier sur lequel s'exécute une tâche de fabrication et où des opérateurs peuvent être habilités.

**Libellé de poste** : désignation usuelle et unique du poste au sein de l'entreprise (ex. « Tour 1 », « Scie à ruban »), obligatoire et ne dépassant pas 100 caractères.

**Nature de travail** : métier ou type d'opération exercé sur ce poste (ex. « tournage », « soudage »), obligatoire et ne dépassant pas 50 caractères. Elle appartient au poste et qualifie le travail qui s'y effectue.

**Coût horaire** : taux horaire appliqué aux pointages réalisés sur ce poste, destiné au calcul du coût de revient. Facultatif, et strictement positif lorsqu'il est renseigné.

**Formulaire de poste** : modèle riche immutable encapsulant la saisie interactive d'un poste, la validation de ses invariants et l'affichage des refus du serveur.

## Modèle de domaine

- **PosteDeTravail** : agrégat racine représentant un poste déclaré, portant son identifiant immuable, son libellé, sa nature et son coût horaire éventuel.
- **LibellePoste** : Value Object garantissant un libellé textuel non vide et borné à 100 caractères.
- **NatureDeTravail** : Value Object garantissant un métier non vide et borné à 50 caractères.
- **CoutHoraire** : Value Object représentant une valeur monétaire horaire strictement positive.
- **FormulairePosteDeTravail** : modèle riche d'interaction pour la création et la modification, validant les entrées brutes et effaçant l'erreur de doublon dès que le libellé est modifié.
- **PostesPort** : port secondaire exposant la consultation paginée, la collecte des natures uniques de l'atelier, la création, la modification et la suppression protégée par un `Result<T, Refus>`.

## Responsabilités et invariants

- Le libellé du poste est unique dans l'entreprise. Un refus 409 serveur (`LibellePosteDejaUtilise`) est reporté sur le champ libellé sans fermer le formulaire.
- La nature du poste est obligatoire ; elle guide l'autocomplétion sur les métiers déjà existants dans l'atelier.
- Un poste ne peut pas être supprimé s'il a déjà servi à pointer ou si des opérateurs y sont encore habilités. Le refus 409 (`PosteNonSupprimable`) affiche un message explicatif clair à l'utilisateur.
- Les opérations d'écriture retournent un `Result<T, Refus>` : les refus métier attendus sont portés par l'état du résultat, tandis que les anomalies techniques imprévues rejettent la promesse.
- Ce contexte ne dépend d'aucun contexte de `pupitre` et ne partage aucun modèle métier avec lui.

## Relations de contexte

- `gestion/contexts/operateur` : consomme les postes de travail sous forme de `PosteHabilite` (id, libellé). L'habilitation d'un opérateur sur un poste interdit sa suppression en amont.
- `app/shared/result` : utilise le shared kernel commun `Result<T, E>` pour les retours d'écriture de `PostesPort`.
- `app/shared/pagination` : utilise `Page<T>` pour la consultation paginée des postes.

## Règles locales

Pour les formulaires et la validation des saisies, appliquer l'[ADR 0036](../../../../../../documentation/adr/0036-rich-domain-models-for-form-interactions.md) : la saisie et ses invariants sont portés par un modèle de domaine riche (`FormulairePosteDeTravail`), sans `ReactiveFormsModule`.
