# Élément de fabrication

Ce contexte appartient exclusivement à `gestion`. Il gère le référentiel des éléments de fabrication —
les produits, rangés dans les catégories que l'entreprise déclare — que le dirigeant ou son assistante
créent et tiennent à jour, bien avant qu'un élément soit mis à l'atelier. L'écran s'appelle « Produits »
(`/produits`).

## Langage

**Élément de fabrication** : mot de repli, employé uniquement quand on ne présume pas de la catégorie —
page de détail, état vide, message d'erreur venu du back. Il ne titre jamais un écran.

**Catégorie de produit** ([ADR 0053](../../../../../../documentation/adr/0053-replace-the-element-type-with-company-categories.md)) : famille dans laquelle l'entreprise range ce qu'elle fabrique (`MOULE`, `OF`…).
Chaque entreprise déclare les siennes ; le **code est son propre libellé** et s'affiche tel quel. La
catégorie est une **valeur portée par l'élément**, pas une hiérarchie ni plusieurs référentiels.

**Référence** : le numéro que l'entreprise donne elle-même (« 1015 »). Facultative, bornée à 100
caractères, et unique dans l'entreprise lorsqu'elle est renseignée. C'est elle qui domine l'affichage.

**Nom** : le numéro produit par le domaine du back à la création (`PRD-2026-000001`), par numérotation
propre à la catégorie et à l'année. **L'API ne le reçoit jamais** : aucun formulaire ne le propose. Seul
identifiant stable et jamais nul, il reste visible en second rang et sert de repli à la désignation.

**Libellé** : le texte libre d'une ligne qui rend reconnaissable un élément sans référence. Il porte le
champ `description` de l'API ; le mot « description » n'apparaît jamais à l'écran.

## Modèle de domaine

- **ElementDeFabrication** : agrégat racine portant son identifiant, sa catégorie, son nom, sa référence
  éventuelle et son libellé éventuel. `numero()` répond à la question « comment cet élément se désigne » :
  la référence si elle existe, le nom sinon.
- **ElementDeFabricationId** : Value Object de l'identifiant immuable.
- **CategorieDeProduit** : Value Object du code de la catégorie, non vide. `estLaMeme` compare deux codes.
- **NomDElement** : Value Object du numéro produit par le domaine, non vide.
- **ReferenceDElement** : Value Object du numéro de l'entreprise, non vide et borné à 100 caractères.
- **LibelleDElement** : Value Object du libellé. Il porte deux bornes : celle du contrat back (1000
  caractères) à la construction, et celle de l'écran (100 caractères) sur la saisie, le libellé tenant sur
  une ligne.
- **CommandeCreationElement** : commande de création, portant la catégorie et les attributs facultatifs
  validés.
- **CommandeModificationElement** : commande de modification, portant l'identifiant et les attributs
  facultatifs validés. La catégorie n'y figure pas : elle ne se change pas.
- **RequeteElements** : objet de requête paginée (`page`, `taille`).
- **ReferentielDesProduits** : acquisition complète de l'écran — les catégories déclarées, dans l'ordre
  choisi par l'entreprise, et tous les éléments. `estSansCategorie()` dit qu'aucun produit ne peut encore
  être créé.
- **FormulaireElementDeFabrication** : modèle riche d'interaction pour la création et la modification, qui
  valide les saisies, produit la commande adéquate et efface le refus de doublon dès que la référence est
  modifiée.
- **ElementsDeFabricationPort** : port secondaire exposant la consultation paginée, la création et la
  modification, les écritures rendant un `Result<T, Refus>`.
- **FormulaireCategorieDeProduit** : modèle de la déclaration d'une catégorie. Il met la saisie en
  majuscules, vérifie le motif (`^[A-Z]{1,10}$`, porté par `CategorieDeProduit.erreur`) et garde le refus
  `CategorieDejaExistante` sur le champ tant que le même code est saisi.
- **CategoriesDeProduitPort** : port secondaire de la gestion des catégories (`/api/categories-de-produit`) :
  lecture dans l'ordre de l'entreprise, déclaration, réordonnancement et suppression.
