# Poste de travail

Ce contexte appartient exclusivement à `gestion`. Il gère le référentiel des postes de travail de l'atelier, leur configuration métier, leur coût horaire et leur cycle de vie (création, modification, suppression).

## Langage

**Poste de travail** : machine, établi ou emplacement physique de l'atelier sur lequel s'exécute une tâche de fabrication et où des opérateurs peuvent être habilités.

**Libellé de poste** : désignation usuelle et unique du poste au sein de l'entreprise (ex. « Tour 1 », « Scie à ruban »), obligatoire et ne dépassant pas 100 caractères.

**Nature de travail** : métier ou type d'opération exercé sur ce poste (ex. « tournage », « soudage »), obligatoire et ne dépassant pas 50 caractères. Elle appartient au poste et qualifie le travail qui s'y effectue.

**Coût horaire** : taux horaire appliqué aux pointages réalisés sur ce poste, destiné au calcul du coût de revient. Facultatif, et strictement positif lorsqu'il est renseigné.

**Formulaire de poste** : modèle riche immutable encapsulant la saisie interactive d'un poste, la validation de ses invariants et l'affichage des refus du serveur.

## Modèle de domaine

- **PosteDeTravail** : agrégat racine représentant un poste déclaré, portant son identifiant immuable, son libellé, sa nature (libellé courant et `natureId`) et son coût horaire éventuel.
- **PosteDeTravailId** : Value Object représentant l'identifiant unique et immuable d'un poste.
- **LibellePoste** : Value Object garantissant un libellé textuel non vide et borné à 100 caractères.
- **NatureDeTravail** : Value Object garantissant un métier non vide et borné à 50 caractères, avec comparaison et correspondance insensible à la casse.
- **CoutHoraire** : Value Object représentant une valeur monétaire horaire strictement positive.
- **CommandeCreationPoste** : commande encapsulant les attributs validés pour la création d'un nouveau poste (`libelle`, `nature`, `natureId`, `coutHoraire`) ; seul `natureId` part au serveur.
- **CommandeModificationPoste** : commande encapsulant l'identifiant et les attributs validés pour la modification d'un poste existant (`id`, `libelle`, `nature`, `natureId`, `coutHoraire`).
- **RequetePostes** : objet de requête paginée portant l'indice de page et le nombre d'éléments par page (`page`, `taille`).
- **FormulairePosteDeTravail** : modèle riche d'interaction pour la création et la modification, validant les entrées brutes, produisant la commande adéquate et effaçant l'erreur de doublon dès que le libellé est modifié. La nature est une **liste fermée** : le texte saisi ne fait que filtrer, seule une `NatureChoisie` du référentiel (`choisirNature`) rend le formulaire valide, et modifier le texte la désélectionne.
- **PostesPort** : port secondaire exposant la consultation paginée via `RequetePostes`, la création (`CommandeCreationPoste`), la modification (`CommandeModificationPoste`) et la suppression protégée par un `Result<T, Refus>`.
- **NatureDeTravailId** : Value Object de l'identifiant d'une nature du référentiel des natures de travail.
- **NatureGeree** : une nature telle que la page la présente : identifiant, libellé, nombre de postes qui la portent
  (champ `postes` de l'API) et usage (`utilisee`). `supprimable` tant que rien ne s'en sert : une nature sans poste
  reste utilisée si du temps a été pointé sous elle, d'où une corbeille pilotée par `utilisee` et non par `postes`. `porte(poste)` reconnaît ses postes à leur libellé de nature, unique dans l'entreprise.
- **NaturesDeTravailPort** : port secondaire du référentiel des natures (`/api/natures-de-travail`) : lecture
  entière, enregistrement, renommage et suppression. Refus : `NatureDejaExistante` (409 `nature-deja-existante`),
  `NatureIntrouvable` (404 `nature-introuvable`), et à la suppression `NatureUtilisee` (409 `nature-utilisee`, un
  poste la porte) ou `NaturePointee` (409 `nature-pointee`, définitif).
- **FormulaireNature** : modèle de la saisie d'une nature. `decider` refuse un nom vide, trop long ou déjà porté
  par une autre nature (casse, accents et espaces ignorés), signale une nature **ressemblante** tant que la
  ressemblance n'est pas acceptée, et rend sinon le libellé prêt à enregistrer.
- **RessemblanceDeNature** : `memeNom` et `ressemble`. Deux noms se ressemblent quand, une fois en minuscules et
  sans accents, ils partagent leurs 4 premières lettres ou ne diffèrent que de 2 modifications au plus. C'est un
  avertissement, jamais un blocage.
- **Refus de commande** : `LibellePosteDejaUtilise` (unicité de libellé en création/modification), `NatureInconnue` (422 `nature-inconnue`, la nature choisie a été supprimée entre-temps : le champ Nature le dit, le formulaire relit les natures et attend qu'on en choisisse une autre), `PosteIntrouvable` (poste inexistant en modification/suppression), et `PosteNonSupprimable` (pointages ou habilitations associées en suppression).

## Responsabilités et invariants

- Le libellé du poste est unique dans l'entreprise. Un refus 409 serveur (`LibellePosteDejaUtilise`) est reporté sur le champ libellé sans fermer le formulaire.
- La nature du poste est obligatoire et se choisit dans le référentiel des natures (`NaturesDeTravailPort`) : aucune nature ne se crée depuis le formulaire du poste.
- Un poste ne peut pas être supprimé s'il a déjà servi à pointer ou si des opérateurs y sont encore habilités. Le refus 409 (`PosteNonSupprimable`) affiche un message explicatif clair à l'utilisateur.
- Les opérations d'écriture retournent un `Result<T, Refus>` : les refus métier attendus sont portés par l'état du résultat, tandis que les anomalies techniques imprévues rejettent la promesse.
- Ce contexte ne dépend d'aucun contexte de `pupitre` et ne partage aucun modèle métier avec lui.

## Relations de contexte

- Le serveur possède les habilitations des opérateurs ; une habilitation existante interdit la suppression du poste.
- `app/shared/result` : utilise le shared kernel commun `Result<T, E>` pour les retours d'écriture de `PostesPort`.
- `app/shared/pagination` : utilise `Page<T>` pour la consultation paginée des postes.

## Règles locales

Pour les formulaires et la validation des saisies, appliquer l'[ADR 0036](../../../../../../documentation/adr/0036-rich-domain-models-for-form-interactions.md) : la saisie et ses invariants sont portés par un modèle de domaine riche (`FormulairePosteDeTravail`), sans `ReactiveFormsModule`.

## Natures à gauche, postes à droite

La page Postes de travail présente les natures dans une colonne qui sert de filtre (disposition retenue pour
glm-project/glm-front#267) : « Toutes », puis chaque nature avec son nombre de postes. La nature choisie est
gardée dans l'adresse (`?nature=<id>`) ; une adresse qui nomme une nature disparue montre tous les postes. Le
tableau d'une nature choisie n'affiche plus la colonne Nature. « + Nouvelle nature », en bas de la colonne,
ouvre la saisie sur place : « Enregistrer » (jamais « Déclarer »), puis « Enregistrer quand même » après une
alerte de ressemblance ; Échap ou Annuler referme sans écrire. Une nature enregistrée relit la page.
« + Poste de <nature> », dans l'en-tête du tableau d'une nature choisie, ouvre le formulaire du poste avec
cette nature déjà saisie. « Renommer la nature », à côté, part du nom actuel et rappelle que le
nouveau nom s'affichera partout, rapports déjà produits compris ; la nature peut reprendre son propre nom avec
d'autres majuscules ou accents. Une nature disparue entre-temps est signalée et la page relue. La corbeille, à
côté, n'apparaît que sur une nature supprimable ; la suppression se confirme dans l'en-tête, puis la page revient
à « Toutes ». Un refus s'affiche sous l'en-tête et la page est relue. Une panne de lecture des natures vaut une panne
de lecture de la page.

## Recherche du référentiel

Le port fournit `referentiel()` comme acquisition complète pour la recherche de l'écran. Le secondaire
parcourt les pages avec la taille commune et refuse les échos de page, tailles, totaux, troncatures et
doublons incohérents. Il signale une panne une seule fois et ne présente jamais une collection partielle
comme résultat complet. La page cherche sans casse ni accents, puis pagine localement les résultats.
Une nouvelle recherche ou un changement de type repart de la première page. Actualiser et les écritures
réussies relisent toute la collection ; une réponse obsolète ne remplace pas une lecture récente.
