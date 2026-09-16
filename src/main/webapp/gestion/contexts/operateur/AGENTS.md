# Opérateur

Ce contexte appartient exclusivement à `gestion`. Il gère le référentiel des personnes qui pointent : leur identité, leur matricule, leur taux horaire et les postes sur lesquels elles sont habilitées.

## Langage

**Opérateur** : personne de l'atelier qui pointe du temps. Elle porte une identité, éventuellement un matricule et un taux horaire, et un ensemble d'habilitations.

**Identité** : le couple nom et prénom. C'est elle qui distingue deux opérateurs, chacun obligatoire et ne dépassant pas 100 caractères.

**Matricule** : identifiant que l'entreprise donne elle-même à ses collaborateurs. Facultatif, car toutes les entreprises n'en attribuent pas ; unique dès qu'il est renseigné et limité à 50 caractères. Ce n'est ni un secret ni un moyen de connexion.

**Taux horaire** : taux appliqué au temps pointé par l'opérateur, destiné au coût de revient. Facultatif, et strictement positif lorsqu'il est renseigné.

**Poste habilitable** : poste de travail de l'atelier sur lequel un opérateur peut être habilité. Le même objet décrit une entrée du catalogue proposé à la saisie et une habilitation déjà acquise.

**Habilitation** : le fait qu'un opérateur soit déclaré apte à travailler sur un poste. La liste des habilitations remplace la précédente à chaque révision.

**Métier** : nature de travail exercée par l'opérateur. Un métier ne se saisit jamais : il est déduit des natures de ses postes habilités et rendu par le serveur.

**Formulaire d'opérateur** : modèle riche immutable encapsulant la saisie interactive d'un opérateur, la validation de ses invariants et l'affichage des refus du serveur.

## Modèle de domaine

- **Operateur** : agrégat racine représentant un opérateur déclaré, portant son identifiant immuable, son identité, son matricule et son taux horaire éventuels, ses postes habilités et ses métiers déduits.
- **OperateurId** : Value Object représentant l'identifiant unique et immuable d'un opérateur.
- **NomOperateur**, **PrenomOperateur** : Value Objects garantissant un texte non vide et borné à 100 caractères.
- **Matricule** : Value Object garantissant un texte non vide et borné à 50 caractères. Son caractère facultatif est porté par l'absence de valeur, pas par le Value Object.
- **TauxHoraire** : Value Object représentant une valeur monétaire horaire strictement positive.
- **PosteHabilitableId** : Value Object représentant l'identifiant d'un poste de travail, déclaré par ce contexte.
- **PosteHabilitable** : Value Object décrivant un poste par son identifiant, son libellé et sa nature, avec correspondance à une recherche et comparaison par libellé.
- **CommandeCreationOperateur** : commande encapsulant les attributs validés pour la déclaration d'un opérateur (`nom`, `prenom`, `matricule`, `tauxHoraire`, `postes`).
- **CommandeModificationOperateur** : commande encapsulant l'identifiant et les attributs validés pour la révision d'un opérateur existant.
- **RequeteOperateurs** : objet de requête paginée portant l'indice de page et le nombre d'éléments par page (`page`, `taille`).
- **FormulaireOperateur** : modèle riche d'interaction pour la déclaration et la révision, validant les entrées brutes, produisant la commande adéquate et effaçant chaque refus du serveur dès que le champ concerné est modifié.
- **OperateursPort** : port secondaire exposant la consultation paginée via `RequeteOperateurs`, la lecture du catalogue des postes habilitables, la création, la modification et la suppression protégées par un `Result<T, Refus>`.
- **Refus de commande** : `IdentiteDejaUtilisee` et `MatriculeDejaUtilise` (unicité), `OperateurIntrouvable` (opérateur inexistant), `PosteHabilitableIntrouvable` (poste référencé inexistant) et `OperateurAyantPointe` (temps déjà pointé au nom de l'opérateur).

## Responsabilités et invariants

- L'identité, couple nom et prénom, est unique dans l'entreprise. Un refus 409 serveur (`IdentiteDejaUtilisee`) est reporté sur le champ nom sans fermer le formulaire, et disparaît dès que le nom ou le prénom change.
- Le matricule est facultatif et unique dès qu'il est renseigné. Un matricule laissé vide est retiré de la fiche. Le refus 409 (`MatriculeDejaUtilise`) est reporté sur le champ matricule.
- Le taux horaire est facultatif et strictement positif. Laissé vide, il est retiré plutôt que ramené à zéro.
- Les métiers ne sont jamais saisis. Le serveur les déduit des natures des postes habilités et les rend triés ; ce contexte les lit et les affiche sans les recalculer.
- La liste de postes fournie à la révision remplace la précédente. Rien n'est copié du poste : seul son identifiant est retenu, libellé et nature sont relus à chaque lecture, si bien qu'un poste renommé s'affiche renommé partout.
- Un opérateur au nom duquel du temps a été pointé ne peut pas être supprimé : le journal d'atelier ne retient que son identifiant, et sa disparition laisserait des heures sans personne. Le refus 409 (`OperateurAyantPointe`) affiche un message explicatif.
- Les opérations d'écriture retournent un `Result<T, Refus>` : les refus métier attendus sont portés par l'état du résultat, tandis que les anomalies techniques imprévues rejettent la promesse.
- Ce contexte ne dépend d'aucun contexte de `pupitre` et ne partage aucun modèle métier avec lui.

## Relations de contexte

- Ce contexte n'importe rien du contexte `poste` : il déclare son propre `PosteHabilitable` et lit le référentiel des postes depuis son propre adaptateur secondaire, conformément à l'[ADR 0033](../../../../../../documentation/adr/0033-compose-view-data-in-secondary-adapters.md).
- Le serveur possède les pointages ; un pointage existant interdit la suppression de l'opérateur.
- `app/shared/result` : utilise le shared kernel commun `Result<T, E>` pour les retours d'écriture de `OperateursPort`.
- `app/shared/pagination` : utilise `Page<T>` pour la consultation paginée des opérateurs et l'acquisition complète du catalogue des postes.

## Règles locales

Pour les formulaires et la validation des saisies, appliquer l'[ADR 0036](../../../../../../documentation/adr/0036-rich-domain-models-for-form-interactions.md) : la saisie et ses invariants sont portés par un modèle de domaine riche (`FormulaireOperateur`), sans `ReactiveFormsModule`.