- **OrdreDesCategories** : l'ordre des catégories et ses déplacements d'une place (`apresMontee`,
  `apresDescente`). Chaque déplacement envoie l'ordre complet ; s'il ne nomme plus toutes les catégories,
  le refus `OrdreIncomplet` (409 `ordre-incomplet`) s'affiche et l'overlay relit la liste.
- **CategorieGeree** : une catégorie telle que l'overlay la gère, avec `supprimable` (aucun produit n'y est rangé,
  champ `utilisee` de l'API). La corbeille n'apparaît que sur une catégorie supprimable ; ailleurs, sa place reste
  vide pour aligner les lignes.
- **Refus de suppression d'une catégorie** : `CategorieUtilisee` (409 `categorie-utilisee`, un produit est arrivé
  entre la lecture et la confirmation) et `CategorieIntrouvable` (404). La suppression se confirme dans la ligne
  (« Supprimer CODE ? »), sans seconde modale ; un refus s'affiche sous la ligne et la liste est relue.
- **Refus de commande** : `ReferenceDejaUtilisee` (unicité de référence en création et en modification),
  `CategorieInconnue` (catégorie supprimée entre la lecture et la création, 409
  `urn:glm:erreur:element-de-fabrication:categorie-inconnue`) et `ElementDeFabricationIntrouvable` (élément
  disparu en modification). Les deux derniers s'affichent sur la ligne d'enregistrement, pas sur un champ.

## Responsabilités et invariants

- **Un élément se réduit légitimement à son seul numéro** : référence et libellé sont l'un comme l'autre
  facultatifs, et le formulaire vide est valide.
- La référence est unique dans l'entreprise quand elle est renseignée. Le refus 409
  (`urn:glm:erreur:element-de-fabrication:reference-deja-utilisee`) se reporte sur le champ référence sans
  fermer le formulaire.
- Le nom n'est jamais saisi ni envoyé : le domaine du back le produit à la création.
- La catégorie est obligatoire à la création et immuable ensuite. Un bouton par catégorie déclarée la porte
  et ouvre le même formulaire, catégorie pré-remplie et non affichée. Boutons et filtres suivent l'ordre des
  catégories ; sans catégorie, l'écran invite à en déclarer une et ne propose aucune création.
- **L'écran ne propose pas de supprimer.** Le `DELETE` existe à l'API, mais le client parle de clôture, et
  supprimer un élément portant des temps détruirait des heures de paie. La sortie d'un élément est la
  clôture de son suivi d'atelier, qui appartient à un autre contexte.
- **Les catégories se gèrent dans un overlay de la page Produits**, ouvert par « Catégories » ou depuis
  l'état sans catégorie. Une catégorie se déclare et ne se renomme jamais : son code préfixe le nom des
  produits, et l'overlay le rappelle. À sa fermeture, la page relit son référentiel.
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
- Tous les mots affichés vivent dans `LibellesElementsDeFabrication`. Aucun mot en dur dans un template : le
  jour où une deuxième entreprise cliente entre, un seul fichier change. La catégorie fait exception : son code
  s'affiche tel quel.
- Pour les formulaires et la validation des saisies, appliquer l'[ADR 0036](../../../../../../documentation/adr/0036-rich-domain-models-for-form-interactions.md) :
  la saisie et ses invariants sont portés par un modèle de domaine riche, sans `ReactiveFormsModule`.

## Recherche du référentiel

Le port fournit `referentiel()` comme acquisition complète pour la recherche de l'écran : les catégories
de `GET /api/categories-de-produit` et les éléments, lus en parallèle. Le secondaire parcourt les pages de
chaque collection avec la taille commune et refuse les échos de page, tailles, totaux, troncatures et
doublons incohérents. Il signale une panne une seule fois et ne présente jamais une collection partielle
comme résultat complet. La page cherche sans casse ni accents, puis pagine localement les résultats.
Une nouvelle recherche ou un changement de catégorie repart de la première page. Actualiser et les écritures
réussies relisent toute la collection ; une réponse obsolète ne remplace pas une lecture récente.
