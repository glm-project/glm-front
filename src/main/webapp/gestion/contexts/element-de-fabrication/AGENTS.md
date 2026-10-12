# Élément de fabrication

Ce contexte appartient exclusivement à `gestion`. Il gère le référentiel des éléments de fabrication —
les produits, rangés dans les catégories que l'entreprise déclare — que le dirigeant ou son assistante
créent et tiennent à jour, et les montre là où ils en sont de leur cycle : en préparation, en atelier ou
clôturés. L'écran s'appelle « Produits » (`/produits`).

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

**Cycle** : où en est un produit, lu sur son suivi d'atelier par le back. `EN_PREPARATION` (aucun suivi),
`EN_ATELIER` (suivi ouvert) ou `CLOTURE`. Un produit n'est que dans un cycle à la fois.

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
- **CycleDuProduit** : union des trois cycles, `CYCLES_DU_PRODUIT` dans l'ordre de la vie d'un produit et
  `CYCLE_PAR_DEFAUT` (`EN_ATELIER`).
- **EtatDAtelier** : `EN_ATTENTE`, `EN_COURS` ou `INTERROMPU`, déduit par le back pour un produit en atelier.
- **ProduitDansSonCycle** : un élément lu dans son cycle, avec sa date de création et son passage à l'atelier
  (`PassageALAtelier`) : rien en préparation, l'état et la mise à l'atelier en atelier, la mise à l'atelier,
  la clôture et son auteur une fois clôturé.
- **RequeteProduits** : objet de requête d'un onglet — cycle, catégorie éventuelle, recherche, page — lu
  vingt par vingt. `rechercheSaisie()` n'envoie pas une recherche blanche.
- **FormulaireElementDeFabrication** : modèle riche d'interaction pour la création et la modification, qui
  valide les saisies, exige une catégorie choisie parmi celles proposées à la création, produit la commande
  adéquate, efface le refus de doublon dès que la référence est modifiée et le refus `CategorieInconnue` dès
  qu'une autre catégorie est choisie.
- **ElementsDeFabricationPort** : port secondaire exposant la lecture d'un cycle, page par page, la création
  et la modification, les écritures rendant un `Result<T, Refus>`.
- **ActesDAtelierPort** : port secondaire des actes d'atelier faits depuis la page. `mettreALAtelier` rend
  `ProduitDejaALAtelier` (le back refuse `element-deja-engage`, y compris pour un produit clôturé : un produit ne
  passe qu'une fois à l'atelier) ou `ElementDeFabricationIntrouvable`.
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
- La catégorie est obligatoire à la création et immuable ensuite. Un seul bouton « Nouveau produit » ouvre
  le formulaire, qui la fait choisir parmi les catégories déclarées : elle est préremplie par le filtre
  actif et reste à choisir sous « Tous », sauf quand l'entreprise n'en a qu'une. La modification ne l'affiche pas. Filtres et choix suivent l'ordre
  des catégories ; sans catégorie, l'écran invite à en déclarer une et ne propose aucune création.
- Le formulaire n'annonce pas le nom qui sera donné : le compteur du back n'avance qu'à la création et
  aucune lecture ne le prédit.
- **Trois onglets exclusifs**, En préparation, En atelier — ouvert par défaut — et Clôturés, chacun avec ses
  colonnes et ses actions : « Mettre à l'atelier » en préparation, « Coût de revient » ensuite, « Modifier »
  partout. Une création bascule sur En préparation, où le produit arrive.
- **Un acte agit sur la ligne et laisse l'onglet en place** : pas de dialogue de sélection, la page relit
  l'onglet courant et ses compteurs. Le bouton de la ligne se désactive le temps de l'acte ; un refus ou une
  panne s'affiche au-dessus du tableau et s'efface au prochain acte.
- **L'écran ne propose pas de supprimer.** Le `DELETE` existe à l'API, mais le client parle de clôture, et
  supprimer un élément portant des temps détruirait des heures de paie. La sortie d'un élément est la
  clôture de son suivi d'atelier, qui appartient à un autre contexte.
- **Les catégories se gèrent dans un overlay de la page Produits**, ouvert par « Catégories » ou depuis
  l'état sans catégorie. Une catégorie se déclare et ne se renomme jamais : son code préfixe le nom des
  produits, et l'overlay le rappelle. La déclaration s'ouvre sur place, par « Nouvelle catégorie » en bas de la
  liste : Entrée déclare, Échap ou Annuler referme le champ sans fermer l'overlay. À sa fermeture, la page relit
  ses catégories et l'onglet courant.
- Ce contexte ne dépend d'aucun contexte de `pupitre` et ne partage aucun modèle métier avec lui.

## Relations de contexte

- `app/shared/result` : `Result<T, E>` pour les retours d'écriture.
- `app/shared/pagination` : `Page<T>` pour la consultation paginée.
- L'atelier engage un élément existant. Ce contexte lit le cycle et l'état que le back en déduit, sans
  jamais les recalculer ; il ignore les temps. **Ses actes passent par l'atelier** : `ActesParLAtelier`
  (secondaire) appelle `TypeScriptActesDAtelier`, l'adaptateur primaire que l'atelier expose, et traduit ses codes
  de refus dans les refus de ce contexte. Aucun modèle de l'atelier n'est importé.
- `cout-de-revient` chiffre ce que la fabrication d'un élément a coûté. **Ce contexte ne l'importe pas** :
  le lien est un `routerLink` vers `/couts-de-revient/<id>`, posé sur les produits en atelier et clôturés.
  Un produit en préparation n'a encore aucun temps : le lien n'y mènerait qu'à une page vide.

## Règles locales

- **Aucune période de création n'est envoyée.** `debut` et `fin` sont facultatifs depuis glm-back#150 :
  l'écran ne filtre pas sur la création.
- Tous les mots affichés vivent dans `LibellesElementsDeFabrication`. Aucun mot en dur dans un template : le
  jour où une deuxième entreprise cliente entre, un seul fichier change. La catégorie fait exception : son code
  s'affiche tel quel.
- Pour les formulaires et la validation des saisies, appliquer l'[ADR 0036](../../../../../../documentation/adr/0036-rich-domain-models-for-form-interactions.md) :
  la saisie et ses invariants sont portés par un modèle de domaine riche, sans `ReactiveFormsModule`.

## Lecture par onglet

Chaque onglet lit son cycle au serveur, vingt produits par page : le cycle, la catégorie choisie et la
recherche partent en paramètres, et le serveur trie chaque cycle par son dernier événement. Changer d'onglet,
de catégorie ou de recherche repart de la première page. Les boutons de page ne s'affichent qu'au-delà d'une
page, sauf sur Clôturés, liste qui ne fait que grandir et qui situe toujours ses produits (« 1–20 sur N »).
L'adresse porte la vue — `etat` (`en-preparation`, `en-atelier`, `clotures`), `categorie`, `recherche` et
`page` comptée depuis 1 — et la page la suit : chaque choix navigue, et c'est la nouvelle adresse qui relit.
Sans paramètre, la page s'ouvre sur En atelier. Une adresse invalide retombe sur ces valeurs par défaut. La
recherche remplace l'entrée d'historique au lieu d'en ajouter une par lettre. Les catégories se lisent à
l'ouverture, à « Actualiser » et à la fermeture de l'overlay. Une réponse obsolète
ne remplace pas une lecture récente.
