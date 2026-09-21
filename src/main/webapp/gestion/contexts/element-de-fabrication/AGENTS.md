# Élément de fabrication

Ce contexte appartient exclusivement à `gestion`. Il gère le référentiel des éléments de fabrication —
les moules et les OF — que le dirigeant ou son assistante créent et tiennent à jour, bien avant qu'un
élément soit mis à l'atelier.

## Langage

**Élément de fabrication** : mot de repli, employé uniquement quand on ne présume pas du type — page de
détail, état vide, message d'erreur venu du back. Il ne titre jamais un écran.

**Moule** (`PRODUIT`) et **OF** (`ORDRE_DE_FABRICATION`) : les deux valeurs du type, distinguées
visuellement et traitées de façon identique. Le type est une **valeur portée par l'élément**, pas une
hiérarchie ni deux référentiels.

**Référence** : le numéro que l'entreprise donne elle-même (« 1015 »). Facultative, bornée à 100
caractères, et unique dans l'entreprise lorsqu'elle est renseignée. C'est elle qui domine l'affichage.

**Nom** : le numéro produit par le domaine du back à la création (`PRD-2026-000001`), par numérotation
propre au type et à l'année. **L'API ne le reçoit jamais** : aucun formulaire ne le propose. Seul
identifiant stable et jamais nul, il reste visible en second rang et sert de repli à la désignation.

**Libellé** : le texte libre d'une ligne qui rend reconnaissable un élément sans référence. Il porte le
champ `description` de l'API ; le mot « description » n'apparaît jamais à l'écran.

## Modèle de domaine

- **ElementDeFabrication** : agrégat racine portant son identifiant, son type, son nom, sa référence
  éventuelle et son libellé éventuel. `numero()` répond à la question « comment cet élément se désigne » :
  la référence si elle existe, le nom sinon.
- **ElementDeFabricationId** : Value Object de l'identifiant immuable.
- **TypeDElementDeFabrication** : union des deux valeurs du type, structurellement compatible avec l'énum
  de l'API.
- **NomDElement** : Value Object du numéro produit par le domaine, non vide.
- **ReferenceDElement** : Value Object du numéro de l'entreprise, non vide et borné à 100 caractères.
- **LibelleDElement** : Value Object du libellé. Il porte deux bornes : celle du contrat back (1000
  caractères) à la construction, et celle de l'écran (100 caractères) sur la saisie, le libellé tenant sur
  une ligne.
- **CommandeCreationElement** : commande de création, portant le type et les attributs facultatifs validés.
- **CommandeModificationElement** : commande de modification, portant l'identifiant et les attributs
  facultatifs validés. Le type n'y figure pas : il ne se change pas.
- **RequeteElements** : objet de requête paginée (`page`, `taille`).
- **FormulaireElementDeFabrication** : modèle riche d'interaction pour la création et la modification, qui
  valide les saisies, produit la commande adéquate et efface le refus de doublon dès que la référence est
  modifiée.
- **ElementsDeFabricationPort** : port secondaire exposant la consultation paginée, la création et la
  modification, les écritures rendant un `Result<T, Refus>`.
- **Refus de commande** : `ReferenceDejaUtilisee` (unicité de référence en création et en modification) et
  `ElementDeFabricationIntrouvable` (élément disparu en modification).

## Responsabilités et invariants

- **Un élément se réduit légitimement à son seul numéro** : référence et libellé sont l'un comme l'autre
  facultatifs, et le formulaire vide est valide.
- La référence est unique dans l'entreprise quand elle est renseignée. Le refus 409
  (`urn:glm:erreur:element-de-fabrication:reference-deja-utilisee`) se reporte sur le champ référence sans
  fermer le formulaire.
- Le nom n'est jamais saisi ni envoyé : le domaine du back le produit à la création.
- Le type est obligatoire à la création et immuable ensuite. Deux boutons le portent — « Nouveau moule » et
  « Nouvel OF » — et ouvrent le même formulaire, type pré-rempli et non affiché.
- **L'écran ne propose pas de supprimer.** Le `DELETE` existe à l'API, mais le client parle de clôture, et
  supprimer un élément portant des temps détruirait des heures de paie. La sortie d'un élément est la
  clôture de son suivi d'atelier, qui appartient à un autre contexte.
- Ce contexte ne dépend d'aucun contexte de `pupitre` et ne partage aucun modèle métier avec lui.

## Relations de contexte

- `app/shared/result` : `Result<T, E>` pour les retours d'écriture.
- `app/shared/pagination` : `Page<T>` pour la consultation paginée.
- L'atelier engage un élément existant ; ce contexte ignore les suivis, les états et les temps.
- `cout-de-revient` chiffre ce que la fabrication d'un élément a coûté. **Ce contexte ne l'importe pas** :
  le lien est un `routerLink` vers `/couts-de-revient/<id>`, posé sur chaque ligne sans condition. Le
  référentiel ne porte aucun statut d'atelier et ne peut donc pas savoir si l'élément a déjà été engagé ;
  c'est l'écran de coût de revient qui dit qu'aucun temps n'a été pointé, et cette réponse-là vaut mieux
  qu'un lien absent sans explication.

## Règles locales

- **Le référentiel ne porte aucune période.** `GET /api/elements-de-fabrication` exige pourtant `debut` et
  `fin`, qui filtrent la date de création. L'adapter secondaire absorbe ce piège en demandant toute
  l'amplitude ; aucun filtre de période n'atteint l'écran. C'est le suivi d'atelier qui porte des dates,
  pas l'élément.
- Tous les mots affichés vivent dans `LibellesElementsDeFabrication`, indexés par les valeurs du type.
  Aucun mot en dur dans un template : le jour où une deuxième entreprise cliente entre, un seul fichier
  change.
- Pour les formulaires et la validation des saisies, appliquer l'[ADR 0036](../../../../../../documentation/adr/0036-rich-domain-models-for-form-interactions.md) :
  la saisie et ses invariants sont portés par un modèle de domaine riche, sans `ReactiveFormsModule`.
